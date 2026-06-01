import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

// GET /api/admin/ai-config
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let config = await prisma.aIConfig.findUnique({ where: { id: "singleton" } });
  if (!config) {
    config = await prisma.aIConfig.create({ data: { id: "singleton" } });
  }
  return NextResponse.json(config);
}

// PATCH /api/admin/ai-config
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const config = await prisma.aIConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...body },
    update: body,
  });
  return NextResponse.json(config);
}
