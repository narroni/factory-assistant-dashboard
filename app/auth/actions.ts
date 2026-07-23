"use server";

import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/auth";
import { createSession, destroySession } from "../lib/session";
import { redirect } from "next/navigation";

export async function loginUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        status: true,
        role: true,
      },
    });

    if (!user || !user.passwordHash) {
      return { error: "Invalid email or password" };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: "Incorrect password, try again" };
    }

    if (user.status === "INACTIVE") {
      return { error: "User account is inactive" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession(user.id);
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An error occurred during login" };
  }
}

export async function logoutUser() {
  try {
    await destroySession();
    redirect("/login");
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "An error occurred during logout" };
  }
}

export async function createUserAccount(
  name: string,
  email: string,
  password: string,
  role: "SUPER_ADMIN" | "MANAGER" | "WORKER" | "VIEWER" = "VIEWER"
) {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { error: "User with this email already exists" };
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: "ACTIVE",
      },
    });

    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  } catch (error) {
    console.error("User creation error:", error);
    return { error: "Failed to create user account" };
  }
}
