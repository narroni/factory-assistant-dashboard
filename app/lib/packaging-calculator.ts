import { prisma } from "./prisma";

export type PackagingInput = {
  articleCode: string;
  qty: number;
  containerName: string;
};

export type PackagingResult = {
  // inputs
  articleCode: string;
  qty: number;
  containerName: string;

  // product info
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
  maxCratesPerTower: number;

  // crate info
  crateCode: string;
  crateDescription: string;
  crateEmptyWeightKg: number;
  crateXm: number;
  crateYm: number;
  crateZm: number;

  // container info
  containerLengthM: number;
  containerWidthM: number;
  containerFloorAreaM2: number;
  containerMaxPayloadKg: number;
  containerMaxVolumeM3: number;

  // crate calculations
  requiredCratesExact: number;   // qty / pcsPerCrate (float)
  fullCrates: number;            // ceil
  partialCrate: number;          // fractional remainder 0-1
  towers: number;                // ceil(fullCrates / maxCratesPerTower)

  // weight calculations
  netWeightKg: number;           // qty * weightAfterPunchingKg
  rawWeightKg: number;           // qty * weightBeforePunchingKg
  crateWeightKg: number;         // fullCrates * crateEmptyWeightKg
  totalShipmentWeightKg: number; // netWeightKg + crateWeightKg

  // footprint calculations (X * Z as per user specification)
  towerFootprintM2: number;      // crate.x * crate.z
  totalFootprintM2: number;      // towers * towerFootprintM2

  // volume calculations
  volumePerCrateM3: number;      // crate.x * crate.y * crate.z
  totalVolumeM3: number;         // fullCrates * volumePerCrateM3

  // fit results
  weightFits: boolean;
  areaFits: boolean;
  volumeFits: boolean;
  overallFits: boolean;
  limitingFactors: string[];

  // max pieces suggestions
  maxByWeight: number;
  maxByArea: number;
  maxByVolume: number;
  maxPiecesFit: number;
};

export async function calculatePackaging(input: PackagingInput): Promise<PackagingResult> {
  const { articleCode, qty, containerName } = input;

  const [product, container] = await Promise.all([
    prisma.bladeProductSpec.findUnique({
      where: { articleCode },
      include: { crateType: true },
    }),
    prisma.containerType.findUnique({ where: { name: containerName } }),
  ]);

  if (!product) throw new Error(`Product not found: ${articleCode}`);
  if (!container) throw new Error(`Container not found: ${containerName}`);

  const crate = product.crateType;

  // Crate calculations
  const requiredCratesExact = qty / product.pcsPerCrate;
  const fullCrates = Math.ceil(requiredCratesExact);
  const partialCrate = requiredCratesExact % 1;
  const towers = Math.ceil(fullCrates / product.maxCratesPerTower);

  // Weight
  const netWeightKg = qty * product.weightAfterPunchingKg;
  const rawWeightKg = qty * product.weightBeforePunchingKg;
  const crateWeightKg = fullCrates * crate.emptyWeightKg;
  const totalShipmentWeightKg = netWeightKg + crateWeightKg;

  // Footprint: X * Z as specified
  const towerFootprintM2 = crate.xMeters * crate.zMeters;
  const totalFootprintM2 = towers * towerFootprintM2;
  const containerFloorAreaM2 = container.lengthMeters * container.widthMeters;

  // Volume
  const volumePerCrateM3 = crate.xMeters * crate.yMeters * crate.zMeters;
  const totalVolumeM3 = fullCrates * volumePerCrateM3;

  // Fit checks
  const weightFits = totalShipmentWeightKg <= container.maxPayloadKg;
  const areaFits = totalFootprintM2 <= containerFloorAreaM2;
  const volumeFits = totalVolumeM3 <= container.maxVolumeM3;
  const overallFits = weightFits && areaFits && volumeFits;

  const limitingFactors: string[] = [];
  if (!weightFits) limitingFactors.push("weight");
  if (!areaFits) limitingFactors.push("floor area");
  if (!volumeFits) limitingFactors.push("volume");

  // Max pieces by each constraint
  // weight: qty * weightAfter + ceil(qty/pcsPerCrate) * crateWeight <= maxPayload
  //         approx: qty * (weightAfter + crateWeight/pcsPerCrate) <= maxPayload
  const weightPerPieceInclCrate = product.weightAfterPunchingKg + crate.emptyWeightKg / product.pcsPerCrate;
  const maxByWeight = weightPerPieceInclCrate > 0
    ? Math.floor(container.maxPayloadKg / weightPerPieceInclCrate)
    : Infinity;

  // area: towers * towerFootprint <= containerFloorArea
  //       ceil(ceil(qty/pcsPerCrate) / maxCratesPerTower) * towerFootprint <= containerFloorArea
  //       approx: (qty/pcsPerCrate/maxCratesPerTower) * towerFootprint <= containerFloorArea
  const maxTowersByArea = towerFootprintM2 > 0
    ? Math.floor(containerFloorAreaM2 / towerFootprintM2)
    : Infinity;
  const maxByArea = maxTowersByArea * product.maxCratesPerTower * product.pcsPerCrate;

  // volume: fullCrates * volumePerCrate <= maxVolume
  const maxCratesByVolume = volumePerCrateM3 > 0
    ? Math.floor(container.maxVolumeM3 / volumePerCrateM3)
    : Infinity;
  const maxByVolume = maxCratesByVolume * product.pcsPerCrate;

  const maxPiecesFit = Math.min(maxByWeight, maxByArea, maxByVolume);

  return {
    articleCode,
    qty,
    containerName,
    productName: product.productName,
    lengthMm: product.lengthMm,
    widthMm: product.widthMm,
    thicknessMm: product.thicknessMm,
    tpi: product.tpi,
    punchedOn: product.punchedOn,
    holeDistance: product.holeDistance,
    holeSize: product.holeSize,
    color: product.color,
    weightBeforePunchingKg: product.weightBeforePunchingKg,
    weightAfterPunchingKg: product.weightAfterPunchingKg,
    pcsPerCrate: product.pcsPerCrate,
    maxCratesPerTower: product.maxCratesPerTower,
    crateCode: crate.code,
    crateDescription: crate.description,
    crateEmptyWeightKg: crate.emptyWeightKg,
    crateXm: crate.xMeters,
    crateYm: crate.yMeters,
    crateZm: crate.zMeters,
    containerLengthM: container.lengthMeters,
    containerWidthM: container.widthMeters,
    containerFloorAreaM2,
    containerMaxPayloadKg: container.maxPayloadKg,
    containerMaxVolumeM3: container.maxVolumeM3,
    requiredCratesExact,
    fullCrates,
    partialCrate,
    towers,
    netWeightKg,
    rawWeightKg,
    crateWeightKg,
    totalShipmentWeightKg,
    towerFootprintM2,
    totalFootprintM2,
    volumePerCrateM3,
    totalVolumeM3,
    weightFits,
    areaFits,
    volumeFits,
    overallFits,
    limitingFactors,
    maxByWeight,
    maxByArea,
    maxByVolume,
    maxPiecesFit,
  };
}

