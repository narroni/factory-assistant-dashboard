"use server";

import { prisma } from "../../lib/prisma";
import { getSessionUser } from "../../lib/session";

export type ActionRequest = {
  id: string;
  createdByUser: { name: string };
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  approvedBy?: string;
  approvedAt?: string;
  executedAction?: {
    id: string;
    outputType: string;
    outputFile: string;
    createdAt: string;
  };
  createdAt: string;
};

export async function getAIRequests(): Promise<ActionRequest[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const where = user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { createdByUserId: user.id };

  const requests = await prisma.aIActionRequest.findMany({
    where,
    include: {
      createdByUser: { select: { name: true, email: true } },
      approver: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return JSON.parse(JSON.stringify(requests));
}
