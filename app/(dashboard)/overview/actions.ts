"use server";

import { prisma } from "../../lib/prisma";

export async function getOverviewData() {
  try {
    const [
      materialCount,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      allOrders,
      recentOrders,
      lowStockMaterials,
      outOfStockMaterials,
      totalOrderValue,
    ] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where: { status: "IN_STOCK" } }),
      prisma.material.count({ where: { status: "LOW_STOCK" } }),
      prisma.material.count({ where: { status: "OUT_OF_STOCK" } }),
      prisma.order.findMany({
        where: { status: { not: "COMPLETED" } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.material.findMany({
        where: { status: "LOW_STOCK" },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.material.findMany({
        where: { status: "OUT_OF_STOCK" },
        select: { name: true },
      }),
      prisma.order.aggregate({
        _sum: { valueEur: true },
        where: { status: { not: "CANCELLED" } },
      }),
    ]);

    // AI request stats (today)
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const [aiPending, aiApprovedToday, aiRejectedToday, aiExecutedToday] = await Promise.all([
      prisma.aIActionRequest.count({ where: { status: "PENDING" } }),
      prisma.aIActionRequest.count({ where: { status: "APPROVED", approvedAt: { gte: todayStart } } }),
      prisma.aIActionRequest.count({ where: { status: "REJECTED", approvedAt: { gte: todayStart } } }),
      prisma.aIActionRequest.count({ where: { status: "EXECUTED", approvedAt: { gte: todayStart } } }),
    ]);

    const openOrdersCount = allOrders.length;
    const inProductionCount = allOrders.filter((o) => o.status === "IN_PRODUCTION").length;
    const delayedCount = allOrders.filter((o) => o.status === "DELAYED").length;

    const systemAlerts = [];

    if (outOfStockCount > 0) {
      systemAlerts.push({
        type: "warning",
        text: `${outOfStockCount} material${outOfStockCount !== 1 ? "s" : ""} out of stock. Immediate restocking required.`,
      });
    }

    if (lowStockCount > 0) {
      systemAlerts.push({
        type: "warning",
        text: `${lowStockCount} material${lowStockCount !== 1 ? "s" : ""} below minimum threshold. Order soon to avoid stockouts.`,
      });
    }

    if (delayedCount > 0) {
      systemAlerts.push({
        type: "warning",
        text: `${delayedCount} order${delayedCount !== 1 ? "s" : ""} delayed. Review production schedules and customer commitments.`,
      });
    }

    if (inProductionCount > 0) {
      systemAlerts.push({
        type: "info",
        text: `${inProductionCount} order${inProductionCount !== 1 ? "s" : ""} in production. Monitor progress to meet deadlines.`,
      });
    }

    if (systemAlerts.length === 0) {
      systemAlerts.push({
        type: "info",
        text: "All systems operational. No active alerts or issues.",
      });
    }

    return {
      totalMaterials: materialCount,
      inStockMaterials: inStockCount,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      openOrders: openOrdersCount,
      inProductionOrders: inProductionCount,
      totalOrderValue: totalOrderValue._sum.valueEur || 0,
      recentOrders: recentOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.customer,
        product: o.productName,
        qty: o.qty,
        status: o.status,
        date: new Date(o.createdAt).toLocaleDateString(),
      })),
      lowStockAlerts: lowStockMaterials.map((m) => ({
        name: m.name,
        stock: Math.round(m.quantity),
        unit: m.unit,
      })),
      systemAlerts,
      aiRequests: { pending: aiPending, approvedToday: aiApprovedToday, rejectedToday: aiRejectedToday, executedToday: aiExecutedToday },
    };
  } catch (error) {
    console.error("Failed to fetch overview data:", error);
    return {
      totalMaterials: 0,
      inStockMaterials: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      openOrders: 0,
      inProductionOrders: 0,
      totalOrderValue: 0,
      recentOrders: [],
      lowStockAlerts: [],
      systemAlerts: [],
      aiRequests: { pending: 0, approvedToday: 0, rejectedToday: 0, executedToday: 0 },
    };
  }
}
