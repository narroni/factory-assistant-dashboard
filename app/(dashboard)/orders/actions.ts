"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin, requireCanChangeStatus } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";

export type OrderStatus = "Pending" | "In Production" | "Completed" | "Delayed" | "Cancelled";

export type OrderLineData = {
  id?: string;
  bladeProductId: string;
  articleCode: string;
  productName: string;
  qty: number;
};

export type OrderLineCalc = OrderLineData & {
  cratesRequired: number;
  towersRequired: number;
  netWeightKg: number;
  rawWeightKg: number;
  crateWeightKg: number;
  totalWeightKg: number;
  footprintM2: number;
  volumeM3: number;
};

export type OrderTotals = {
  totalPcs: number;
  totalCrates: number;
  totalTowers: number;
  totalRawWeightKg: number;
  totalNetWeightKg: number;
  totalCrateWeightKg: number;
  totalShipmentWeightKg: number;
  totalFootprintM2: number;
  totalVolumeM3: number;
  fits20ft: boolean;
  fits40ft: boolean;
  limitingFactor20ft: string[];
  limitingFactor40ft: string[];
};

export type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  customerId: string | null;
  status: OrderStatus;
  dueDate: string;
  value: number;
  // legacy single-product fields (for backward compat)
  product: string;
  productCode: string;
  qty: number;
  // new multi-line
  lines: OrderLineData[];
};

const statusToDb = {
  Pending: "PENDING",
  "In Production": "IN_PRODUCTION",
  Completed: "COMPLETED",
  Delayed: "DELAYED",
  Cancelled: "CANCELLED",
} as const;

const statusFromDb = {
  PENDING: "Pending",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
} as const;

function formatDate(d: Date) { return d.toISOString().split("T")[0]; }
function parseDate(s: string) { return new Date(`${s}T00:00:00Z`); }

function mapOrder(o: {
  id: string; orderNumber: string; customer: string; customerId: string | null;
  productName: string; productCode: string; qty: number;
  status: string; dueDate: Date; valueEur: number;
  lines: { id: string; bladeProductId: string; articleCode: string; productName: string; qty: number }[];
}): Order {
  return {
    id: o.id, orderNumber: o.orderNumber, customer: o.customer, customerId: o.customerId,
    product: o.productName, productCode: o.productCode, qty: o.qty,
    status: statusFromDb[o.status as keyof typeof statusFromDb],
    dueDate: formatDate(o.dueDate),
    value: o.valueEur,
    lines: o.lines.map((l) => ({
      id: l.id, bladeProductId: l.bladeProductId,
      articleCode: l.articleCode, productName: l.productName, qty: l.qty,
    })),
  };
}

export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map(mapOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const o = await prisma.order.findUnique({
    where: { id },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });
  return o ? mapOrder(o) : null;
}

