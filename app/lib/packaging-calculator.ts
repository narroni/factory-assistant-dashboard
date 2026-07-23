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

  // crate info — independent crate data only (no product name in crate)
  crateCode: string;
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

  // Spec fields are not validated on write, so a zero is reachable and would
  // make every derived figure Infinity/NaN. Same guard as calculateMaxCapacity().
  if (!product.pcsPerCrate || product.pcsPerCrate <= 0) {
    throw new Error(`Invalid pcsPerCrate for ${articleCode}: ${product.pcsPerCrate}`);
  }
  if (!product.maxCratesPerTower || product.maxCratesPerTower <= 0) {
    throw new Error(`Invalid maxCratesPerTower for ${articleCode}: ${product.maxCratesPerTower}`);
  }

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
    `  Crates needed: ${r.fullCrates} × crate type ${r.crateCode}`,
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

// ── Max capacity ("how many X fit in a container?") ────────────────────────────

export type MaxCapacityInput = {
  articleCode: string;
  containerName: string;
};

export type MaxCapacityResult = {
  articleCode: string;
  productName: string;
  containerName: string;
  pcsPerCrate: number;
  maxCratesPerTower: number;
  crateCode: string;
  maxPieces: number;
  maxCrates: number;
  maxTowers: number;
  cratesFitByWeight: number;
  cratesFitByVolume: number;
  cratesFitByFootprint: number;
  limitingFactor: "weight" | "volume" | "footprint";
  weightUsedKg: number;
  maxPayloadKg: number;
  weightUsedPct: number;
  volumeUsedM3: number;
  maxVolumeM3: number;
  volumeUsedPct: number;
  footprintUsedM2: number;
  maxFootprintM2: number;
  footprintUsedPct: number;
};

export async function calculateMaxCapacity(input: MaxCapacityInput): Promise<MaxCapacityResult> {
  const { articleCode, containerName } = input;

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
  const maxFootprintM2 = container.lengthMeters * container.widthMeters;

  // Spec fields are not validated on write, so a zero here is reachable. Left
  // unguarded, every division below yields Infinity and the result is injected
  // into the AI prompt as an authoritative figure. Fail loudly instead — the
  // caller renders the message as a "could not compute" note.
  if (!product.pcsPerCrate || product.pcsPerCrate <= 0) {
    throw new Error(`Invalid pcsPerCrate for ${articleCode}`);
  }
  if (!product.maxCratesPerTower || product.maxCratesPerTower <= 0) {
    throw new Error(`Invalid maxCratesPerTower for ${articleCode}`);
  }

  // Per-crate figures
  const crateWeightKg = product.weightAfterPunchingKg * product.pcsPerCrate + crate.emptyWeightKg;
  const crateVolumeM3 = crate.xMeters * crate.yMeters * crate.zMeters;
  const towerFootprintM2 = crate.xMeters * crate.zMeters;
  // Footprint is shared by all crates stacked in a tower, so express it per-crate as an amortized share
  const crateFootprintM2 = towerFootprintM2 / product.maxCratesPerTower;

  if (!crateWeightKg || crateWeightKg <= 0) {
    throw new Error(`Invalid crate weight for ${articleCode}`);
  }
  if (!crateVolumeM3 || crateVolumeM3 <= 0) {
    throw new Error(`Invalid crate volume for ${articleCode}`);
  }
  if (!crateFootprintM2 || crateFootprintM2 <= 0) {
    throw new Error(`Invalid crate footprint for ${articleCode}`);
  }

  const cratesFitByWeight = Math.floor(container.maxPayloadKg / crateWeightKg);
  const cratesFitByVolume = Math.floor(container.maxVolumeM3 / crateVolumeM3);
  const cratesFitByFootprint = Math.floor(maxFootprintM2 / crateFootprintM2);

  const maxCrates = Math.min(cratesFitByWeight, cratesFitByVolume, cratesFitByFootprint);
  const maxPieces = maxCrates * product.pcsPerCrate;
  const maxTowers = Math.ceil(maxCrates / product.maxCratesPerTower);

  const limits: Array<{ factor: "weight" | "volume" | "footprint"; crates: number }> = [
    { factor: "weight", crates: cratesFitByWeight },
    { factor: "volume", crates: cratesFitByVolume },
    { factor: "footprint", crates: cratesFitByFootprint },
  ];
  const limitingFactor = limits.reduce((min, l) => (l.crates < min.crates ? l : min)).factor;

  const weightUsedKg = maxCrates * crateWeightKg;
  const volumeUsedM3 = maxCrates * crateVolumeM3;
  const footprintUsedM2 = maxTowers * towerFootprintM2;

  return {
    articleCode,
    productName: product.productName,
    containerName,
    pcsPerCrate: product.pcsPerCrate,
    maxCratesPerTower: product.maxCratesPerTower,
    crateCode: crate.code,
    maxPieces,
    maxCrates,
    maxTowers,
    cratesFitByWeight,
    cratesFitByVolume,
    cratesFitByFootprint,
    limitingFactor,
    weightUsedKg,
    maxPayloadKg: container.maxPayloadKg,
    weightUsedPct: container.maxPayloadKg > 0 ? (weightUsedKg / container.maxPayloadKg) * 100 : 0,
    volumeUsedM3,
    maxVolumeM3: container.maxVolumeM3,
    volumeUsedPct: container.maxVolumeM3 > 0 ? (volumeUsedM3 / container.maxVolumeM3) * 100 : 0,
    footprintUsedM2,
    maxFootprintM2,
    footprintUsedPct: maxFootprintM2 > 0 ? (footprintUsedM2 / maxFootprintM2) * 100 : 0,
  };
}

