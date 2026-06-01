import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/session";
import { prisma } from "../../lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") ?? "10", 10);

  const where =
    user.role === "ADMIN"
      ? {}
      : { request: { createdByUserId: user.id } };

  const [total, outputs] = await Promise.all([
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

  return NextResponse.json({
    outputs: outputs.map((o) => ({
      id: o.id,
      actionType: o.actionType,
      outputType: o.outputType,
      outputFile: o.outputFile,
      generatedBy: o.executor.name,
      approvedBy: o.request.approver?.name || "Not approved",
      createdAt: o.createdAt,
      createdByUserId: o.request.createdByUserId,
    })),
    total,
    page,
    pageSize,
  });
}
