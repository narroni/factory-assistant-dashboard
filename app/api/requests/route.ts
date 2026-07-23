import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { prisma } from "../../lib/prisma";
import type { Prisma, RequestType } from "@prisma/client";

const ALLOWED_TYPES: RequestType[] = ["CREATE_PRODUCT", "CREATE_MATERIAL", "CREATE_ORDER"];

// POST /api/requests — worker/manager/super_admin submits a request
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && user.role !== "WORKER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { type, payload } = body;

  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid or missing request type" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid or missing payload" }, { status: 400 });
  }

  const request = await prisma.workerRequest.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      requestedById: user.id,
    },
    include: {
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}

// GET /api/requests — list requests (own for WORKER, all for MANAGER/SUPER_ADMIN)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && user.role !== "WORKER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = user.role === "WORKER" ? { requestedById: user.id } : {};

  const requests = await prisma.workerRequest.findMany({
    where,
    include: {
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(requests);
}
