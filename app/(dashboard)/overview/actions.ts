"use server";

import { prisma } from "../../lib/prisma";

export async function getOverviewData() {
  try {
    const [materialCount, lowStockCount, orders, lowStockMaterials] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({
        where: { status: "LOW_STOCK" },
      }),
      prisma.order.findMany({
        where: { status: "PENDING" },
        take: 10,
        orderBy: { dueDate: "asc" },
      }),
      prisma.material.findMany({
        where: { status: "LOW_STOCK" },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      totalMaterials: materialCount,
      openOrders: orders.length,
      lowStockItems: lowStockCount,
      productionCapacity: Math.min(100, Math.round((materialCount / 50) * 100)),
      recentOrders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.customer,
        product: o.productName,
        qty: o.qty,
        status: o.status.replace(/_/g, " "),
        value: `€${o.valueEur.toLocaleString()}`,
        dueDate: new Date(o.dueDate).toLocaleDateString(),
        date: new Date(o.createdAt).toLocaleDateString(),
      })),
      lowStockAlerts: lowStockMaterials.map((m) => ({
        name: m.name,
        status: m.status.replace(/_/g, " "),
        stock: Math.round(m.quantity),
        unit: m.unit,
        pct: Math.round((m.quantity / 100) * 100),
      })),
      systemAlerts: lowStockCount > 0 ? [
        {
          type: "warning",
          text: `${lowStockCount} material${lowStockCount !== 1 ? "s" : ""} below stock threshold. Review inventory levels to prevent stockouts.`,
        },
      ] : [],
    };
  } catch (error) {
    console.error("Failed to fetch overview data:", error);
    return {
      totalMaterials: 0,
      openOrders: 0,
      lowStockItems: 0,
      productionCapacity: 0,
      recentOrders: [],
      lowStockAlerts: [],
      systemAlerts: [{ type: "warning", text: "Unable to load system data" }],
    };
  }
}
