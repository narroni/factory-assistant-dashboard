"use server";

import { prisma } from "../../lib/prisma";
import { getSessionUser } from "../../lib/session";

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  user: { name: string; email: string };
  _count: { messages: number };
};

export async function getChats(userFilter?: string): Promise<ChatSummary[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const where =
    user.role === "ADMIN"
      ? userFilter ? { userId: userFilter } : {}
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

  return JSON.parse(JSON.stringify(chats));
}
