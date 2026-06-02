import { prisma } from "./prisma";
import * as XLSX from "xlsx";
import { normalizeActionType } from "./action-types";

export type ActionExecutionRequest = {
  requestId: string;
  actionType: string;
  payload: Record<string, unknown>;
  userId: string;
};

export type ExecutionResult = {
  success: boolean;
  executedActionId?: string;
  outputType?: string;
  outputFile?: string;
  outputContent?: string;
  error?: string;
};

export async function executeAction(req: ActionExecutionRequest): Promise<ExecutionResult> {
  // Normalize the action type before execution (handles lowercase/alias from LLM)
  const normalized = normalizeActionType(req.actionType);
  if (!normalized) {
    const supported = ["GENERATE_REPORT", "GENERATE_XLSX", "GENERATE_CSV", "GENERATE_PDF", "CREATE_PURCHASE_ORDER", "CREATE_PRODUCTION_PLAN", "INVENTORY_RECOMMENDATION"];
    return { success: false, error: `Unsupported action type: "${req.actionType}". Supported: ${supported.join(", ")}` };
  }
  const normalizedReq = { ...req, actionType: normalized };

  try {
    switch (normalized) {
      case "GENERATE_REPORT":
      case "GENERATE_XLSX":
      case "GENERATE_CSV":
      case "GENERATE_PDF":
        return await generateReport(normalizedReq);
      case "CREATE_PURCHASE_ORDER":
        return await createPurchaseOrder(normalizedReq);
      case "CREATE_PRODUCTION_PLAN":
        return await createProductionPlan(normalizedReq);
      case "INVENTORY_RECOMMENDATION":
        return await inventoryRecommendation(normalizedReq);
      default:
        return { success: false, error: "Unknown action type" };
    }
  } catch (err) {
    console.error(`[executor] ${normalized} failed:`, err);
    return { success: false, error: String(err) };
  }
}

// ── Report Generation ─────────────────────────────────────────────────────────

