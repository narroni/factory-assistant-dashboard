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
      icon: "📦",
      accentBorder: "border-blue-700 bg-blue-800/30",
      badge: "bg-blue-700 text-blue-300",
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
    const products = await prisma.product.findMany({
      include: {
        materialRequirements: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = products.map((p) => [
      p.name,
      p.code,
      `${p.lengthMm} × ${p.widthMm} × ${p.thicknessMm} mm`,
      `${(p.weightKg ?? 0).toFixed(2)} kg`,
      `${(p.volumeM3 ?? 0).toFixed(3)} m³`,
      p.materialRequirements.length > 0
        ? p.materialRequirements.map((mr) => mr.name).join(", ")
        : "—",
      p.status,
    ]);

    return {
      id: "products",
      title: "Products Report",
      description: "Bill of materials, dimensions, and product specifications.",
      lastGenerated: todayString(),
      frequency: "Weekly",
      icon: "🏭",
      accentBorder: "border-emerald-700 bg-emerald-800/30",
      badge: "bg-emerald-700 text-emerald-300",
      filename: "products-report",
      headers: ["Product", "Code", "Dimensions (mm)", "Weight (kg)", "Volume (m³)", "Materials", "Status"],
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
      icon: "📋",
      accentBorder: "border-amber-700 bg-amber-800/30",
      badge: "bg-amber-700 text-amber-300",
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
      icon: "🚛",
      accentBorder: "border-purple-700 bg-purple-800/30",
      badge: "bg-purple-700 text-purple-300",
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
    const products = await prisma.product.findMany({
      include: {
        materialRequirements: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = products.map((p) => {
      // Calculate minimum capacity: min(available_qty / required_qty_per_unit) across all required materials
      let minCapacity = Infinity;

      if (p.materialRequirements.length > 0) {
        for (const mr of p.materialRequirements) {
          if (mr.material) {
            const available = mr.material.quantity;
            const required = mr.qtyValue;
            if (required > 0) {
              const capacity = available / required;
              minCapacity = Math.min(minCapacity, capacity);
            }
          }
        }
      }

      const capacityUnits = Math.floor(minCapacity === Infinity ? 0 : minCapacity);
      const capacityPercent = p.materialRequirements.length > 0 && minCapacity !== Infinity
        ? Math.min(99, Math.round((minCapacity / 10) * 100))
        : 0;

      return [
        p.name,
        p.code,
        `${capacityUnits} units`,
        `${capacityPercent}%`,
        capacityPercent > 80 ? "Running" : capacityPercent > 50 ? "Maintenance" : "Limited",
        "2-shift",
      ];
    });

    return {
      id: "capacity",
      title: "Production Capacity Report",
      description: "Production line utilization, throughput rates, and capacity percentages per line.",
      lastGenerated: todayString(),
      frequency: "Weekly",
      icon: "🏭",
      accentBorder: "border-zinc-700 bg-zinc-800/30",
      badge: "bg-zinc-700 text-zinc-300",
      filename: "production-capacity-report",
      headers: ["Product", "Code", "Capacity / Month", "Capacity Util.", "Status", "Shift"],
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
