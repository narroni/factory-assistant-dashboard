/**
 * Loads a snapshot of factory data from PostgreSQL for injection into Ollama context.
 * All queries are strictly read-only.
 */
"use server";

import { prisma } from "./prisma";

export type FactoryContext = {
  asOf: string;
  inventory: {
    totalMaterials: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    lowStockItems: { name: string; code: string; quantity: number; unit: string; supplier: string }[];
    outOfStockItems: { name: string; code: string; unit: string; supplier: string }[];
    categoryBreakdown: { category: string; count: number; totalQty: number }[];
  };
  orders: {
    total: number;
    pending: number;
    inProduction: number;
    delayed: number;
    completed: number;
    cancelled: number;
    totalOpenValueEur: number;
    recentOrders: {
      orderNumber: string;
      customer: string;
      product: string;
      qty: number;
      status: string;
      dueDate: string;
      valueEur: number;
    }[];
  };
  suppliers: {
    total: number;
    active: number;
    warning: number;
    topByOnTime: {
      name: string;
      onTimeRate: number;
      leadTimeDays: number;
      country: string;
      status: string;
    }[];
  };
  products: {
    total: number;
    active: number;
    inactive: number;
    prototype: number;
    activeList: { name: string; code: string; primaryMaterial: string }[];
  };
};

export async function loadFactoryContext(): Promise<FactoryContext> {
  const [
    matStats,
    lowStockMats,
    outOfStockMats,
    catGroups,
    orderStats,
    openOrders,
    supplierStats,
    topSuppliers,
    productStats,
    activeProducts,
  ] = await Promise.all([
    // Material counts
    prisma.material.groupBy({ by: ["status"], _count: { id: true } }),
    // Low stock details
    prisma.material.findMany({
      where: { status: "LOW_STOCK" },
      select: {
        name: true, code: true, quantity: true, unit: true,
        suppliers: { take: 1, include: { supplier: { select: { name: true } } } },
      },
      orderBy: { quantity: "asc" },
      take: 15,
    }),
    // Out of stock details
    prisma.material.findMany({
      where: { status: "OUT_OF_STOCK" },
      select: {
        name: true, code: true, unit: true,
        suppliers: { take: 1, include: { supplier: { select: { name: true } } } },
      },
      take: 10,
    }),
    // Category breakdown
    prisma.material.groupBy({
      by: ["category"],
      _count: { id: true },
      _sum: { quantity: true },
    }),
    // Order counts
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    // Recent open orders
    prisma.order.findMany({
      where: { status: { in: ["PENDING", "IN_PRODUCTION", "DELAYED"] } },
      select: {
        orderNumber: true, customer: true, productName: true,
        qty: true, status: true, dueDate: true, valueEur: true,
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    // Supplier counts
    prisma.supplier.groupBy({ by: ["status"], _count: { id: true } }),
    // Top suppliers
    prisma.supplier.findMany({
      where: { status: { not: "INACTIVE" } },
      select: { name: true, onTimeRate: true, leadTimeDays: true, country: true, status: true },
      orderBy: { onTimeRate: "desc" },
      take: 10,
    }),
    // Product counts
    prisma.product.groupBy({ by: ["status"], _count: { id: true } }),
    // Active products
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, code: true, primaryMaterial: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
  ]);

  const matCount = (s: string) => matStats.find((r) => r.status === s)?._count.id ?? 0;
  const orderCount = (s: string) => orderStats.find((r) => r.status === s)?._count.id ?? 0;
  const supplierCount = (s: string) => supplierStats.find((r) => r.status === s)?._count.id ?? 0;
  const productCount = (s: string) => productStats.find((r) => r.status === s)?._count.id ?? 0;

  const totalOpen = openOrders.length;
  const openValue = openOrders.reduce((s, o) => s + o.valueEur, 0);

  const statusLabel: Record<string, string> = {
    PENDING: "Pending", IN_PRODUCTION: "In Production",
    DELAYED: "Delayed", COMPLETED: "Completed", CANCELLED: "Cancelled",
  };

  return {
    asOf: new Date().toISOString(),
    inventory: {
      totalMaterials: matStats.reduce((s, r) => s + r._count.id, 0),
      inStock: matCount("IN_STOCK"),
      lowStock: matCount("LOW_STOCK"),
      outOfStock: matCount("OUT_OF_STOCK"),
      lowStockItems: lowStockMats.map((m) => ({
        name: m.name, code: m.code, quantity: m.quantity, unit: m.unit,
        supplier: m.suppliers[0]?.supplier.name ?? "—",
      })),
      outOfStockItems: outOfStockMats.map((m) => ({
        name: m.name, code: m.code, unit: m.unit,
        supplier: m.suppliers[0]?.supplier.name ?? "—",
      })),
      categoryBreakdown: catGroups.map((c) => ({
        category: c.category,
        count: c._count.id,
        totalQty: Math.round(c._sum.quantity ?? 0),
      })),
    },
    orders: {
      total: orderStats.reduce((s, r) => s + r._count.id, 0),
      pending: orderCount("PENDING"),
      inProduction: orderCount("IN_PRODUCTION"),
      delayed: orderCount("DELAYED"),
      completed: orderCount("COMPLETED"),
      cancelled: orderCount("CANCELLED"),
      totalOpenValueEur: openValue,
      recentOrders: openOrders.map((o) => ({
        orderNumber: o.orderNumber, customer: o.customer,
        product: o.productName, qty: o.qty,
        status: statusLabel[o.status] ?? o.status,
        dueDate: o.dueDate.toISOString().split("T")[0],
        valueEur: o.valueEur,
      })),
    },
    suppliers: {
      total: supplierStats.reduce((s, r) => s + r._count.id, 0),
      active: supplierCount("ACTIVE"),
      warning: supplierCount("WARNING"),
      topByOnTime: topSuppliers.map((s) => ({
        name: s.name, onTimeRate: s.onTimeRate,
        leadTimeDays: s.leadTimeDays, country: s.country,
        status: s.status === "ACTIVE" ? "Active" : "Warning",
      })),
    },
    products: {
      total: productStats.reduce((s, r) => s + r._count.id, 0),
      active: productCount("ACTIVE"),
      inactive: productCount("INACTIVE"),
      prototype: productCount("PROTOTYPE"),
      activeList: activeProducts.map((p) => ({
        name: p.name, code: p.code, primaryMaterial: p.primaryMaterial,
      })),
    },
  };
}
