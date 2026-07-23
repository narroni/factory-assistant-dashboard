import { getSessionUser, deleteExpiredSessions } from "../../../lib/session";
import { NextResponse } from "next/server";

// Fraction of requests that also sweep expired session rows.
const SESSION_SWEEP_RATE = 0.01;

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Opportunistic cleanup: expired rows are already rejected by
    // getSessionUser, so this is housekeeping only and must never delay or
    // fail the response.
    if (Math.random() < SESSION_SWEEP_RATE) {
      void deleteExpiredSessions().catch((error) => {
        console.error("[session] expired-session sweep failed:", error);
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
