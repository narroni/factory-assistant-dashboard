"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./auth-helpers";
import { getSessionUser } from "./session";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

// Called server-side only after authenticated mutations. Deliberately does not
// require a session of its own — it resolves the current user purely to
// attribute the entry, and must never block the mutation that triggered it.
//
// NOTE: because this module is "use server", this function is still reachable
// as a public endpoint, so audit entries remain forgeable by an anonymous
// caller. Closing that requires moving it out of the "use server" module rather
// than adding a guard here. See the audit report (C4).
export async function logAuditEvent(
  entity: string,
  entityId: string,
  action: AuditAction,
  before?: Record<string, any>,
  after?: Record<string, any>
) {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        userId,
        before: before ? JSON.stringify(before) : undefined,
        after: after ? JSON.stringify(after) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit logging failure shouldn't break the operation
  }
}

export async function getAuditLogs(filters?: {
  entity?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  try {
    const where: any = {};

    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], total: 0 };
  }
}
