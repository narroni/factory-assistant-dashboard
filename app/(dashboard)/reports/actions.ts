"use server";

import { prisma } from "../../lib/prisma";

export type Report = {
  id: string;
  title: string;
  description: string;
  lastGenerated: string;
  frequency: string;
  icon: string;
  accentBorder: string;
  badge: string;
  filename: string;
  headers: string[];
  rows: string[][];
};

// Helper: format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper: format lead time days to display string
function formatLeadTime(days: number): string {
  const weeks = Math.round(days / 7);
  if (weeks < 2) return `${days} days`;
  return `${weeks} weeks`;
}

// Helper: today's date for lastGenerated field
function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getInventoryReport(): Promise<Report> {
  try {
    const materials = await prisma.material.findMany({
      include: {
        suppliers: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = materials.map((m) => [
      m.name,
      m.code,
      `${m.quantity} ${m.unit}`,
      m.status,
      m.suppliers?.[0]?.supplier?.name ?? "—",
      m.category,
    ]);

    return {
      id: "inventory",
      title: "Inventory Report",
      description: "Stock levels, materials, and warehouse location overview.",
      lastGenerated: todayString(),
      frequency: "Daily",
      icon: "",
      accentBorder: "border-zinc-700 bg-zinc-900",
      badge: "bg-zinc-800 text-zinc-400",
      filename: "inventory-report",
      headers: ["Material", "Code", "Quantity", "Status", "Primary Supplier", "Category"],
      rows,
    };
  } catch (error) {
    console.error("Failed to generate inventory report:", error);
    throw new Error("Failed to generate inventory report");
  }
}

export async function getProductsReport(): Promise<Report> {
  try {
    const products = await prisma.bladeProductSpec.findMany({
      include: { crateType: true },
      orderBy: { articleCode: "asc" },
    });

    const rows = products.map((p) => [
      p.articleCode,
      p.productName,
      `${p.lengthMm.toLocaleString()} × ${p.widthMm} × ${p.thicknessMm} mm`,
      p.color,
      `${p.tpi} TPI`,
      p.holeDistance ?? "No holes",
      `${p.weightAfterPunchingKg.toFixed(4)} kg`,
      `${p.pcsPerCrate.toLocaleString()} pcs`,
      p.crateType.code,
    ]);

    return {
      id: "products",
      title: "Products Report",
      description: "Blade product specifications, weights, and crating data.",
      lastGenerated: todayString(),
      frequency: "Weekly",
      icon: "",
      accentBorder: "border-zinc-700 bg-zinc-900",
      badge: "bg-zinc-800 text-zinc-400",
      filename: "products-report",
      headers: ["Article Code", "Product Name", "Dimensions (mm)", "Color", "TPI", "Hole Pattern", "Weight/pc (kg)", "Pcs/Crate", "Crate"],
      rows,
    };
  } catch (error) {
    console.error("Failed to generate products report:", error);
    throw new Error("Failed to generate products report");
  }
}

export async function getOrdersReport(): Promise<Report> {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: { not: null } },
      orderBy: { createdAt: "asc" },
    });

    const rows = orders.map((o) => [
      o.id,
      o.customer,
      o.productName,
      o.qty.toLocaleString(),
      o.valueEur > 0 ? `€${o.valueEur.toLocaleString()}` : "—",
      formatDate(o.dueDate),
      o.status,
    ]);

    return {
      id: "orders",
      title: "Orders Report",
      description: "Customer orders, delivery schedules, and order values.",
      lastGenerated: todayString(),
      frequency: "Daily",
      icon: "",
      accentBorder: "border-zinc-700 bg-zinc-900",
      badge: "bg-zinc-800 text-zinc-400",
      filename: "orders-report",
      headers: ["Order No.", "Customer", "Product", "Qty", "Value", "Due Date", "Status"],
      rows,
    };
  } catch (error) {
    console.error("Failed to generate orders report:", error);
    throw new Error("Failed to generate orders report");
  }
}

export async function getSuppliersReport(): Promise<Report> {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = suppliers.map((s) => [
      s.name,
      s.country,
      s.contact,
      formatLeadTime(s.leadTimeDays),
      `${Math.round(s.onTimeRate)}%`,
      s.materials.length > 0 ? s.materials.map((sm) => sm.material.name).join(", ") : "—",
      s.status,
    ]);

    return {
      id: "suppliers",
      title: "Suppliers Report",
      description: "Supplier contacts, lead times, performance metrics, and materials.",
      lastGenerated: todayString(),
      frequency: "Weekly",
      icon: "",
      accentBorder: "border-zinc-700 bg-zinc-900",
      badge: "bg-zinc-800 text-zinc-400",
      filename: "suppliers-report",
      headers: ["Supplier", "Country", "Contact", "Lead Time", "On-Time %", "Materials Supplied", "Status"],
      rows,
    };
  } catch (error) {
    console.error("Failed to generate suppliers report:", error);
    throw new Error("Failed to generate suppliers report");
  }
}

export async function getProductionCapacityReport(): Promise<Report> {
  try {
    const products = await prisma.bladeProductSpec.findMany({
      include: { crateType: true },
      orderBy: { articleCode: "asc" },
    });

    const rows = products.map((p) => {
      // Capacity estimate: one tower = maxCratesPerTower crates, each crate has pcsPerCrate pieces
      const pcsPerTower = p.pcsPerCrate * p.maxCratesPerTower;
      return [
        p.articleCode,
        p.productName,
        `${p.pcsPerCrate.toLocaleString()} pcs/crate`,
        `${p.maxCratesPerTower} crates/tower (${pcsPerTower.toLocaleString()} pcs/tower)`,
        p.crateType.code,
        `${p.weightAfterPunchingKg.toFixed(4)} kg/pc`,
      ];
    });

    return {
      id: "capacity",
      title: "Production Capacity Report",
      description: "Crating capacity, pcs per crate, pcs per tower, and weight per piece.",
      lastGenerated: todayString(),
      frequency: "Weekly",
      icon: "",
      accentBorder: "border-zinc-700 bg-zinc-800/30",
      badge: "bg-zinc-700 text-zinc-300",
      filename: "production-capacity-report",
      headers: ["Article Code", "Product Name", "Pcs / Crate", "Tower Capacity", "Crate Type", "Weight / pc"],
      rows,
    };
  } catch (error) {
    console.error("Failed to generate production capacity report:", error);
    throw new Error("Failed to generate production capacity report");
  }
}

export async function getAllReports(): Promise<Report[]> {
  try {
    const [inventory, products, orders, suppliers, capacity] = await Promise.all([
      getInventoryReport(),
      getProductsReport(),
      getOrdersReport(),
      getSuppliersReport(),
      getProductionCapacityReport(),
    ]);

    return [inventory, products, orders, suppliers, capacity];
  } catch (error) {
    console.error("Failed to generate all reports:", error);
    throw new Error("Failed to generate reports");
  }
}
