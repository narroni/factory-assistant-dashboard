import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";

// Cap on how many IDs one call may look up, to bound the query and stop bulk probing.
const MAX_STATUS_IDS = 50;

// POST /api/ai-requests/status — get statuses for multiple request IDs
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const requestIds: unknown = body.ids ?? [];

  // Validate element types, not just that it's an array: an unchecked cast let
  // objects like {"gt":""} through into the Prisma `in` filter.
  if (!Array.isArray(requestIds) || !requestIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (requestIds.length > MAX_STATUS_IDS) {
    return NextResponse.json({ error: "Too many IDs" }, { status: 400 });
  }

  if (requestIds.length === 0) {
    return NextResponse.json({ statuses: {} });
  }

  // Scope to the caller's own requests unless they're an admin. Without this,
  // any user could read any other user's generated document body by ID.
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "MANAGER";
  const where = isAdmin
    ? { id: { in: requestIds } }
    : { id: { in: requestIds }, createdByUserId: user.id };

  const requests = await prisma.aIActionRequest.findMany({
    where,
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
