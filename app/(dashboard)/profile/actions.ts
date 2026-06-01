"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/auth";
import { getCurrentUser } from "../../lib/auth-helpers";

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      throw new Error("User not found");
    }

    const isPasswordValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, forcePasswordChange: false },
    });
  } catch (error) {
    console.error("Failed to change password:", error);
    throw error instanceof Error ? error : new Error("Failed to change password");
  }
}
