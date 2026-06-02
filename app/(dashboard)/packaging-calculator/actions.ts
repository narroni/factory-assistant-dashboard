"use server";

import { prisma } from "../../lib/prisma";
import { calculatePackaging, type PackagingResult } from "../../lib/packaging-calculator";

export type BladeProductSummary = {
  articleCode: string;
  productName: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  tpi: number;
  color: string;
  pcsPerCrate: number;
  crateCode: string;
  maxCratesPerTower: number;
};

export type ContainerSummary = {
  name: string;
  lengthMeters: number;
  widthMeters: number;
  maxVolumeM3: number;
  maxPayloadKg: number;
};

export async function getPackagingOptions(): Promise<{
  products: BladeProductSummary[];
  containers: ContainerSummary[];
}> {
  const [products, containers] = await Promise.all([
    prisma.bladeProductSpec.findMany({
      orderBy: { articleCode: "asc" },
      include: { crateType: true },
    }),
    prisma.containerType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    products: products.map((p) => ({
      articleCode: p.articleCode,
      productName: p.productName,
      lengthMm: p.lengthMm,
      widthMm: p.widthMm,
      thicknessMm: p.thicknessMm,
      tpi: p.tpi,
      color: p.color,
      pcsPerCrate: p.pcsPerCrate,
      crateCode: p.crateType.code,
      maxCratesPerTower: p.maxCratesPerTower,
    })),
    containers: containers.map((c) => ({
      name: c.name,
      lengthMeters: c.lengthMeters,
      widthMeters: c.widthMeters,
      maxVolumeM3: c.maxVolumeM3,
      maxPayloadKg: c.maxPayloadKg,
    })),
  };
}

export async function runPackagingCalculation(
  articleCode: string,
  qty: number,
  containerName: string,
): Promise<PackagingResult> {
  if (!articleCode || qty <= 0 || !containerName) {
    throw new Error("Invalid input");
  }
  const result = await calculatePackaging({ articleCode, qty, containerName });

  // Save to history
  await prisma.packagingCalculation.create({
    data: {
      articleCode: result.articleCode,
      productName: result.productName,
      qty: result.qty,
      containerName: result.containerName,
      requiredCrates: result.requiredCratesExact,
      fullCrates: result.fullCrates,
      towers: result.towers,
      netWeightKg: result.netWeightKg,
      crateWeightKg: result.crateWeightKg,
      totalWeightKg: result.totalShipmentWeightKg,
      footprintM2: result.totalFootprintM2,
      volumeM3: result.totalVolumeM3,
      weightFits: result.weightFits,
      areaFits: result.areaFits,
      volumeFits: result.volumeFits,
      overallFits: result.overallFits,
      limitingFactors: result.limitingFactors.join(", ") || null,
      maxPiecesFit: result.maxPiecesFit,
    },
  });

  return result;
}
