import { NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { prisma } from "../../lib/prisma";

// GET /api/ai-requests — list requests
// ADMIN: all requests; WORKER/VIEWER: own requests only
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const where = user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { createdByUserId: user.id };

  const requests = await prisma.aIActionRequest.findMany({
    where,
    include: {
      createdByUser: { select: { name: true, email: true } },
      approver:      { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(requests);
}
