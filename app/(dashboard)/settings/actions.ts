"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth-helpers";
import { hashPassword } from "../../lib/auth";
import type { UserRole, UserStatus } from "@prisma/client";

export type UserInfo = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  forcePasswordChange: boolean;
  createdAt: string;
};

export async function getUsers(): Promise<UserInfo[]> {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: u.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Guards a privileged operation against a target user account.
 *
 * `requireAdmin()` admits MANAGER as well as SUPER_ADMIN, so without this a
 * MANAGER can act on SUPER_ADMIN accounts — reset their password, deactivate
 * them, or promote themselves. Only a SUPER_ADMIN may touch a SUPER_ADMIN.
 */
async function assertCanActOnUser(
  actingUser: { role: UserRole },
  targetId: string,
): Promise<{ id: string; role: UserRole }> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) {
    throw new Error("User not found");
  }
  if (target.role === "SUPER_ADMIN" && actingUser.role !== "SUPER_ADMIN") {
    throw new Error("Only Super Admins can modify Super Admin accounts");
  }
  return target;
}

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}): Promise<UserInfo> {
  try {
    const actingUser = await requireAdmin();

    if (actingUser.role === "MANAGER" && data.role === "SUPER_ADMIN") {
      throw new Error("Managers cannot create Super Admin accounts");
    }

    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      throw new Error("Name, email, and password are required");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        status: "ACTIVE",
        forcePasswordChange: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    });

    return {
      ...newUser,
      lastLoginAt: newUser.lastLoginAt ? newUser.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: newUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to create user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create user");
  }
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    role: UserRole;
  }
): Promise<UserInfo> {
  try {
    const actingUser = await requireAdmin();

    // Closes the bypass around createUser's guard: without this a MANAGER could
    // create a plain MANAGER and immediately promote it to SUPER_ADMIN.
    await assertCanActOnUser(actingUser, id);
    if (actingUser.role === "MANAGER" && data.role === "SUPER_ADMIN") {
      throw new Error("Managers cannot grant the Super Admin role");
    }

    if (!data.name.trim() || !data.email.trim()) {
      throw new Error("Name and email are required");
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.id !== id) {
      throw new Error("Email is already in use by another user");
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      lastLoginAt: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to update user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update user");
  }
}

export async function deactivateUser(id: string): Promise<UserInfo> {
  try {
    const actingUser = await requireAdmin();
    const target = await assertCanActOnUser(actingUser, id);

    // Never let the last active SUPER_ADMIN be deactivated — that would lock
    // everyone out of the operations only a SUPER_ADMIN can perform.
    if (target.role === "SUPER_ADMIN") {
      const activeSuperAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (activeSuperAdmins <= 1) {
        throw new Error("Cannot deactivate the last Super Admin");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      lastLoginAt: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to deactivate user:", error);
    // Preserve the message so permission/last-admin guards are visible to the UI
    // instead of being flattened into a generic failure.
    throw new Error(error instanceof Error ? error.message : "Failed to deactivate user");
  }
}

export async function activateUser(id: string): Promise<UserInfo> {
  try {
    const actingUser = await requireAdmin();
    await assertCanActOnUser(actingUser, id);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      lastLoginAt: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to activate user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to activate user");
  }
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<void> {
  try {
    const actingUser = await requireAdmin();
    await assertCanActOnUser(actingUser, id);

    if (!newPassword.trim()) {
      throw new Error("Password is required");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash, forcePasswordChange: true },
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to reset password");
  }
}

export async function setForcePasswordChange(
  id: string,
  forceChange: boolean
): Promise<UserInfo> {
  try {
    const actingUser = await requireAdmin();
    await assertCanActOnUser(actingUser, id);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { forcePasswordChange: forceChange },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        forcePasswordChange: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      lastLoginAt: updatedUser.lastLoginAt ? updatedUser.lastLoginAt.toISOString().split("T")[0] : null,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to set force password change:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update user");
  }
}
