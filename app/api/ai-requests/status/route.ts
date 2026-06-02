import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

// POST /api/ai-requests/status — get statuses for multiple request IDs
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const requestIds = (body.ids ?? []) as string[];

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return NextResponse.json({ statuses: {} });
  }

  const requests = await prisma.aIActionRequest.findMany({
    where: { id: { in: requestIds } },
    select: {
      id: true, status: true, actionType: true,
      approvedAt: true,
      approver: { select: { name: true } },
      executedAction: {
        select: {
          id: true, outputType: true, outputFile: true, outputContent: true, createdAt: true,
          executor: { select: { name: true } },
        },
      },
    },
  });

  const statuses: Record<string, {
    status: string; actionType: string;
    executedAction?: { id: string; outputType: string; outputFile: string | null; outputContent: string | null; executedBy: string; executedAt: string } | null;
  }> = {};
  for (const req of requests) {
    statuses[req.id] = {
      status: req.status,
      actionType: req.actionType,
      executedAction: req.executedAction
        ? {
            id: req.executedAction.id,
            outputType: req.executedAction.outputType,
            outputFile: req.executedAction.outputFile,
            outputContent: req.executedAction.outputContent,
            executedBy: req.executedAction.executor.name,
            executedAt: req.executedAction.createdAt.toISOString(),
          }
        : null,
    };
  }

  return NextResponse.json({ statuses });
}
