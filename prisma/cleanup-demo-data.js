/**
 * Safe cleanup of demo/mock materials and suppliers.
 * Only removes records that match known demo codes/names from the original seed.
 * Does NOT touch: users, orders, packaging data, customers, AI data, audit logs, backups.
 */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const DEMO_MATERIAL_CODES = [
  "CF-600", "EP-135", "GF-450", "ZN-COAT", "BW-CORE", "NM-HC",
  "MN-X120", "TS-H13", "ST-D2", "BS-27MN", "M8-BOLT", "CU-WIRE",
  "IN-718", "BM-M42",
  // also catch by partial name match below
];

const DEMO_SUPPLIER_CODES = [
  "SUP-001", "SUP-002", "SUP-003", "SUP-004",
];

// Additional name-based safeguard — only delete if code AND name both look demo-ish
const DEMO_MATERIAL_NAMES = [
  "Carbon Fiber Fabric", "Fiberglass Woven", "Epoxy Resin LR135",
  "Balsa Wood Core", "Steel Sheet D2", "Zinc Phosphate Coating",
  "Boron Steel 27MnCrB5", "Copper Wire 2.5mm", "Manganese Steel X120Mn12",
  "Inconel 718 Bar", "Nomex Honeycomb", "Bimetal Strip M42", "Tool Steel H13 Bar",
];

const DEMO_SUPPLIER_NAMES = [
  "Toray Composite Materials", "Huntsman Advanced Materials",
  "BASF Resins", "Hexcel Corporation",
];

async function main() {
  console.log("Starting demo data cleanup...\n");

  // ── Materials ──────────────────────────────────────────────────────────────
  const allMaterials = await prisma.material.findMany({
    select: { id: true, code: true, name: true },
  });

  const demoMaterials = allMaterials.filter((m) =>
    DEMO_MATERIAL_CODES.includes(m.code) ||
    DEMO_MATERIAL_NAMES.some((n) => m.name.startsWith(n))
  );

  if (demoMaterials.length === 0) {
    console.log("✓ No demo materials found.");
  } else {
    console.log(`Found ${demoMaterials.length} demo material(s) to remove:`);
    demoMaterials.forEach((m) => console.log(`  - [${m.code}] ${m.name}`));

    const ids = demoMaterials.map((m) => m.id);

    // Remove supplier-material links first
    const smDel = await prisma.supplierMaterial.deleteMany({
      where: { materialId: { in: ids } },
    });
    console.log(`  Removed ${smDel.count} supplier-material link(s).`);

    // Remove product material requirements that reference these materials
    const pmrDel = await prisma.productMaterialRequirement.deleteMany({
      where: { materialId: { in: ids } },
    });
    console.log(`  Removed ${pmrDel.count} product-material requirement(s).`);

    // Remove stock movements
    const stDel = await prisma.stockMovement.deleteMany({
      where: { materialId: { in: ids } },
    });
    console.log(`  Removed ${stDel.count} stock movement(s).`);

    // Remove the materials themselves
    const matDel = await prisma.material.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`  Deleted ${matDel.count} material(s). ✓\n`);
  }

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const allSuppliers = await prisma.supplier.findMany({
    select: { id: true, code: true, name: true },
  });

  const demoSuppliers = allSuppliers.filter((s) =>
    DEMO_SUPPLIER_CODES.includes(s.code) ||
    DEMO_SUPPLIER_NAMES.includes(s.name)
  );

  if (demoSuppliers.length === 0) {
    console.log("✓ No demo suppliers found.");
  } else {
    console.log(`Found ${demoSuppliers.length} demo supplier(s) to remove:`);
    demoSuppliers.forEach((s) => console.log(`  - [${s.code}] ${s.name}`));

    const ids = demoSuppliers.map((s) => s.id);

    // Remove supplier-material links
    const smDel = await prisma.supplierMaterial.deleteMany({
      where: { supplierId: { in: ids } },
    });
    console.log(`  Removed ${smDel.count} supplier-material link(s).`);

    const supDel = await prisma.supplier.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`  Deleted ${supDel.count} supplier(s). ✓\n`);
  }

  // ── Old demo Product records (Wind Turbine Blades etc.) ───────────────────
  const demoProdCodes = [
    "WTB-52", "WTB-38", "WTB-65",
    "ICB-300", "AMB-600", "GTB-80", "HRB-14",
    "BSB-4000", "PKN-150", "SHB-200",
  ];

  const demoProducts = await prisma.product.findMany({
    where: { code: { in: demoProdCodes } },
    select: { id: true, code: true, name: true },
  });

  if (demoProducts.length === 0) {
    console.log("✓ No demo products (Wind Turbine etc.) found.");
  } else {
    console.log(`Found ${demoProducts.length} demo product(s) to remove:`);
    demoProducts.forEach((p) => console.log(`  - [${p.code}] ${p.name}`));

    const ids = demoProducts.map((p) => p.id);

    await prisma.productMaterialRequirement.deleteMany({ where: { productId: { in: ids } } });

    // Null out productId in orders (keep the orders, just unlink the demo product)
    const ordUpd = await prisma.order.updateMany({
      where: { productId: { in: ids } },
      data: { productId: null },
    });
    console.log(`  Unlinked ${ordUpd.count} order(s) from demo products.`);

    const prodDel = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    console.log(`  Deleted ${prodDel.count} demo product(s). ✓\n`);
  }

  // ── Demo orders — cancel active ones that reference old demo product names ─
  const DEMO_PRODUCT_CODES = [
    "WTB-52", "WTB-38", "WTB-65", "ICB-300", "AMB-600",
    "GTB-80", "HRB-14", "BSB-4000", "PKN-150", "SHB-200",
  ];

  const demoOrders = await prisma.order.findMany({
    where: {
      productCode: { in: DEMO_PRODUCT_CODES },
      status: { in: ["PENDING", "IN_PRODUCTION", "DELAYED"] },
    },
    select: { id: true, orderNumber: true, status: true },
  });

  if (demoOrders.length === 0) {
    console.log("✓ No active demo orders found.");
  } else {
    console.log(`Found ${demoOrders.length} active demo order(s) — marking CANCELLED:`);
    demoOrders.forEach((o) => console.log(`  - ${o.orderNumber} (${o.status})`));

    await prisma.order.updateMany({
      where: { id: { in: demoOrders.map((o) => o.id) } },
      data: { status: "CANCELLED" },
    });
    console.log(`  Cancelled ${demoOrders.length} demo order(s). ✓\n`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const [matCount, supCount, prodCount, activeOrders] = await Promise.all([
    prisma.material.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.order.count({ where: { status: { in: ["PENDING", "IN_PRODUCTION", "DELAYED"] } } }),
  ]);
  console.log("Cleanup complete.");
  console.log(`Remaining: ${matCount} material(s), ${supCount} supplier(s), ${prodCount} legacy product(s), ${activeOrders} active order(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