export async function addOrder(data: {
  customer: string; customerId?: string | null;
  product: string; productCode: string; qty: number;
  status: OrderStatus; dueDate: string; value: number;
  lines: Omit<OrderLineData, "id">[];
}): Promise<Order | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }

  const dbOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}`,
      customer: data.customer,
      customerId: data.customerId ?? null,
      productName: data.product,
      productCode: data.productCode,
      qty: data.qty,
      status: statusToDb[data.status],
      dueDate: parseDate(data.dueDate),
      valueEur: data.value,
      lines: data.lines.length > 0
        ? { create: data.lines.map((l) => ({ bladeProductId: l.bladeProductId, articleCode: l.articleCode, productName: l.productName, qty: l.qty })) }
        : undefined,
    },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });

  await logAuditEvent("Order", dbOrder.id, "CREATE", undefined, {
    orderNumber: dbOrder.orderNumber, customer: dbOrder.customer,
    lines: data.lines.length, qty: dbOrder.qty,
  });
  return mapOrder(dbOrder);
}

export async function updateOrder(id: string, data: {
  customer: string; customerId?: string | null;
  product: string; productCode: string; qty: number;
  status: OrderStatus; dueDate: string; value: number;
  lines: Omit<OrderLineData, "id">[];
}): Promise<Order | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const before = await prisma.order.findUnique({ where: { id } });

  // Replace order lines atomically
  await prisma.orderLine.deleteMany({ where: { orderId: id } });
  const dbOrder = await prisma.order.update({
    where: { id },
    data: {
      customer: data.customer,
      customerId: data.customerId ?? null,
      productName: data.product,
      productCode: data.productCode,
      qty: data.qty,
      status: statusToDb[data.status],
      dueDate: parseDate(data.dueDate),
      valueEur: data.value,
      lines: data.lines.length > 0
        ? { create: data.lines.map((l) => ({ bladeProductId: l.bladeProductId, articleCode: l.articleCode, productName: l.productName, qty: l.qty })) }
        : undefined,
    },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });

  if (before) {
    await logAuditEvent("Order", id, "UPDATE",
      { customer: before.customer, status: statusFromDb[before.status as keyof typeof statusFromDb] },
      { customer: dbOrder.customer, status: statusFromDb[dbOrder.status as keyof typeof statusFromDb] }
    );
  }
  return mapOrder(dbOrder);
}

export async function deleteOrder(id: string): Promise<{ error: string } | void> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const before = await prisma.order.findUnique({ where: { id } });
  await prisma.order.delete({ where: { id } });
  if (before) {
    await logAuditEvent("Order", id, "DELETE", {
      customer: before.customer, product: before.productName,
    });
  }
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<Order | { error: string }> {
  try {
    await requireCanChangeStatus("order");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const before = await prisma.order.findUnique({ where: { id } });
  const dbOrder = await prisma.order.update({
    where: { id },
    data: { status: statusToDb[status] },
    include: { lines: { orderBy: { createdAt: "asc" } } },
  });
  if (before) {
    await logAuditEvent("Order", id, "UPDATE",
      { status: statusFromDb[before.status as keyof typeof statusFromDb] },
      { status }
    );
  }
  return mapOrder(dbOrder);
}

// ── Packaging calculation for order lines ─────────────────────────────────────

export async function calculateOrderLines(
  lines: { articleCode: string; qty: number }[],
): Promise<{ lineCalcs: OrderLineCalc[]; totals: OrderTotals }> {
  const bladeProducts = await prisma.bladeProductSpec.findMany({
    where: { articleCode: { in: lines.map((l) => l.articleCode) } },
    include: { crateType: true },
  });
  const bpMap = Object.fromEntries(bladeProducts.map((p) => [p.articleCode, p]));

  const lineCalcs: OrderLineCalc[] = [];

  for (const line of lines) {
    const bp = bpMap[line.articleCode];
    if (!bp) continue;

    const crate = bp.crateType;
    const fullCrates = Math.ceil(line.qty / bp.pcsPerCrate);
    const towers = Math.ceil(fullCrates / bp.maxCratesPerTower);
    const netWeightKg = line.qty * bp.weightAfterPunchingKg;
    const rawWeightKg = line.qty * bp.weightBeforePunchingKg;
    const crateWeightKg = fullCrates * crate.emptyWeightKg;
    const totalWeightKg = netWeightKg + crateWeightKg;
    const towerFootprintM2 = crate.xMeters * crate.zMeters;
    const footprintM2 = towers * towerFootprintM2;
    const volumeM3 = fullCrates * crate.xMeters * crate.yMeters * crate.zMeters;

    lineCalcs.push({
      bladeProductId: bp.id,
      articleCode: line.articleCode,
      productName: bp.productName,
      qty: line.qty,
      cratesRequired: fullCrates,
      towersRequired: towers,
      netWeightKg,
      rawWeightKg,
      crateWeightKg,
      totalWeightKg,
      footprintM2,
      volumeM3,
    });
  }

  // Aggregate totals
  const totalPcs = lineCalcs.reduce((s, l) => s + l.qty, 0);
  const totalCrates = lineCalcs.reduce((s, l) => s + l.cratesRequired, 0);
  const totalTowers = lineCalcs.reduce((s, l) => s + l.towersRequired, 0);
  const totalRawWeightKg = lineCalcs.reduce((s, l) => s + l.rawWeightKg, 0);
  const totalNetWeightKg = lineCalcs.reduce((s, l) => s + l.netWeightKg, 0);
  const totalCrateWeightKg = lineCalcs.reduce((s, l) => s + l.crateWeightKg, 0);
  const totalShipmentWeightKg = totalNetWeightKg + totalCrateWeightKg;
  const totalFootprintM2 = lineCalcs.reduce((s, l) => s + l.footprintM2, 0);
  const totalVolumeM3 = lineCalcs.reduce((s, l) => s + l.volumeM3, 0);

  async function checkContainer(name: string) {
    const c = await prisma.containerType.findUnique({ where: { name } });
    if (!c) return { fits: false, factors: ["container not found"] };
    const floorArea = c.lengthMeters * c.widthMeters;
    const factors: string[] = [];
    if (totalShipmentWeightKg > c.maxPayloadKg) factors.push("weight");
    if (totalFootprintM2 > floorArea) factors.push("floor area");
    if (totalVolumeM3 > c.maxVolumeM3) factors.push("volume");
    return { fits: factors.length === 0, factors };
  }

  const [r20, r40] = await Promise.all([checkContainer("20ft"), checkContainer("40ft")]);

  return {
    lineCalcs,
    totals: {
      totalPcs, totalCrates, totalTowers,
      totalRawWeightKg, totalNetWeightKg, totalCrateWeightKg, totalShipmentWeightKg,
      totalFootprintM2, totalVolumeM3,
      fits20ft: r20.fits,
      fits40ft: r40.fits,
      limitingFactor20ft: r20.factors,
      limitingFactor40ft: r40.factors,
    },
  };
}

// ── Customer lookup ───────────────────────────────────────────────────────────

export async function getCustomerOptions(): Promise<{ id: string; name: string }[]> {
  const rows = await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return rows;
}

// ── Blade product lookup ──────────────────────────────────────────────────────

export async function getBladeProductOptions(): Promise<{
  id: string; articleCode: string; productName: string; pcsPerCrate: number;
}[]> {
  const rows = await prisma.bladeProductSpec.findMany({
    orderBy: { articleCode: "asc" },
    select: { id: true, articleCode: true, productName: true, pcsPerCrate: true },
  });
  return rows;
}
