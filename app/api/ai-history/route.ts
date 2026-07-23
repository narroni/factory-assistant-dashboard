import { NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { prisma } from "../../lib/prisma";

// GET /api/ai-history — admin only
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const logs = await prisma.aIInteractionLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
