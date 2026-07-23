import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";
import { prisma } from "../../../../lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/admin/knowledge/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await prisma.factoryKnowledge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/knowledge/[id] — toggle enabled status
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const file = await prisma.factoryKnowledge.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.factoryKnowledge.update({
    where: { id },
    data: {
      enabled: body.enabled !== undefined ? body.enabled : !file.enabled,
    },
  });
  return NextResponse.json(updated);
}
