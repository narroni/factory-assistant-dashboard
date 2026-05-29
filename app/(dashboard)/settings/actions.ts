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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}): Promise<UserInfo> {
  try {
    await requireAdmin();

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
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...newUser,
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
    await requireAdmin();

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
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to update user:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update user");
  }
}

export async function deactivateUser(id: string): Promise<UserInfo> {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
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
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to deactivate user:", error);
    throw new Error("Failed to deactivate user");
  }
}

export async function activateUser(id: string): Promise<UserInfo> {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Failed to activate user:", error);
    throw new Error("Failed to activate user");
  }
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<void> {
  try {
    await requireAdmin();

    if (!newPassword.trim()) {
      throw new Error("Password is required");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to reset password");
  }
}
