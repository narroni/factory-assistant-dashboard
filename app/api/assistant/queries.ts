/**
 * Read-only Prisma query handlers, one per intent.
 * IMPORTANT: No writes of any kind are performed here.
 * Each handler returns a typed ToolResult.
 */

import { prisma } from "../../lib/prisma";

// ── Shared result shape ────────────────────────────────────────────────────────

export type ToolResult =
  | TotalMaterialsResult
  | LowStockResult
  | OpenOrdersResult
  | BestSuppliersResult
  | ProductCapacityResult;

export type TotalMaterialsResult = {
  tool: "total_materials";
  data: {
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    byCategory: { category: string; count: number }[];
  };
  summary: string;
};

export type LowStockResult = {
  tool: "low_stock_items";
  data: {
    lowStockCount: number;
    outOfStockCount: number;
    items: { name: string; code: string; quantity: number; unit: string; status: string; supplier: string }[];
  };
  summary: string;
};

export type OpenOrdersResult = {
  tool: "open_orders";
  data: {
    total: number;
    pending: number;
    inProduction: number;
    delayed: number;
    totalValueEur: number;
    soonestDueDate: string | null;
    orders: { orderNumber: string; customer: string; product: string; status: string; dueDate: string; valueEur: number }[];
  };
  summary: string;
};

export type BestSuppliersResult = {
  tool: "best_suppliers";
  data: {
    suppliers: { name: string; onTimeRate: number; status: string; country: string; leadTimeDays: number }[];
  };
  summary: string;
};

export type ProductCapacityResult = {
  tool: "product_capacity";
  data: {
    total: number;
    active: number;
    inactive: number;
    prototype: number;
    activeProducts: { name: string; code: string; status: string; primaryMaterial: string }[];
  };
  summary: string;
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function queryTotalMaterials(): Promise<TotalMaterialsResult> {
  const [total, inStock, lowStock, outOfStock, rawGroups] = await Promise.all([
    prisma.material.count(),
    prisma.material.count({ where: { status: "IN_STOCK" } }),
    prisma.material.count({ where: { status: "LOW_STOCK" } }),
    prisma.material.count({ where: { status: "OUT_OF_STOCK" } }),
    prisma.material.groupBy({ by: ["category"], _count: { id: true } }),
  ]);

  const byCategory = rawGroups
    .map((g) => ({ category: g.category, count: g._count.id }))
    .sort((a, b) => b.count - a.count);

  const summary =
    `There are ${total} materials in inventory. ` +
    `${inStock} in stock, ${lowStock} low stock, ${outOfStock} out of stock.` +
    (lowStock + outOfStock > 0
      ? ` ${lowStock + outOfStock} material(s) need attention.`
      : " All materials are in stock.");

  return { tool: "total_materials", data: { total, inStock, lowStock, outOfStock, byCategory }, summary };
}

export async function queryLowStockItems(): Promise<LowStockResult> {
  const [lowStockItems, outOfStockItems] = await Promise.all([
    prisma.material.findMany({
      where: { status: "LOW_STOCK" },
      select: {
        name: true,
        code: true,
        quantity: true,
        unit: true,
        status: true,
        suppliers: {
          take: 1,
          include: { supplier: { select: { name: true } } },
        },
      },
      orderBy: { quantity: "asc" },
    }),
    prisma.material.findMany({
      where: { status: "OUT_OF_STOCK" },
      select: {
        name: true,
        code: true,
        quantity: true,
        unit: true,
        status: true,
        suppliers: {
          take: 1,
          include: { supplier: { select: { name: true } } },
        },
      },
    }),
  ]);

  const format = (m: typeof lowStockItems[number]) => ({
    name: m.name,
    code: m.code,
    quantity: m.quantity,
    unit: m.unit,
    status: m.status === "LOW_STOCK" ? "Low Stock" : "Out of Stock",
    supplier: m.suppliers[0]?.supplier.name ?? "—",
  });

  const items = [...outOfStockItems.map(format), ...lowStockItems.map(format)];
  const lowStockCount = lowStockItems.length;
  const outOfStockCount = outOfStockItems.length;

  const summary =
    outOfStockCount > 0
      ? `${outOfStockCount} material(s) are completely out of stock and require immediate reordering. ` +
        `Additionally, ${lowStockCount} material(s) are running low.`
      : lowStockCount > 0
      ? `${lowStockCount} material(s) are running low on stock and should be reordered soon.`
      : "All materials are at adequate stock levels. No immediate action required.";

  return { tool: "low_stock_items", data: { lowStockCount, outOfStockCount, items }, summary };
}

export async function queryOpenOrders(): Promise<OpenOrdersResult> {
  const openOrders = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "IN_PRODUCTION", "DELAYED"] } },
    orderBy: { dueDate: "asc" },
    select: {
      orderNumber: true,
      customer: true,
      productName: true,
      status: true,
      dueDate: true,
      valueEur: true,
    },
  });

  const statusLabel: Record<string, string> = {
    PENDING: "Pending",
    IN_PRODUCTION: "In Production",
    DELAYED: "Delayed",
  };

  const pending = openOrders.filter((o) => o.status === "PENDING").length;
  const inProduction = openOrders.filter((o) => o.status === "IN_PRODUCTION").length;
  const delayed = openOrders.filter((o) => o.status === "DELAYED").length;
  const totalValueEur = openOrders.reduce((s, o) => s + o.valueEur, 0);
  const soonestDueDate = openOrders[0]?.dueDate.toISOString().split("T")[0] ?? null;

  const orders = openOrders.slice(0, 10).map((o) => ({
    orderNumber: o.orderNumber,
    customer: o.customer,
    product: o.productName,
    status: statusLabel[o.status] ?? o.status,
    dueDate: o.dueDate.toISOString().split("T")[0],
    valueEur: o.valueEur,
  }));

  const summary =
    openOrders.length === 0
      ? "There are no open orders at the moment."
      : `There are ${openOrders.length} open orders with a total value of €${totalValueEur.toLocaleString("en")}. ` +
        `${pending} pending, ${inProduction} in production, ${delayed} delayed.` +
        (delayed > 0 ? ` ${delayed} order(s) are delayed and need attention.` : "") +
        (soonestDueDate ? ` Earliest due date: ${soonestDueDate}.` : "");

  return {
    tool: "open_orders",
    data: { total: openOrders.length, pending, inProduction, delayed, totalValueEur, soonestDueDate, orders },
    summary,
  };
}

