import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/ai-requests/[id] — approve / reject / execute (admin only)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({})) as { action: string };
  const action = body.action;

  if (!["approve", "reject", "execute"].includes(action)) {
    return NextResponse.json({ error: "action must be approve | reject | execute" }, { status: 400 });
  }

  const record = await prisma.aIActionRequest.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Guard transitions
  if (action === "approve" && record.status !== "PENDING")
    return NextResponse.json({ error: "Only PENDING requests can be approved" }, { status: 409 });
  if (action === "reject" && record.status !== "PENDING")
    return NextResponse.json({ error: "Only PENDING requests can be rejected" }, { status: 409 });
  if (action === "execute" && record.status !== "APPROVED")
    return NextResponse.json({ error: "Only APPROVED requests can be executed" }, { status: 409 });

  const now = new Date();
  const updated = await prisma.aIActionRequest.update({
    where: { id },
    data:
      action === "approve" ? { status: "APPROVED", approvedBy: user.id, approvedAt: now }
      : action === "reject"  ? { status: "REJECTED", approvedBy: user.id, approvedAt: now }
      : { status: "EXECUTED" },
    include: {
      createdByUser: { select: { name: true, email: true } },
      approver:      { select: { name: true } },
    },
  });

  console.info(`[ai-requests] ${action} id=${id} by=${user.email}`);
  return NextResponse.json(updated);
}

// GET /api/ai-requests/[id] — single request detail
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const record = await prisma.aIActionRequest.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { name: true, email: true } },
      approver:      { select: { name: true } },
    },
  });

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && record.createdByUserId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(record);
}