async function generateReport(req: ActionExecutionRequest): Promise<ExecutionResult> {
  const reportType = (req.payload.reportType as string) || "inventory";
  const startDate = (req.payload.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = (req.payload.endDate as string) || new Date().toISOString();

  let reportData: Record<string, unknown>[] = [];

  if (reportType === "inventory") {
    const materials = await prisma.material.findMany({
      select: { code: true, name: true, category: true, quantity: true, unit: true, status: true },
      take: 100,
    });
    reportData = materials;
  } else if (reportType === "orders") {
    const orders = await prisma.order.findMany({
      where: {
        customerId: { not: null },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { orderNumber: true, customer: true, productName: true, qty: true, status: true, dueDate: true, valueEur: true },
      take: 100,
    });
    reportData = orders;
  } else if (reportType === "suppliers") {
    const suppliers = await prisma.supplier.findMany({
      select: { code: true, name: true, contact: true, email: true, status: true, onTimeRate: true },
      take: 100,
    });
    reportData = suppliers;
  }

  const ws = XLSX.utils.json_to_sheet(reportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  const filename = `report_${reportType}_${Date.now()}.xlsx`;
  const outputContent = XLSX.write(wb, { type: "base64" });

  const executed = await prisma.executedAction.create({
    data: {
      requestId: req.requestId,
      actionType: req.actionType,
      outputType: "xlsx",
      outputFile: filename,
      outputContent: outputContent,
      executedBy: req.userId,
      metadata: {
        reportType,
        startDate,
        endDate,
        rowCount: reportData.length,
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  await logAuditAction("OUTPUT_GENERATED", req.userId, req.requestId, "xlsx");

  return {
    success: true,
    executedActionId: executed.id,
    outputType: "xlsx",
    outputFile: filename,
  };
}

// ── Purchase Order Creation ───────────────────────────────────────────────────

async function createPurchaseOrder(req: ActionExecutionRequest): Promise<ExecutionResult> {
  const supplierId = req.payload.supplierId as string;
  const materials = (req.payload.materials as Array<{ id: string; quantity: number }>) || [];

  if (!supplierId || materials.length === 0) {
    return { success: false, error: "Missing supplierId or materials" };
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return { success: false, error: "Supplier not found" };
  }

  const materialDetails = await prisma.material.findMany({
    where: { id: { in: materials.map((m) => m.id) } },
  });

  const docLines = materials
    .map((m) => {
      const mat = materialDetails.find((d) => d.id === m.id);
      return mat ? `${mat.code} | ${mat.name} | ${m.quantity} ${mat.unit}` : null;
    })
    .filter(Boolean);

  const content = [
    "PURCHASE ORDER",
    "",
    `Date: ${new Date().toISOString().split("T")[0]}`,
    `PO Number: PO-${Date.now()}`,
    "",
    "SUPPLIER INFORMATION",
    `Name: ${supplier.name}`,
    `Contact: ${supplier.contact}`,
    `Email: ${supplier.email}`,
    "",
    "MATERIALS",
    ...docLines,
    "",
    "Notes: This is an AI-generated purchase order draft. Manual review required before sending to supplier.",
  ].join("\n");

  const filename = `po_${Date.now()}.txt`;

  const executed = await prisma.executedAction.create({
    data: {
      requestId: req.requestId,
      actionType: req.actionType,
      outputType: "text",
      outputFile: filename,
      outputContent: content,
      executedBy: req.userId,
      metadata: {
        supplierId,
        materialCount: materials.length,
        createdDate: new Date().toISOString(),
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  await logAuditAction("OUTPUT_GENERATED", req.userId, req.requestId, "text");

  return {
    success: true,
    executedActionId: executed.id,
    outputType: "text",
    outputFile: filename,
    outputContent: content,
  };
}

// ── Production Plan Creation ──────────────────────────────────────────────────

async function createProductionPlan(req: ActionExecutionRequest): Promise<ExecutionResult> {
  const products = (req.payload.products as Array<{ id: string; quantity: number; durationDays?: number }>) || [];

  if (products.length === 0) {
    return { success: false, error: "No products specified" };
  }

  const productDetails = await prisma.bladeProductSpec.findMany({
    where: { articleCode: { in: products.map((p) => p.id as string) } },
  });

  const planLines = [
    "PRODUCTION PLAN",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "PRODUCTS TO PRODUCE",
  ];

  let totalDuration = 0;
  for (const p of products) {
    const prod = productDetails.find((d) => d.articleCode === (p.id as string));
    if (prod) {
      const duration = (p.durationDays as number) || 1;
      totalDuration += duration;
      planLines.push(`- ${prod.articleCode}: ${prod.productName} | Qty: ${p.quantity} | Est. Duration: ${duration} days`);
    }
  }

  planLines.push("");
  planLines.push(`Total Estimated Duration: ${totalDuration} days`);
  planLines.push("");
  planLines.push("MATERIALS REQUIRED");

  const allMaterials = await prisma.productMaterialRequirement.findMany({
    where: { productId: { in: productDetails.map((p) => p.id) } },
    include: { material: true },
  });

  const materialMap: Record<string, number> = {};
  for (const req of allMaterials) {
    if (req.material) {
      const key = `${req.material.code}|${req.material.name}|${req.qtyUnit}`;
      materialMap[key] = (materialMap[key] || 0) + req.qtyValue;
    }
  }

  for (const [key, qty] of Object.entries(materialMap)) {
    planLines.push(`- ${key}: ${qty}`);
  }

  planLines.push("");
  planLines.push("Notes: This is an AI-generated production plan. Requires manual verification and approval.");

  const content = planLines.join("\n");
  const filename = `prod_plan_${Date.now()}.txt`;

  const executed = await prisma.executedAction.create({
    data: {
      requestId: req.requestId,
      actionType: req.actionType,
      outputType: "text",
      outputFile: filename,
      outputContent: content,
      executedBy: req.userId,
      metadata: {
        productCount: products.length,
        totalDuration,
        createdDate: new Date().toISOString(),
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  await logAuditAction("OUTPUT_GENERATED", req.userId, req.requestId, "text");

  return {
    success: true,
    executedActionId: executed.id,
    outputType: "text",
    outputFile: filename,
    outputContent: content,
  };
}

// ── Inventory Recommendation ──────────────────────────────────────────────────

async function inventoryRecommendation(req: ActionExecutionRequest): Promise<ExecutionResult> {
  const lowStockMaterials = await prisma.material.findMany({
    where: { status: "LOW_STOCK" },
    select: { code: true, name: true, quantity: true, unit: true },
    take: 50,
  });

  const outOfStockMaterials = await prisma.material.findMany({
    where: { status: "OUT_OF_STOCK" },
    select: { code: true, name: true, quantity: true, unit: true },
    take: 50,
  });

  const lines = [
    "INVENTORY RECOMMENDATION REPORT",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "CRITICAL ITEMS (OUT OF STOCK)",
  ];

  if (outOfStockMaterials.length === 0) {
    lines.push("No out-of-stock items. Inventory is healthy.");
  } else {
    for (const m of outOfStockMaterials) {
      lines.push(`- ${m.code}: ${m.name} (Currently ${m.quantity} ${m.unit})`);
    }
  }

  lines.push("");
  lines.push("LOW STOCK ITEMS (REORDER RECOMMENDED)");

  if (lowStockMaterials.length === 0) {
    lines.push("No low-stock items at this time.");
  } else {
    for (const m of lowStockMaterials) {
      const recommendedQty = Math.ceil((100 - m.quantity) / 10) * 10;
      lines.push(`- ${m.code}: ${m.name} | Current: ${m.quantity} ${m.unit} | Recommended reorder: ${recommendedQty} ${m.unit}`);
    }
  }

  lines.push("");
  lines.push("SUMMARY");
  lines.push(`Total out-of-stock items: ${outOfStockMaterials.length}`);
  lines.push(`Total low-stock items: ${lowStockMaterials.length}`);
  lines.push("");
  lines.push("RECOMMENDED ACTIONS");
  lines.push("1. Prioritize reordering out-of-stock items immediately");
  lines.push("2. Place orders for low-stock items based on production schedule");
  lines.push("3. Review supplier lead times to optimize reorder points");

  const content = lines.join("\n");
  const filename = `inventory_rec_${Date.now()}.txt`;

  const executed = await prisma.executedAction.create({
    data: {
      requestId: req.requestId,
      actionType: req.actionType,
      outputType: "text",
      outputFile: filename,
      outputContent: content,
      executedBy: req.userId,
      metadata: {
        outOfStockCount: outOfStockMaterials.length,
        lowStockCount: lowStockMaterials.length,
        createdDate: new Date().toISOString(),
      } as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  await logAuditAction("OUTPUT_GENERATED", req.userId, req.requestId, "text");

  return {
    success: true,
    executedActionId: executed.id,
    outputType: "text",
    outputFile: filename,
    outputContent: content,
  };
}

// ── Audit Logging ─────────────────────────────────────────────────────────────

async function logAuditAction(action: string, userId: string, requestId: string, outputType: string) {
  try {
    await prisma.auditLog.create({
      data: {
        entity: "ExecutedAction",
        entityId: requestId,
        action: "CREATE",
        userId,
        after: JSON.stringify({ action, outputType, timestamp: new Date().toISOString() }) as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[executor] audit log failed:", err);
  }
}
