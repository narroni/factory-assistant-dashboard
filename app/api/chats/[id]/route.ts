import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/chats/[id] — fetch one chat with messages
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const chat = await prisma.assistantChat.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && chat.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(chat);
}

// PATCH /api/chats/[id] — update title
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const chat = await prisma.assistantChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && chat.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.assistantChat.update({
    where: { id },
    data: { title: body.title ?? chat.title },
  });
  return NextResponse.json(updated);
}

// DELETE /api/chats/[id]
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const chat = await prisma.assistantChat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && chat.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.assistantChat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