export function formatPackagingResultText(r: PackagingResult): string {
  const fit = r.overallFits ? "FITS" : "DOES NOT FIT";
  const lines = [
    `PACKAGING CALCULATION — ${r.articleCode} × ${r.qty.toLocaleString()} pcs → ${r.containerName} container`,
    `Result: ${fit}`,
    ``,
    `Crating:`,
    `  Crates needed: ${r.fullCrates} × ${r.crateCode} (${r.crateDescription})`,
    `  Partial last crate: ${(r.partialCrate * 100).toFixed(1)}%`,
    `  Towers: ${r.towers} (max ${r.maxCratesPerTower} crates/tower)`,
    ``,
    `Weight:`,
    `  Product net: ${r.netWeightKg.toFixed(1)} kg`,
    `  Crate tare: ${r.crateWeightKg.toFixed(1)} kg`,
    `  Total shipment: ${r.totalShipmentWeightKg.toFixed(1)} kg / ${r.containerMaxPayloadKg.toLocaleString()} kg limit — ${r.weightFits ? "OK" : "EXCEEDED"}`,
    ``,
    `Floor area:`,
    `  Tower footprint: ${r.towerFootprintM2.toFixed(2)} m² (${r.crateXm}m × ${r.crateZm}m)`,
    `  Total footprint: ${r.totalFootprintM2.toFixed(2)} m² / ${r.containerFloorAreaM2.toFixed(2)} m² available — ${r.areaFits ? "OK" : "EXCEEDED"}`,
    ``,
    `Volume:`,
    `  Per crate: ${r.volumePerCrateM3.toFixed(4)} m³`,
    `  Total: ${r.totalVolumeM3.toFixed(2)} m³ / ${r.containerMaxVolumeM3} m³ limit — ${r.volumeFits ? "OK" : "EXCEEDED"}`,
  ];

  if (!r.overallFits) {
    lines.push(``, `Limiting factors: ${r.limitingFactors.join(", ")}`);
    lines.push(``, `Suggestions:`);
    lines.push(`  Max pieces that fit in ${r.containerName}: ${r.maxPiecesFit.toLocaleString()}`);
    lines.push(`  → By weight limit: ${r.maxByWeight.toLocaleString()} pcs`);
    lines.push(`  → By floor area:   ${r.maxByArea.toLocaleString()} pcs`);
    lines.push(`  → By volume:       ${r.maxByVolume.toLocaleString()} pcs`);
    const otherContainer = r.containerName === "20ft" ? "40ft" : "20ft";
    lines.push(`  → Consider using a ${otherContainer} container or splitting into multiple shipments.`);
  } else {
    lines.push(``, `Max pieces for ${r.containerName}: ${r.maxPiecesFit.toLocaleString()}`);
  }

  return lines.join("\n");
}
