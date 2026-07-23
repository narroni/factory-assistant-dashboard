import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { UserRole, UserStatus } from "@prisma/client";

const SESSION_COOKIE = "factory-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

/**
 * Issues a new session.
 *
 * The cookie carries an opaque 32-byte random token, never the user id — so a
 * cookie cannot be forged by learning a user id (ids leak through audit logs,
 * output records and the user list). The token is the primary key of a row in
 * `sessions`, which makes revocation a single DELETE.
 */
export async function createSession(userId: string): Promise<void> {
  // Get cookie store FIRST before any async operations (Next.js requirement)
  const cookieStore = await cookies();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  try {
    // One active session per user: issuing a new one invalidates any previous.
    await prisma.session.deleteMany({ where: { userId } });

    await prisma.session.create({
      data: { id: token, userId, expiresAt },
    });
  } catch (dbError) {
    console.error("Session DB error:", dbError);
    console.error("Session DB error details:", JSON.stringify(dbError, Object.getOwnPropertyNames(dbError)));
    throw dbError;
  }

  try {
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  } catch (cookieError) {
    console.error("Cookie set error:", cookieError);
    console.error("Cookie set error details:", JSON.stringify(cookieError, Object.getOwnPropertyNames(cookieError)));
    throw cookieError;
  }
}

/**
 * Resolves the current session to a user, or null.
 *
 * Returns null when: no cookie, unknown/revoked token, expired session, or the
 * account has been deactivated. The deactivation check means disabling a user
 * now logs them out on their next request, which the previous implementation
 * did not do.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { id: token },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: token } }).catch(() => {});
      return null;
    }

    if (session.user.status === "INACTIVE") return null;

    return session.user;
  } catch (error) {
    // Logged so a database outage is diagnosable, rather than silently
    // presenting as "everyone is logged out".
    console.error("[session] lookup failed:", error);
    return null;
  }
}

/**
 * Revokes the current session and clears the cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.delete({ where: { id: token } }).catch(() => {});
    }
    cookieStore.delete(SESSION_COOKIE);
  } catch (error) {
    console.error("[session] destroy failed:", error);
  }
}

/**
 * Deletes every expired session row. Called opportunistically from a hot path
 * so expired rows do not accumulate indefinitely.
 */
export async function deleteExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
