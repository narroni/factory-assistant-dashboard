"use server";

import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/auth";
import { createSession, destroySession } from "../lib/session";
import { redirect } from "next/navigation";

// Single message for every authentication failure — see loginUser().
const LOGIN_FAILED = "Invalid email or password";

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

    // Every failure path returns the identical message. Distinguishing "no such
    // user" from "wrong password" from "account disabled" let anyone probe the
    // login form to discover which email addresses are valid, and which of them
    // are still active.
    if (!user || !user.passwordHash) {
      return { error: LOGIN_FAILED };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: LOGIN_FAILED };
    }

    if (user.status === "INACTIVE") {
      return { error: LOGIN_FAILED };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    try {
      await createSession(user.id);
    } catch (sessionError) {
      console.error("Session creation failed:", sessionError);
      console.error("Session error details:", JSON.stringify(sessionError, Object.getOwnPropertyNames(sessionError)));
      return { error: "Session creation failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    console.error("Login error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return { error: "An error occurred during login" };
  }
}

export async function logoutUser() {
  try {
    await destroySession();
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "An error occurred during logout" };
  }

  // Must stay outside the try/catch: redirect() signals by throwing NEXT_REDIRECT,
  // which a surrounding catch would swallow, silently cancelling the navigation.
  redirect("/login");
}