export function formatMaxCapacityResultText(r: MaxCapacityResult): string {
  return [
    `MAXIMUM CAPACITY CALCULATION — ${r.articleCode} → ${r.containerName} container`,
    `Product: ${r.productName}`,
    ``,
    `Maximum that fits:`,
    `  Pieces: ${r.maxPieces.toLocaleString()}`,
    `  Crates: ${r.maxCrates.toLocaleString()} × crate type ${r.crateCode} (${r.pcsPerCrate} pcs/crate)`,
    `  Towers: ${r.maxTowers.toLocaleString()} (max ${r.maxCratesPerTower} crates/tower)`,
    ``,
    `Limiting factor: ${r.limitingFactor}`,
    `  By weight:    ${r.cratesFitByWeight.toLocaleString()} crates`,
    `  By volume:    ${r.cratesFitByVolume.toLocaleString()} crates`,
    `  By footprint: ${r.cratesFitByFootprint.toLocaleString()} crates`,
    ``,
    `Utilization at max load:`,
    `  Weight:    ${r.weightUsedKg.toFixed(1)}kg / ${r.maxPayloadKg.toLocaleString()}kg (${r.weightUsedPct.toFixed(1)}%)`,
    `  Volume:    ${r.volumeUsedM3.toFixed(2)}m³ / ${r.maxVolumeM3}m³ (${r.volumeUsedPct.toFixed(1)}%)`,
    `  Footprint: ${r.footprintUsedM2.toFixed(2)}m² / ${r.maxFootprintM2.toFixed(2)}m² (${r.footprintUsedPct.toFixed(1)}%)`,
  ].join("\n");
}

// ── Multi-product container optimization ───────────────────────────────────────

export type OptimizationInput = {
  products: Array<{
    articleCode: string;
    quantity: number;
  }>;
  containerName?: string; // "20ft" or "40ft"; if omitted, the smallest container that fits is picked, defaulting to 40ft
};

