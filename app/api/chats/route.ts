import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { prisma } from "../../lib/prisma";

// GET /api/chats — list chats (own for worker/viewer, all for admin with ?userId filter)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const filterUserId = url.searchParams.get("userId");

  const where =
    user.role === "ADMIN"
      ? filterUserId ? { userId: filterUserId } : {}
      : { userId: user.id };

  const chats = await prisma.assistantChat.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(chats);
}

// POST /api/chats — create a new chat
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const chat = await prisma.assistantChat.create({
    data: { userId: user.id, title: "New Chat" },
  });

  return NextResponse.json(chat, { status: 201 });
}
