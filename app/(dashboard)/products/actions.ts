"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";
import { getSessionUser } from "../../lib/session";
import { revalidatePath } from "next/cache";

export type ProductStatus = "Active" | "Inactive";

export type BladeProduct = {
  id: string;
  articleCode: string;
  productName: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  tpi: number;
  punchedOn: string;
  holeDistance: string | null;
  holeSize: string | null;
  color: string;
  weightBeforePunchingKg: number;
  weightAfterPunchingKg: number;
  pcsPerCrate: number;
  crateTypeId: string;
  crateCode: string;
  maxCratesPerTower: number;
  status: ProductStatus;
};

export type BladeProductFormData = Omit<BladeProduct, "id" | "crateCode">;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(p: any): BladeProduct {
  return {
    id: p.id,
    articleCode: p.articleCode,
    productName: p.productName,
    lengthMm: p.lengthMm,
    widthMm: p.widthMm,
    thicknessMm: p.thicknessMm,
    tpi: p.tpi,
    punchedOn: p.punchedOn,
    holeDistance: p.holeDistance,
    holeSize: p.holeSize,
    color: p.color,
    weightBeforePunchingKg: p.weightBeforePunchingKg,
    weightAfterPunchingKg: p.weightAfterPunchingKg,
    pcsPerCrate: p.pcsPerCrate,
    crateTypeId: p.crateTypeId,
    crateCode: p.crateType.code,
    maxCratesPerTower: p.maxCratesPerTower,
    status: p.status === "INACTIVE" ? "Inactive" : "Active",
  };
}

export async function getBladeProducts(): Promise<BladeProduct[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  const rows = await prisma.bladeProductSpec.findMany({
    include: { crateType: true },
    orderBy: { articleCode: "asc" },
  });
  return rows.map(mapRow);
}

export async function getCrateTypes() {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  return prisma.crateType.findMany({ orderBy: { code: "asc" } });
}

export async function addBladeProduct(data: BladeProductFormData): Promise<BladeProduct | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const row = await prisma.bladeProductSpec.create({
    data: {
      articleCode: data.articleCode,
      productName: data.productName,
      lengthMm: data.lengthMm,
      widthMm: data.widthMm,
      thicknessMm: data.thicknessMm,
      tpi: data.tpi,
      punchedOn: data.punchedOn,
      holeDistance: data.holeDistance || null,
      holeSize: data.holeSize || null,
      color: data.color,
      weightBeforePunchingKg: data.weightBeforePunchingKg,
      weightAfterPunchingKg: data.weightAfterPunchingKg,
      pcsPerCrate: data.pcsPerCrate,
      crateTypeId: data.crateTypeId,
      maxCratesPerTower: data.maxCratesPerTower,
    },
    include: { crateType: true },
  });
  await logAuditEvent("BladeProduct", row.id, "CREATE", undefined, { articleCode: row.articleCode });
  revalidatePath("/products");
  return mapRow(row);
}

export async function updateBladeProduct(id: string, data: BladeProductFormData): Promise<BladeProduct | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const before = await prisma.bladeProductSpec.findUnique({ where: { id } });
  const row = await prisma.bladeProductSpec.update({
    where: { id },
    data: {
      articleCode: data.articleCode,
      productName: data.productName,
      lengthMm: data.lengthMm,
      widthMm: data.widthMm,
      thicknessMm: data.thicknessMm,
      tpi: data.tpi,
      punchedOn: data.punchedOn,
      holeDistance: data.holeDistance || null,
      holeSize: data.holeSize || null,
      color: data.color,
      weightBeforePunchingKg: data.weightBeforePunchingKg,
      weightAfterPunchingKg: data.weightAfterPunchingKg,
      pcsPerCrate: data.pcsPerCrate,
      crateTypeId: data.crateTypeId,
      maxCratesPerTower: data.maxCratesPerTower,
    },
    include: { crateType: true },
  });
  if (before) {
    await logAuditEvent("BladeProduct", id, "UPDATE",
      { articleCode: before.articleCode },
      { articleCode: row.articleCode }
    );
  }
  revalidatePath("/products");
  return mapRow(row);
}

export async function deleteBladeProduct(id: string): Promise<{ error: string } | void> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  const before = await prisma.bladeProductSpec.findUnique({ where: { id } });
  await prisma.bladeProductSpec.delete({ where: { id } });
  if (before) await logAuditEvent("BladeProduct", id, "DELETE", { articleCode: before.articleCode });
  revalidatePath("/products");
}

