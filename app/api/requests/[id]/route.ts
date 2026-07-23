import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/requests/[id] — approve or reject a worker request (manager/super_admin only)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as { action?: string; comment?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { action, comment } = body;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE | REJECT" }, { status: 400 });
  }

  const request = await prisma.workerRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING requests can be reviewed" }, { status: 409 });
  }

  const now = new Date();
  const payload = request.payload as Record<string, unknown>;

  if (action === "APPROVE") {
    if (request.type === "CREATE_PRODUCT") {
      await prisma.bladeProductSpec.create({
        data: payload as unknown as Prisma.BladeProductSpecUncheckedCreateInput,
      });
    } else if (request.type === "CREATE_MATERIAL") {
      await prisma.material.create({
        data: payload as unknown as Prisma.MaterialUncheckedCreateInput,
      });
    } else if (request.type === "CREATE_ORDER") {
      await prisma.order.create({
        data: payload as unknown as Prisma.OrderUncheckedCreateInput,
      });
    }
  }

  const updated = await prisma.workerRequest.update({
    where: { id },
    data:
      action === "APPROVE"
        ? { status: "APPROVED", reviewedById: user.id, reviewedAt: now, reviewerComment: comment ?? null }
        : { status: "REJECTED", reviewedById: user.id, reviewedAt: now, reviewerComment: comment ?? null },
    include: {
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: request.type,
      entityId: id,
      action: action === "APPROVE" ? "APPROVE_REQUEST" : "REJECT_REQUEST",
      userId: user.id,
    },
  });

  return NextResponse.json(updated);
}