export type OptimizationResult = {
  containerType: string;
  totalWeightKg: number;
  maxPayloadKg: number;
  weightUsedPct: number;
  totalVolumeM3: number;
  maxVolumeM3: number;
  volumeUsedPct: number;
  totalFootprintM2: number;
  maxFootprintM2: number;
  products: Array<{
    articleCode: string;
    productName: string;
    quantity: number;
    crates: number;
    towers: number;
    weightKg: number;
    footprintM2: number;
    volumeM3: number;
    error?: string; // set when the articleCode was not found; all numeric fields are 0
  }>;
  remainingWeightKg: number;
  remainingVolumeM3: number;
  remainingFootprintM2: number;
  fits: boolean;
  limitingFactor?: "weight" | "volume" | "footprint";
  suggestion?: string;
};

export async function optimizeContainerMix(input: OptimizationInput): Promise<OptimizationResult> {
  const { products: requested, containerName } = input;

  const specs = await prisma.bladeProductSpec.findMany({
    where: { articleCode: { in: requested.map((p) => p.articleCode) } },
    include: { crateType: true },
  });
  const specByCode = new Map(specs.map((s) => [s.articleCode, s]));

  const productResults: OptimizationResult["products"] = [];
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;
  let totalFootprintM2 = 0;

  for (const req of requested) {
    const spec = specByCode.get(req.articleCode);
    if (!spec) {
      productResults.push({
        articleCode: req.articleCode,
        productName: "",
        quantity: req.quantity,
        crates: 0,
        towers: 0,
        weightKg: 0,
        footprintM2: 0,
        volumeM3: 0,
        error: `Product not found: ${req.articleCode}`,
      });
      continue;
    }

    const crate = spec.crateType;

    // Guard the divisors per product. A bad spec must not silently poison the
    // combined totals with Infinity/NaN; report it against that product and
    // keep the rest of the mix computable.
    const crateVolumeM3 = crate.xMeters * crate.yMeters * crate.zMeters;
    const crateFootprintM2 = crate.xMeters * crate.zMeters;
    const invalid =
      !spec.pcsPerCrate || spec.pcsPerCrate <= 0
        ? `Invalid pcsPerCrate for ${req.articleCode}`
        : !spec.maxCratesPerTower || spec.maxCratesPerTower <= 0
          ? `Invalid maxCratesPerTower for ${req.articleCode}`
          : !crateVolumeM3 || crateVolumeM3 <= 0
            ? `Invalid crate volume for ${req.articleCode}`
            : !crateFootprintM2 || crateFootprintM2 <= 0
              ? `Invalid crate footprint for ${req.articleCode}`
              : null;

    if (invalid) {
      productResults.push({
        articleCode: req.articleCode,
        productName: spec.productName,
        quantity: req.quantity,
        crates: 0,
        towers: 0,
        weightKg: 0,
        footprintM2: 0,
        volumeM3: 0,
        error: invalid,
      });
      continue;
    }

    // Same math as calculatePackaging()
    const fullCrates = Math.ceil(req.quantity / spec.pcsPerCrate);
    const towers = Math.ceil(fullCrates / spec.maxCratesPerTower);
    const netWeightKg = req.quantity * spec.weightAfterPunchingKg;
    const crateWeightKg = fullCrates * crate.emptyWeightKg;
    const weightKg = netWeightKg + crateWeightKg;
    const footprintM2 = towers * crateFootprintM2;
    const volumeM3 = fullCrates * crateVolumeM3;

    totalWeightKg += weightKg;
    totalVolumeM3 += volumeM3;
    totalFootprintM2 += footprintM2;

    productResults.push({
      articleCode: spec.articleCode,
      productName: spec.productName,
      quantity: req.quantity,
      crates: fullCrates,
      towers,
      weightKg,
      footprintM2,
      volumeM3,
    });
  }

  // Container selection: prefer the named one, else the smallest that fits, else default to 40ft
  const allContainers = await prisma.containerType.findMany({ orderBy: { maxVolumeM3: "asc" } });
  if (allContainers.length === 0) throw new Error("No container types configured");

  let container = containerName
    ? allContainers.find((c) => c.name === containerName) ?? null
    : null;

  if (containerName && !container) throw new Error(`Container not found: ${containerName}`);

  if (!container) {
    container =
      allContainers.find((c) =>
        totalWeightKg <= c.maxPayloadKg &&
        totalVolumeM3 <= c.maxVolumeM3 &&
        totalFootprintM2 <= c.lengthMeters * c.widthMeters
      ) ??
      allContainers.find((c) => c.name === "40ft") ??
      allContainers[allContainers.length - 1];
  }

  const maxFootprintM2 = container.lengthMeters * container.widthMeters;
  const weightUsedPct = container.maxPayloadKg > 0 ? (totalWeightKg / container.maxPayloadKg) * 100 : 0;
  const volumeUsedPct = container.maxVolumeM3 > 0 ? (totalVolumeM3 / container.maxVolumeM3) * 100 : 0;
  const footprintUsedPct = maxFootprintM2 > 0 ? (totalFootprintM2 / maxFootprintM2) * 100 : 0;

  const remainingWeightKg = container.maxPayloadKg - totalWeightKg;
  const remainingVolumeM3 = container.maxVolumeM3 - totalVolumeM3;
  const remainingFootprintM2 = maxFootprintM2 - totalFootprintM2;

  const weightFits = totalWeightKg <= container.maxPayloadKg;
  const volumeFits = totalVolumeM3 <= container.maxVolumeM3;
  const footprintFits = totalFootprintM2 <= maxFootprintM2;
  const fits = weightFits && volumeFits && footprintFits;

  const notFound = productResults.filter((p) => p.error);
  const validProducts = productResults.filter((p) => !p.error && p.quantity > 0);

  let limitingFactor: "weight" | "volume" | "footprint" | undefined;
  let suggestion: string | undefined;

  if (!fits) {
    const overages: Array<{ factor: "weight" | "volume" | "footprint"; pct: number }> = [];
    if (!weightFits) overages.push({ factor: "weight", pct: weightUsedPct });
    if (!volumeFits) overages.push({ factor: "volume", pct: volumeUsedPct });
    if (!footprintFits) overages.push({ factor: "footprint", pct: footprintUsedPct });
    overages.sort((a, b) => b.pct - a.pct);
    limitingFactor = overages[0].factor;

    // Find the product contributing most to the limiting factor, to suggest reducing it
    let worstProduct: OptimizationResult["products"][number] | undefined;
    for (const p of validProducts) {
      const cmp = limitingFactor === "weight" ? p.weightKg : limitingFactor === "volume" ? p.volumeM3 : p.footprintM2;
      const worstCmp = worstProduct
        ? (limitingFactor === "weight" ? worstProduct.weightKg : limitingFactor === "volume" ? worstProduct.volumeM3 : worstProduct.footprintM2)
        : -Infinity;
      if (cmp > worstCmp) worstProduct = p;
    }

    if (limitingFactor === "weight") {
      const overageKg = totalWeightKg - container.maxPayloadKg;
      suggestion = `Weight limit exceeded by ${overageKg.toLocaleString(undefined, { maximumFractionDigits: 0 })}kg.`;
      if (worstProduct) {
        const perPieceKg = worstProduct.weightKg / worstProduct.quantity;
        const piecesToRemove = perPieceKg > 0 ? Math.ceil(overageKg / perPieceKg) : 0;
        suggestion += ` Try reducing ${worstProduct.articleCode} by ${piecesToRemove.toLocaleString()} pieces.`;
      }
    } else if (limitingFactor === "volume") {
      const overageM3 = totalVolumeM3 - container.maxVolumeM3;
      suggestion = `Volume limit exceeded by ${overageM3.toFixed(2)}m³.`;
      if (worstProduct) {
        const perPieceM3 = worstProduct.volumeM3 / worstProduct.quantity;
        const piecesToRemove = perPieceM3 > 0 ? Math.ceil(overageM3 / perPieceM3) : 0;
        suggestion += ` Try reducing ${worstProduct.articleCode} by ${piecesToRemove.toLocaleString()} pieces.`;
      }
    } else {
      const overageM2 = totalFootprintM2 - maxFootprintM2;
      suggestion = `Floor area limit exceeded by ${overageM2.toFixed(2)}m².`;
      if (worstProduct) {
        const perPieceM2 = worstProduct.footprintM2 / worstProduct.quantity;
        const piecesToRemove = perPieceM2 > 0 ? Math.ceil(overageM2 / perPieceM2) : 0;
        suggestion += ` Try reducing ${worstProduct.articleCode} by ${piecesToRemove.toLocaleString()} pieces.`;
      }
    }
  } else {
    const maxPct = Math.max(weightUsedPct, volumeUsedPct, footprintUsedPct);
    if (maxPct >= 85) {
      suggestion = `Container is ${weightUsedPct.toFixed(0)}% full by weight and ${volumeUsedPct.toFixed(0)}% full by volume — good utilization.`;
    } else {
      suggestion = `Fits comfortably (${weightUsedPct.toFixed(0)}% weight, ${volumeUsedPct.toFixed(0)}% volume). Roughly ${Math.max(0, remainingWeightKg).toLocaleString(undefined, { maximumFractionDigits: 0 })}kg of payload capacity remains — you could add more product.`;
    }
  }

  if (notFound.length > 0) {
    const note = `Note: ${notFound.map((p) => p.articleCode).join(", ")} not found in catalog and excluded from calculation.`;
    suggestion = suggestion ? `${suggestion} ${note}` : note;
  }

  return {
    containerType: container.name,
    totalWeightKg,
    maxPayloadKg: container.maxPayloadKg,
    weightUsedPct,
    totalVolumeM3,
    maxVolumeM3: container.maxVolumeM3,
    volumeUsedPct,
    totalFootprintM2,
    maxFootprintM2,
    products: productResults,
    remainingWeightKg,
    remainingVolumeM3,
    remainingFootprintM2,
    fits,
    limitingFactor,
    suggestion,
  };
}

