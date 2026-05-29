require("dotenv/config");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error"],
});

async function main() {
  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productMaterialRequirement.deleteMany();
  await prisma.order.deleteMany();
  await prisma.supplierMaterial.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@factory.local",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Create materials
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        code: "CF-600",
        name: "Carbon Fiber Fabric 600g/m²",
        category: "Composites",
        quantity: 2850,
        unit: "m²",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "GF-450",
        name: "Fiberglass Woven 450g/m²",
        category: "Composites",
        quantity: 4200,
        unit: "m²",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "EP-135",
        name: "Epoxy Resin LR135",
        category: "Resins",
        quantity: 1380,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "BW-CORE",
        name: "Balsa Wood Core",
        category: "Core Materials",
        quantity: 16.6,
        unit: "m³",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "ST-D2",
        name: "Steel Sheet D2 3mm",
        category: "Steel",
        quantity: 3.2,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "ZN-COAT",
        name: "Zinc Phosphate Coating",
        category: "Coatings",
        quantity: 0.2,
        unit: "L",
        status: "LOW_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "BS-27MN",
        name: "Boron Steel 27MnCrB5",
        category: "Steel",
        quantity: 1.1,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "M8-BOLT",
        name: "M8 Hex Bolt A2-70",
        category: "Fasteners",
        quantity: 6,
        unit: "pcs",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "CU-WIRE",
        name: "Copper Wire 2.5mm",
        category: "Electrical",
        quantity: 4.5,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "MN-X120",
        name: "Manganese Steel X120Mn12",
        category: "Steel",
        quantity: 3.2,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "IN-718",
        name: "Inconel 718 Bar",
        category: "Specialty Alloys",
        quantity: 0.18,
        unit: "kg",
        status: "LOW_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "NM-HC",
        name: "Nomex Honeycomb 48kg/m³",
        category: "Core Materials",
        quantity: 12,
        unit: "m²",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "BM-M42",
        name: "Bimetal Strip M42",
        category: "Cutting Tools",
        quantity: 4.2,
        unit: "m",
        status: "IN_STOCK",
      },
    }),
    prisma.material.create({
      data: {
        code: "TS-H13",
        name: "Tool Steel H13 Bar",
        category: "Steel",
        quantity: 0.75,
        unit: "kg",
        status: "IN_STOCK",
      },
    }),
  ]);

  const materialMap = new Map(materials.map((m) => [m.name, m]));

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        code: "SUP-001",
        name: "Toray Composite Materials",
        contact: "John Smith",
        email: "sales@toray-composite.eu",
        phone: "+49 (0)123 456789",
        country: "Germany",
        leadTimeDays: 42,
        onTimeRate: 98.5,
        status: "ACTIVE",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-002",
        name: "Huntsman Advanced Materials",
        contact: "Maria Garcia",
        email: "orders@huntsman-eu.com",
        phone: "+33 (0)1 2345 6789",
        country: "France",
        leadTimeDays: 35,
        onTimeRate: 95.2,
        status: "ACTIVE",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-003",
        name: "BASF Resins",
        contact: "Hans Mueller",
        email: "industrial@basf.eu",
        phone: "+49 (0)800 273 8254",
        country: "Germany",
        leadTimeDays: 28,
        onTimeRate: 99.1,
        status: "ACTIVE",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-004",
        name: "Hexcel Corporation",
        contact: "Michael Davis",
        email: "sales-eu@hexcel.com",
        phone: "+44 (0)1753 534000",
        country: "United Kingdom",
        leadTimeDays: 56,
        onTimeRate: 91.3,
        status: "WARNING",
      },
    }),
  ]);

  const supplierMap = new Map(suppliers.map((s) => [s.name, s]));

  // Link suppliers to materials
  await Promise.all([
    prisma.supplierMaterial.create({
      data: {
        supplierId: supplierMap.get("Toray Composite Materials").id,
        materialId: materialMap.get("Carbon Fiber Fabric 600g/m²").id,
      },
    }),
    prisma.supplierMaterial.create({
      data: {
        supplierId: supplierMap.get("Toray Composite Materials").id,
        materialId: materialMap.get("Fiberglass Woven 450g/m²").id,
      },
    }),
    prisma.supplierMaterial.create({
      data: {
        supplierId: supplierMap.get("Huntsman Advanced Materials").id,
        materialId: materialMap.get("Epoxy Resin LR135").id,
      },
    }),
    prisma.supplierMaterial.create({
      data: {
        supplierId: supplierMap.get("Hexcel Corporation").id,
        materialId: materialMap.get("Balsa Wood Core").id,
      },
    }),
  ]);

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        code: "WTB-52",
        name: "Wind Turbine Blade B-52",
        primaryMaterial: "Carbon Fiber / Fiberglass",
        lengthMm: 52000,
        widthMm: 2800,
        thicknessMm: 180,
        weightKg: 6500,
        volumeM3: 11.5,
        status: "ACTIVE",
        notes: "Large-scale wind energy blade. Requires precision mold alignment. Cure time: 48h at 80°C. Post-cure NDT inspection mandatory on every production run. Shell + spar cap construction.",
      },
    }),
    prisma.product.create({
      data: {
        code: "ICB-300",
        name: "Industrial Cutting Blade IC-300",
        primaryMaterial: "Hardened Steel D2",
        lengthMm: 300,
        widthMm: 80,
        thicknessMm: 6,
        weightKg: 2.4,
        volumeM3: 0.000144,
        status: "ACTIVE",
        notes: "High-speed cutting application. Edge hardness: 58–62 HRC. Ground to ±0.01mm tolerance. TiN coating optional. Packaged in sets of 10.",
      },
    }),
    prisma.product.create({
      data: {
        code: "AMB-600",
        name: "Agricultural Mower Blade AM-600",
        primaryMaterial: "Boron Steel 27MnCrB5",
        lengthMm: 600,
        widthMm: 50,
        thicknessMm: 4,
        weightKg: 0.94,
        volumeM3: 0.00012,
        status: "ACTIVE",
        notes: "Rotary mower blade. Heat treated to 42–46 HRC. Balanced to ISO 1940 G6.3. Replaces OEM part for Claas Corto and similar series. High-volume production item.",
      },
    }),
    prisma.product.create({
      data: {
        code: "WTB-38",
        name: "Wind Turbine Blade B-38",
        primaryMaterial: "Fiberglass / Epoxy Resin",
        lengthMm: 38000,
        widthMm: 2100,
        thicknessMm: 150,
        weightKg: 3800,
        volumeM3: 6.8,
        status: "ACTIVE",
        notes: "Mid-range wind blade for 1.5–2 MW class turbines. Glass fiber infusion process (VARTM). Shell + shear web construction. Lightning protection system integrated.",
      },
    }),
    prisma.product.create({
      data: {
        code: "SHB-200",
        name: "Shredder Blade SB-200",
        primaryMaterial: "Manganese Steel X120Mn12",
        lengthMm: 200,
        widthMm: 120,
        thicknessMm: 15,
        weightKg: 2.8,
        volumeM3: 0.00036,
        status: "ACTIVE",
        notes: "Industrial shredder blade for wood and plastic. Work-hardening material improves durability under impact loads. Bolt pattern: 4×M10. Sold in pairs.",
      },
    }),
    prisma.product.create({
      data: {
        code: "GTB-80",
        name: "Gas Turbine Blade TB-80",
        primaryMaterial: "Inconel 718",
        lengthMm: 80,
        widthMm: 25,
        thicknessMm: 8,
        weightKg: 0.12,
        volumeM3: 0.000016,
        status: "PROTOTYPE",
        notes: "High-temperature gas turbine blade. Operating temp: up to 950°C. Thermal barrier coating required. 5-axis CNC machined from forged billet. Currently in design validation phase.",
      },
    }),
    prisma.product.create({
      data: {
        code: "HRB-14",
        name: "Helicopter Rotor Blade HR-14",
        primaryMaterial: "Carbon Fiber / Nomex Honeycomb",
        lengthMm: 14000,
        widthMm: 380,
        thicknessMm: 40,
        weightKg: 245,
        volumeM3: 0.142,
        status: "ACTIVE",
        notes: "Main rotor blade for medium-class helicopter. NACA 0012 airfoil profile. Stainless steel leading edge erosion shield. Dynamic balancing to ±5 g·cm. Full fatigue test program required.",
      },
    }),
    prisma.product.create({
      data: {
        code: "BSB-4000",
        name: "Bandsaw Blade BS-4000",
        primaryMaterial: "Bimetal M42 HSS",
        lengthMm: 4000,
        widthMm: 34,
        thicknessMm: 0.9,
        weightKg: 0.8,
        volumeM3: 0.000122,
        status: "ACTIVE",
        notes: "General-purpose bandsaw blade. 4 TPI for structural steel up to 150mm. Electron beam welded joint. Set configuration: raker. Fatigue life tested to 500k cycles.",
      },
    }),
    prisma.product.create({
      data: {
        code: "PKN-150",
        name: "Pellet Knife PK-150",
        primaryMaterial: "Tool Steel H13",
        lengthMm: 150,
        widthMm: 45,
        thicknessMm: 12,
        weightKg: 0.6,
        volumeM3: 0.000081,
        status: "ACTIVE",
        notes: "Plastic pelletizing knife for underwater pelletizer systems. Tungsten carbide edge available. Re-grindable 5–7 times. Matched set of 8 required per machine.",
      },
    }),
    prisma.product.create({
      data: {
        code: "WTB-65",
        name: "Wind Turbine Blade B-65",
        primaryMaterial: "Carbon Fiber / Balsa Wood Core",
        lengthMm: 65000,
        widthMm: 3800,
        thicknessMm: 220,
        weightKg: 14500,
        volumeM3: 24.8,
        status: "INACTIVE",
        notes: "Next-generation offshore wind blade for 5 MW+ turbines. Spar cap: pultruded CFRP. Core: end-grain balsa. Trailing edge: glass fabric. Mold design phase. First article target: Q3 2026.",
      },
    }),
  ]);

  const productMap = new Map(products.map((p) => [p.code, p]));

  // Create product material requirements
  const requirements = [
    {
      productCode: "WTB-52",
      name: "Carbon Fiber Fabric 600g/m²",
      qtyValue: 420,
      qtyUnit: "m²",
    },
    {
      productCode: "WTB-52",
      name: "Fiberglass Woven 450g/m²",
      qtyValue: 680,
      qtyUnit: "m²",
    },
    {
      productCode: "WTB-52",
      name: "Epoxy Resin LR135",
      qtyValue: 310,
      qtyUnit: "kg",
    },
    {
      productCode: "WTB-52",
      name: "Balsa Wood Core",
      qtyValue: 4.2,
      qtyUnit: "m³",
    },
    {
      productCode: "ICB-300",
      name: "Steel Sheet D2 3mm",
      qtyValue: 3.2,
      qtyUnit: "kg",
    },
    {
      productCode: "ICB-300",
      name: "Zinc Phosphate Coating",
      qtyValue: 0.2,
      qtyUnit: "L",
    },
    {
      productCode: "AMB-600",
      name: "Boron Steel 27MnCrB5",
      qtyValue: 1.1,
      qtyUnit: "kg",
    },
    {
      productCode: "AMB-600",
      name: "M8 Hex Bolt A2-70",
      qtyValue: 2,
      qtyUnit: "pcs",
    },
    {
      productCode: "WTB-38",
      name: "Fiberglass Woven 450g/m²",
      qtyValue: 920,
      qtyUnit: "m²",
    },
    {
      productCode: "WTB-38",
      name: "Epoxy Resin LR135",
      qtyValue: 240,
      qtyUnit: "kg",
    },
    {
      productCode: "WTB-38",
      name: "Balsa Wood Core",
      qtyValue: 2.8,
      qtyUnit: "m³",
    },
    {
      productCode: "WTB-38",
      name: "Copper Wire 2.5mm",
      qtyValue: 4.5,
      qtyUnit: "kg",
    },
    {
      productCode: "SHB-200",
      name: "Manganese Steel X120Mn12",
      qtyValue: 3.2,
      qtyUnit: "kg",
    },
    {
      productCode: "SHB-200",
      name: "M8 Hex Bolt A2-70",
      qtyValue: 4,
      qtyUnit: "pcs",
    },
    {
      productCode: "GTB-80",
      name: "Inconel 718 Bar",
      qtyValue: 0.18,
      qtyUnit: "kg",
    },
    {
      productCode: "HRB-14",
      name: "Carbon Fiber Fabric 600g/m²",
      qtyValue: 48,
      qtyUnit: "m²",
    },
    {
      productCode: "HRB-14",
      name: "Nomex Honeycomb 48kg/m³",
      qtyValue: 12,
      qtyUnit: "m²",
    },
    {
      productCode: "HRB-14",
      name: "Epoxy Resin LR135",
      qtyValue: 22,
      qtyUnit: "kg",
    },
    {
      productCode: "BSB-4000",
      name: "Bimetal Strip M42",
      qtyValue: 4.2,
      qtyUnit: "m",
    },
    {
      productCode: "PKN-150",
      name: "Tool Steel H13 Bar",
      qtyValue: 0.75,
      qtyUnit: "kg",
    },
    {
      productCode: "WTB-65",
      name: "Carbon Fiber Fabric 600g/m²",
      qtyValue: 820,
      qtyUnit: "m²",
    },
    {
      productCode: "WTB-65",
      name: "Balsa Wood Core",
      qtyValue: 9.6,
      qtyUnit: "m³",
    },
    {
      productCode: "WTB-65",
      name: "Fiberglass Woven 450g/m²",
      qtyValue: 440,
      qtyUnit: "m²",
    },
    {
      productCode: "WTB-65",
      name: "Epoxy Resin LR135",
      qtyValue: 620,
      qtyUnit: "kg",
    },
  ];

  await Promise.all(
    requirements.map((req) =>
      prisma.productMaterialRequirement.create({
        data: {
          productId: productMap.get(req.productCode).id,
          materialId: materialMap.get(req.name)?.id,
          name: req.name,
          qtyValue: req.qtyValue,
          qtyUnit: req.qtyUnit,
        },
      })
    )
  );

  // Create orders
  await Promise.all([
    prisma.order.create({
      data: {
        orderNumber: "ORD-4821",
        customer: "Vestas Wind Systems",
        productId: productMap.get("WTB-52")?.id,
        productName: "Wind Turbine Blade B-52",
        productCode: "WTB-52",
        qty: 6,
        status: "IN_PRODUCTION",
        dueDate: new Date("2026-06-15"),
        valueEur: 890000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4820",
        customer: "Siemens Gamesa",
        productId: productMap.get("WTB-38")?.id,
        productName: "Wind Turbine Blade B-38",
        productCode: "WTB-38",
        qty: 12,
        status: "PENDING",
        dueDate: new Date("2026-07-01"),
        valueEur: 720000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4819",
        customer: "Claas Group",
        productId: productMap.get("AMB-600")?.id,
        productName: "Agricultural Mower Blade AM-600",
        productCode: "AMB-600",
        qty: 2000,
        status: "COMPLETED",
        dueDate: new Date("2026-05-28"),
        valueEur: 42000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4818",
        customer: "Renault SA",
        productId: productMap.get("ICB-300")?.id,
        productName: "Industrial Cutting Blade IC-300",
        productCode: "ICB-300",
        qty: 500,
        status: "COMPLETED",
        dueDate: new Date("2026-05-20"),
        valueEur: 18500,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4817",
        customer: "Airbus Helicopters",
        productId: productMap.get("HRB-14")?.id,
        productName: "Helicopter Rotor Blade HR-14",
        productCode: "HRB-14",
        qty: 4,
        status: "IN_PRODUCTION",
        dueDate: new Date("2026-06-30"),
        valueEur: 540000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4816",
        customer: "GE Vernova",
        productId: productMap.get("WTB-65")?.id,
        productName: "Wind Turbine Blade B-65",
        productCode: "WTB-65",
        qty: 3,
        status: "PENDING",
        dueDate: new Date("2026-09-15"),
        valueEur: 1200000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4815",
        customer: "Andritz AG",
        productId: productMap.get("SHB-200")?.id,
        productName: "Shredder Blade SB-200",
        productCode: "SHB-200",
        qty: 80,
        status: "COMPLETED",
        dueDate: new Date("2026-05-10"),
        valueEur: 12800,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4814",
        customer: "John Deere",
        productId: productMap.get("AMB-600")?.id,
        productName: "Agricultural Mower Blade AM-600",
        productCode: "AMB-600",
        qty: 1500,
        status: "IN_PRODUCTION",
        dueDate: new Date("2026-06-05"),
        valueEur: 31500,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4813",
        customer: "Hexcel Corp",
        productId: productMap.get("BSB-4000")?.id,
        productName: "Bandsaw Blade BS-4000",
        productCode: "BSB-4000",
        qty: 200,
        status: "COMPLETED",
        dueDate: new Date("2026-05-22"),
        valueEur: 9600,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4812",
        customer: "Rolls-Royce PLC",
        productId: productMap.get("GTB-80")?.id,
        productName: "Gas Turbine Blade TB-80",
        productCode: "GTB-80",
        qty: 20,
        status: "IN_PRODUCTION",
        dueDate: new Date("2026-07-30"),
        valueEur: 380000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4811",
        customer: "AGCO Corporation",
        productId: productMap.get("AMB-600")?.id,
        productName: "Agricultural Mower Blade AM-600",
        productCode: "AMB-600",
        qty: 3000,
        status: "PENDING",
        dueDate: new Date("2026-07-15"),
        valueEur: 63000,
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORD-4810",
        customer: "Nordex Group",
        productId: productMap.get("WTB-52")?.id,
        productName: "Wind Turbine Blade B-52",
        productCode: "WTB-52",
        qty: 9,
        status: "COMPLETED",
        dueDate: new Date("2026-04-30"),
        valueEur: 1335000,
      },
    }),
  ]);

  console.log("✓ Database seeded successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
