require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  console.log("Seeding packaging data...");

  // ── Clean existing ──────────────────────────────────────────────────────────
  await prisma.packagingCalculation.deleteMany();
  await prisma.bladeProductSpec.deleteMany();
  await prisma.crateType.deleteMany();
  await prisma.containerType.deleteMany();

  // ── Containers ──────────────────────────────────────────────────────────────
  const [c20, c40] = await Promise.all([
    prisma.containerType.create({
      data: {
        name: "20ft",
        lengthMeters: 5.9,
        widthMeters: 2.35,
        maxVolumeM3: 33,
        maxPayloadKg: 28000,
      },
    }),
    prisma.containerType.create({
      data: {
        name: "40ft",
        lengthMeters: 12,
        widthMeters: 2.35,
        maxVolumeM3: 67.7,
        maxPayloadKg: 31500,
      },
    }),
  ]);
  console.log("Containers seeded:", c20.name, c40.name);

  // ── Crate types — independent crate data only; no product names ──────────────
  const crates = await Promise.all([
    prisma.crateType.create({ data: { code: "B1",         emptyWeightKg: 15.6, xMeters: 0.60, yMeters: 0.21, zMeters: 0.60, hasLegs: false, legsDescription: "no, only bottom" } }),
    prisma.crateType.create({ data: { code: "B2",         emptyWeightKg: 16.6, xMeters: 0.67, yMeters: 0.21, zMeters: 0.67, hasLegs: false, legsDescription: "no, only bottom" } }),
    prisma.crateType.create({ data: { code: "A3",         emptyWeightKg: 12,   xMeters: 0.75, yMeters: 0.22, zMeters: 0.48, hasLegs: true,  legsDescription: "yes" } }),
    prisma.crateType.create({ data: { code: "A2",         emptyWeightKg: 13.5, xMeters: 0.75, yMeters: 0.22, zMeters: 0.58, hasLegs: true,  legsDescription: "yes" } }),
    prisma.crateType.create({ data: { code: "A1",         emptyWeightKg: 23.5, xMeters: 0.75, yMeters: 0.22, zMeters: 0.69, hasLegs: true,  legsDescription: "yes" } }),
    prisma.crateType.create({ data: { code: "Euro Palete",emptyWeightKg: 35,   xMeters: 1.2,  yMeters: 0.35, zMeters: 0.8,  hasLegs: true,  legsDescription: "yes, the palet" } }),
    prisma.crateType.create({ data: { code: "L2",         emptyWeightKg: 16.5, xMeters: 0.74, yMeters: 0.22, zMeters: 0.56, hasLegs: true,  legsDescription: "yes" } }),
    prisma.crateType.create({ data: { code: "L1",         emptyWeightKg: 19.6, xMeters: 0.74, yMeters: 0.22, zMeters: 0.66, hasLegs: true,  legsDescription: "yes" } }),
  ]);
  const crateMap = Object.fromEntries(crates.map((c) => [c.code, c.id]));
  console.log("Crates seeded:", crates.map((c) => c.code).join(", "));

  // ── Blade product specs ─────────────────────────────────────────────────────
  const products = [
    { articleCode: "RD001 EURO PALET",        productName: "Rasperblade in palet",  lengthMm: 400,    widthMm: 20, thicknessMm: 1,    tpi: 17, punchedOn: "Both sides", holeDistance: null,            holeSize: null, color: "GOLD",   weightBeforePunchingKg: 0.0640, weightAfterPunchingKg: 0.0536, pcsPerCrate: 12500, crateCode: "Euro Palete", maxCratesPerTower: 3 },
    { articleCode: "RDG500/1,25",             productName: "Rasperblade",            lengthMm: 500,    widthMm: 21, thicknessMm: 1.25, tpi: 17, punchedOn: "Both sides", holeDistance: "100-300-100",   holeSize: "Ø5", color: "GOLD",   weightBeforePunchingKg: 0.1050, weightAfterPunchingKg: 0.0879, pcsPerCrate: 2000,  crateCode: "A2",          maxCratesPerTower: 5 },
    { articleCode: "RDG600/1,25",             productName: "Rasperblade",            lengthMm: 600,    widthMm: 21, thicknessMm: 1.25, tpi: 17, punchedOn: "Both sides", holeDistance: "100-200-100",   holeSize: "Ø5", color: "GOLD",   weightBeforePunchingKg: 0.1260, weightAfterPunchingKg: 0.1055, pcsPerCrate: 2000,  crateCode: "A1",          maxCratesPerTower: 5 },
    { articleCode: "RDL002",                  productName: "Rasperblade",            lengthMm: 400,    widthMm: 21, thicknessMm: 1.25, tpi: 17, punchedOn: "Both sides", holeDistance: "100-200-100",   holeSize: "Ø5", color: "GOLD",   weightBeforePunchingKg: 0.0840, weightAfterPunchingKg: 0.0704, pcsPerCrate: 2000,  crateCode: "A3",          maxCratesPerTower: 5 },
    { articleCode: "RDL011 LARSSON",          productName: "Rasperblade",            lengthMm: 600,    widthMm: 21, thicknessMm: 1.25, tpi: 17, punchedOn: "Both sides", holeDistance: "100-200-200-100", holeSize: "Ø5", color: "SILVER", weightBeforePunchingKg: 0.1260, weightAfterPunchingKg: 0.1055, pcsPerCrate: 2000,  crateCode: "L1",          maxCratesPerTower: 5 },
    { articleCode: "RDL011/1,4",              productName: "Rasperblade",            lengthMm: 600,    widthMm: 21, thicknessMm: 1.4,  tpi: 17, punchedOn: "Both sides", holeDistance: "100-200-200-100", holeSize: "Ø5", color: "GOLD",   weightBeforePunchingKg: 0.1411, weightAfterPunchingKg: 0.1182, pcsPerCrate: 1800,  crateCode: "A1",          maxCratesPerTower: 5 },
    { articleCode: "RDL011/1,6",              productName: "Rasperblade",            lengthMm: 600,    widthMm: 21, thicknessMm: 1.6,  tpi: 17, punchedOn: "Both sides", holeDistance: "100-200-200-100", holeSize: "Ø5", color: "GOLD",   weightBeforePunchingKg: 0.1613, weightAfterPunchingKg: 0.1351, pcsPerCrate: 1600,  crateCode: "A1",          maxCratesPerTower: 5 },
    { articleCode: "RLG500/1,6s",             productName: "Rasperblade",            lengthMm: 500,    widthMm: 21, thicknessMm: 1.6,  tpi: 17, punchedOn: "Both sides", holeDistance: "100-150-150-100", holeSize: "Ø5", color: "SILVER", weightBeforePunchingKg: 0.1344, weightAfterPunchingKg: 0.1126, pcsPerCrate: 2000,  crateCode: "L1",          maxCratesPerTower: 5 },
    { articleCode: "RDL400 Larsson not verif",productName: "Rasperblade",            lengthMm: 400,    widthMm: 21, thicknessMm: 1.6,  tpi: 17, punchedOn: "Both sides", holeDistance: "100-150-150-100", holeSize: "Ø5", color: "SILVER", weightBeforePunchingKg: 0.0941, weightAfterPunchingKg: 0.0788, pcsPerCrate: 2000,  crateCode: "L1",          maxCratesPerTower: 5 },
    { articleCode: "RR021/150",               productName: "Rasperblade rolls",      lengthMm: 150000, widthMm: 21, thicknessMm: 1.25, tpi: 17, punchedOn: "Both sides", holeDistance: null,            holeSize: null, color: "GOLD",   weightBeforePunchingKg: 31.5000, weightAfterPunchingKg: 26.3813, pcsPerCrate: 5,   crateCode: "B2",          maxCratesPerTower: 5 },
    { articleCode: "RR030",                   productName: "Rasperblade Rolls",      lengthMm: 150000, widthMm: 25, thicknessMm: 1,    tpi: 21, punchedOn: "Both sides", holeDistance: null,            holeSize: null, color: "GOLD",   weightBeforePunchingKg: 30.0000, weightAfterPunchingKg: 25.1250, pcsPerCrate: 5,   crateCode: "B1",          maxCratesPerTower: 5 },
    { articleCode: "RR031",                   productName: "Rasperblade Rolls",      lengthMm: 150000, widthMm: 25, thicknessMm: 1,    tpi: 17, punchedOn: "Both sides", holeDistance: null,            holeSize: null, color: "GOLD",   weightBeforePunchingKg: 30.0000, weightAfterPunchingKg: 25.1250, pcsPerCrate: 5,   crateCode: "B1",          maxCratesPerTower: 5 },
  ];

  for (const p of products) {
    const { crateCode, ...rest } = p;
    await prisma.bladeProductSpec.create({
      data: { ...rest, crateTypeId: crateMap[crateCode] },
    });
  }
  console.log("Blade products seeded:", products.length);
  console.log("Packaging seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