export function formatOptimizationResultText(r: OptimizationResult): string {
  const lines = [
    `CONTAINER OPTIMIZATION RESULT`,
    `Container: ${r.containerType}`,
    `─────────────────────────────`,
    `Products:`,
  ];

  for (const p of r.products) {
    if (p.error) {
      lines.push(`  • ${p.articleCode}: ${p.error}`);
    } else {
      lines.push(
        `  • ${p.articleCode} ${p.productName}: ${p.quantity.toLocaleString()} pcs → ${p.crates.toLocaleString()} crates, ${p.towers.toLocaleString()} towers, ${p.weightKg.toFixed(1)}kg, ${p.footprintM2.toFixed(2)}m²`
      );
    }
  }

  const footprintUsedPct = r.maxFootprintM2 > 0 ? (r.totalFootprintM2 / r.maxFootprintM2) * 100 : 0;

  lines.push(
    ``,
    `Totals:`,
    `  Weight:    ${r.totalWeightKg.toFixed(1)}kg / ${r.maxPayloadKg.toLocaleString()}kg (${r.weightUsedPct.toFixed(1)}%)`,
    `  Volume:    ${r.totalVolumeM3.toFixed(2)}m³ / ${r.maxVolumeM3}m³ (${r.volumeUsedPct.toFixed(1)}%)`,
    `  Footprint: ${r.totalFootprintM2.toFixed(2)}m² / ${r.maxFootprintM2.toFixed(2)}m² (${footprintUsedPct.toFixed(1)}%)`,
    ``,
    `Status: ${r.fits ? "✅ Fits" : `❌ Exceeds limit (${r.limitingFactor})`}`,
  );

  if (r.suggestion) lines.push(r.suggestion);

  return lines.join("\n");
}

