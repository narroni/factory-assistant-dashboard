"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./auth-helpers";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

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
