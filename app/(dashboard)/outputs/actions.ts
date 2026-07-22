"use server";

import { prisma } from "../../lib/prisma";
import { getSessionUser } from "../../lib/session";

export type Output = {
  id: string;
  actionType: string;
  outputType: string;
  outputFile: string | null;
  generatedBy: string;
  approvedBy: string;
  createdAt: string;
};

export async function getOutputs(page: number, pageSize: number): Promise<{ outputs: Output[]; total: number }> {
  const user = await getSessionUser();
  if (!user) return { outputs: [], total: 0 };

  const where = user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { request: { createdByUserId: user.id } };

  const [total, rows] = await Promise.all([
    prisma.executedAction.count({ where }),
    prisma.executedAction.findMany({
      where,
      include: {
        request: {
          select: {
            createdByUserId: true,
            createdByUser: { select: { name: true } },
            approvedBy: true,
            approver: { select: { name: true } },
          },
        },
        executor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    outputs: rows.map((o) => ({
      id: o.id,
      actionType: o.actionType,
      outputType: o.outputType,
      outputFile: o.outputFile,
      generatedBy: o.executor.name,
      approvedBy: o.request.approver?.name || "Not approved",
      createdAt: o.createdAt.toISOString(),
    })),
    total,
  };
}