// ── Container mix analysis (multi-product, no quantities given) ─────────────────
// Answers "can I mix A and B in one container?" — shows each product's individual max,
// then an even split of the container between them, with the combined load's fit check.

export type MixAnalysisInput = {
  articleCodes: string[];
  containerName?: string; // defaults to "40ft"
};

export type MixAnalysisProduct = {
  articleCode: string;
  productName: string;
  individualMaxPieces: number;
  individualLimitingFactor: "weight" | "volume" | "footprint";
  suggestedPieces: number;
  suggestedCrates: number;
  error?: string;
};

export type MixAnalysisResult = {
  containerName: string;
  splitCount: number; // number of products the container is split across
  products: MixAnalysisProduct[];
  combined: OptimizationResult;
};

export async function analyzeContainerMix(input: MixAnalysisInput): Promise<MixAnalysisResult> {
  const containerName = input.containerName ?? "40ft";

  // Unique codes, order preserved
  const uniqueCodes = [...new Set(input.articleCodes)];
  const splitCount = uniqueCodes.length || 1;

  const products: MixAnalysisProduct[] = [];
  const suggested: Array<{ articleCode: string; quantity: number }> = [];

  for (const code of uniqueCodes) {
    try {
      const cap = await calculateMaxCapacity({ articleCode: code, containerName });
      // Even split: give each product an equal share of the container's crate capacity
      const suggestedCrates = Math.floor(cap.maxCrates / splitCount);
      const suggestedPieces = suggestedCrates * cap.pcsPerCrate;
      products.push({
        articleCode: code,
        productName: cap.productName,
        individualMaxPieces: cap.maxPieces,
        individualLimitingFactor: cap.limitingFactor,
        suggestedPieces,
        suggestedCrates,
      });
      if (suggestedPieces > 0) suggested.push({ articleCode: code, quantity: suggestedPieces });
    } catch (e) {
      products.push({
        articleCode: code,
        productName: "",
        individualMaxPieces: 0,
        individualLimitingFactor: "weight",
        suggestedPieces: 0,
        suggestedCrates: 0,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  // Combined load of the suggested split — reuse the optimizer for exact totals & fit check
  const combined = await optimizeContainerMix({ products: suggested, containerName });

  return { containerName, splitCount, products, combined };
}

export function formatMixAnalysisText(r: MixAnalysisResult): string {
  const splitLabel = r.splitCount === 2 ? "50/50" : `even (1/${r.splitCount} each)`;

  const lines = [
    `CONTAINER MIX ANALYSIS`,
    `Container: ${r.containerName}`,
    `─────────────────────────────`,
    `Individual maximums:`,
  ];

  for (const p of r.products) {
    if (p.error) {
      lines.push(`  • ${p.articleCode}: ${p.error}`);
    } else {
      lines.push(`  • ${p.articleCode}: up to ${p.individualMaxPieces.toLocaleString()} pcs (${p.individualLimitingFactor}-limited)`);
    }
  }

  lines.push(``, `Suggested ${splitLabel} mix:`);
  for (const p of r.products) {
    if (p.error) continue;
    lines.push(`  • ${p.articleCode}: ~${p.suggestedPieces.toLocaleString()} pcs → ${p.suggestedCrates.toLocaleString()} crates`);
  }

  const c = r.combined;
  const footprintUsedPct = c.maxFootprintM2 > 0 ? (c.totalFootprintM2 / c.maxFootprintM2) * 100 : 0;

  lines.push(
    ``,
    `Combined totals:`,
    `  Weight: ${c.totalWeightKg.toFixed(1)} kg / ${c.maxPayloadKg.toLocaleString()} kg (${c.weightUsedPct.toFixed(1)}%)`,
    `  Volume: ${c.totalVolumeM3.toFixed(2)} m³ / ${c.maxVolumeM3} m³ (${c.volumeUsedPct.toFixed(1)}%)`,
    `  Footprint: ${c.totalFootprintM2.toFixed(2)} m² / ${c.maxFootprintM2.toFixed(2)} m² (${footprintUsedPct.toFixed(1)}%)`,
    `  Fits: ${c.fits ? "✅ Yes" : `❌ No (${c.limitingFactor})`}`,
  );

  return lines.join("\n");
}
