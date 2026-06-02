/**
 * Loads a snapshot of factory data from PostgreSQL for injection into the AI context.
 * Uses BladeProductSpec as the single source of truth for products.
 * All queries are strictly read-only.
 */
"use server";

import { prisma } from "./prisma";

export type FactoryContext = {
  asOf: string;
  _notes: string[];
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
      lines: string;       // e.g. "RDG600/1,25 ×5000, RDL002 ×2000"
      qty: number;         // total pcs across lines (or legacy qty)
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
    items: {
      articleCode: string;
      productName: string;
      lengthMm: number;
      widthMm: number;
      thicknessMm: number;
      tpi: number;
      color: string;
      weightAfterPunchingKg: number;
      pcsPerCrate: number;
      crateCode: string;
      maxCratesPerTower: number;
    }[];
  };
  crates: {
    code: string;
    emptyWeightKg: number;
    xMeters: number;
    yMeters: number;
    zMeters: number;
    hasLegs: boolean;
  }[];
  containers: {
    name: string;
    lengthMeters: number;
    widthMeters: number;
    maxVolumeM3: number;
    maxPayloadKg: number;
  }[];
  customers: {
    total: number;
    list: { name: string; orderCount: number }[];
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
    bladeProducts,
    crateTypes,
    containerTypes,
    customers,
  ] = await Promise.all([
    // Material counts
    prisma.material.groupBy({ by: ["status"], _count: { id: true } }),
    // Low stock
    prisma.material.findMany({
      where: { status: "LOW_STOCK" },
      select: {
        name: true, code: true, quantity: true, unit: true,
        suppliers: { take: 1, include: { supplier: { select: { name: true } } } },
      },
      orderBy: { quantity: "asc" },
      take: 15,
    }),
    // Out of stock
    prisma.material.findMany({
      where: { status: "OUT_OF_STOCK" },
      select: {
        name: true, code: true, unit: true,
        suppliers: { take: 1, include: { supplier: { select: { name: true } } } },
      },
      take: 10,
    }),
    // Category breakdown
    prisma.material.groupBy({ by: ["category"], _count: { id: true }, _sum: { quantity: true } }),
    // Order status counts
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    // Open orders with lines
    prisma.order.findMany({
      where: { status: { in: ["PENDING", "IN_PRODUCTION", "DELAYED"] } },
      select: {
        orderNumber: true, customer: true, productName: true,
        qty: true, status: true, dueDate: true, valueEur: true,
        lines: { select: { articleCode: true, qty: true } },
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
    // BladeProductSpec — the real product catalog
    prisma.bladeProductSpec.findMany({
      include: { crateType: true },
      orderBy: { articleCode: "asc" },
    }),
    // Crate types
    prisma.crateType.findMany({ orderBy: { code: "asc" } }),
    // Container types
    prisma.containerType.findMany({ orderBy: { name: "asc" } }),
    // Customers
    prisma.customer.findMany({
      select: { name: true, _count: { select: { orders: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const matCount = (s: string) => matStats.find((r) => r.status === s)?._count.id ?? 0;
  const orderCount = (s: string) => orderStats.find((r) => r.status === s)?._count.id ?? 0;
  const supplierCount = (s: string) => supplierStats.find((r) => r.status === s)?._count.id ?? 0;

  const openValue = openOrders.reduce((s, o) => s + o.valueEur, 0);

  const statusLabel: Record<string, string> = {
    PENDING: "Pending", IN_PRODUCTION: "In Production",
    DELAYED: "Delayed", COMPLETED: "Completed", CANCELLED: "Cancelled",
  };

  const totalMaterials = matStats.reduce((s, r) => s + r._count.id, 0);
  const totalSuppliers = supplierStats.reduce((s, r) => s + r._count.id, 0);

  return {
    asOf: new Date().toISOString(),
    _notes: ([
      totalMaterials === 0 ? "No materials have been entered yet. Do not invent or assume material data." : null,
      totalSuppliers === 0 ? "No suppliers have been entered yet. Do not invent or assume supplier data." : null,
    ] as (string | null)[]).filter((n): n is string => n !== null),
    inventory: {
      totalMaterials,
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
        category: c.category, count: c._count.id,
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
      recentOrders: openOrders.map((o) => {
        const linesStr = o.lines.length > 0
          ? o.lines.map((l) => `${l.articleCode} ×${l.qty.toLocaleString()}`).join(", ")
          : `${o.productName} ×${o.qty}`;
        const totalQty = o.lines.length > 0
          ? o.lines.reduce((s, l) => s + l.qty, 0)
          : o.qty;
        return {
          orderNumber: o.orderNumber, customer: o.customer,
          lines: linesStr, qty: totalQty,
          status: statusLabel[o.status] ?? o.status,
          dueDate: o.dueDate.toISOString().split("T")[0],
          valueEur: o.valueEur,
        };
      }),
    },
    suppliers: {
      total: totalSuppliers,
      active: supplierCount("ACTIVE"),
      warning: supplierCount("WARNING"),
      topByOnTime: topSuppliers.map((s) => ({
        name: s.name, onTimeRate: s.onTimeRate,
        leadTimeDays: s.leadTimeDays, country: s.country,
        status: s.status === "ACTIVE" ? "Active" : "Warning",
      })),
    },
    products: {
      total: bladeProducts.length,
      items: bladeProducts.map((p) => ({
        articleCode: p.articleCode,
        productName: p.productName,
        lengthMm: p.lengthMm,
        widthMm: p.widthMm,
        thicknessMm: p.thicknessMm,
        tpi: p.tpi,
        color: p.color,
        weightAfterPunchingKg: p.weightAfterPunchingKg,
        pcsPerCrate: p.pcsPerCrate,
        crateCode: p.crateType.code,
        maxCratesPerTower: p.maxCratesPerTower,
      })),
    },
    crates: crateTypes.map((c) => ({
      code: c.code,
      emptyWeightKg: c.emptyWeightKg,
      xMeters: c.xMeters,
      yMeters: c.yMeters,
      zMeters: c.zMeters,
      hasLegs: c.hasLegs,
    })),
    containers: containerTypes.map((c) => ({
      name: c.name,
      lengthMeters: c.lengthMeters,
      widthMeters: c.widthMeters,
      maxVolumeM3: c.maxVolumeM3,
      maxPayloadKg: c.maxPayloadKg,
    })),
    customers: {
      total: customers.length,
      list: customers.map((c) => ({ name: c.name, orderCount: c._count.orders })),
    },
  };
}
