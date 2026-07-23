import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

// GET /api/requests/count — pending request count (manager/super_admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.workerRequest.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count });
}