export async function queryBestSuppliers(): Promise<BestSuppliersResult> {
  const suppliers = await prisma.supplier.findMany({
    where: { status: { not: "INACTIVE" } },
    select: {
      name: true,
      onTimeRate: true,
      status: true,
      country: true,
      leadTimeDays: true,
    },
    orderBy: { onTimeRate: "desc" },
  });

  const statusLabel: Record<string, string> = { ACTIVE: "Active", WARNING: "Warning", INACTIVE: "Inactive" };

  const top = suppliers.slice(0, 5).map((s) => ({
    name: s.name,
    onTimeRate: s.onTimeRate,
    status: statusLabel[s.status] ?? s.status,
    country: s.country,
    leadTimeDays: s.leadTimeDays,
  }));

  const avg =
    suppliers.length > 0
      ? (suppliers.reduce((s, x) => s + x.onTimeRate, 0) / suppliers.length).toFixed(1)
      : "0";

  const best = top[0];
  const summary =
    suppliers.length === 0
      ? "No active suppliers found."
      : `Top supplier by on-time delivery is ${best.name} at ${best.onTimeRate}% on-time rate. ` +
        `Average across ${suppliers.length} active supplier(s): ${avg}%.`;

  return { tool: "best_suppliers", data: { suppliers: top }, summary };
}

export async function queryProductCapacity(): Promise<ProductCapacityResult> {
  const [total, active, inactive, prototype, activeProducts] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "INACTIVE" } }),
    prisma.product.count({ where: { status: "PROTOTYPE" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, code: true, status: true, primaryMaterial: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const summary =
    total === 0
      ? "No products found in the system."
      : `There are ${total} products in the catalog. ${active} are active and can be produced, ` +
        `${prototype} in prototype stage, and ${inactive} inactive.`;

  return {
    tool: "product_capacity",
    data: {
      total,
      active,
      inactive,
      prototype,
      activeProducts: activeProducts.map((p) => ({
        name: p.name,
        code: p.code,
        status: "Active",
        primaryMaterial: p.primaryMaterial,
      })),
    },
    summary,
  };
}
