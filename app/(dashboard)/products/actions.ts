"use server";

import { prisma } from "../../lib/prisma";

export type ProductStatus = "Active" | "Inactive" | "Prototype";

export type MaterialReq = {
  name: string;
  qty: string;
};

export type Product = {
  id: string;
  name: string;
  code: string;
  length: number;
  width: number;
  thickness: number;
  weight: number;
  volume: number;
  material: string;
  status: ProductStatus;
  notes: string;
  materialRequirements: MaterialReq[];
};

// Enum mapping: UI format <-> DB format
const statusToDb = {
  Active: "ACTIVE",
  Inactive: "INACTIVE",
  Prototype: "PROTOTYPE",
} as const;

const statusFromDb = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PROTOTYPE: "Prototype",
} as const;

// Parse quantity string: "420 m²" → { value: 420, unit: "m²" }
function parseQty(qtyString: string): { value: number; unit: string } | null {
  const match = qtyString.match(/^([\d.]+)\s+(.+)$/);
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2] };
}

// Format quantity: { value: 420, unit: "m²" } → "420 m²"
function formatQty(value: number, unit: string): string {
  return `${value} ${unit}`;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        materialRequirements: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      length: p.lengthMm,
      width: p.widthMm,
      thickness: p.thicknessMm,
      weight: p.weightKg,
      volume: p.volumeM3,
      material: p.primaryMaterial,
      status: statusFromDb[p.status as keyof typeof statusFromDb],
      notes: p.notes ?? "",
      materialRequirements: p.materialRequirements.map((mr) => ({
        name: mr.name,
        qty: formatQty(mr.qtyValue, mr.qtyUnit),
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch products:", error);
    throw new Error("Failed to fetch products");
  }
}

export async function addProduct(data: Omit<Product, "id">): Promise<Product> {
  try {
    // Create product first
    const dbProduct = await prisma.product.create({
      data: {
        name: data.name,
        code: data.code,
        lengthMm: data.length,
        widthMm: data.width,
        thicknessMm: data.thickness,
        weightKg: data.weight,
        volumeM3: data.volume,
        primaryMaterial: data.material,
        status: statusToDb[data.status],
        notes: data.notes,
      },
    });

    // Create material requirements
    for (const req of data.materialRequirements) {
      const parsed = parseQty(req.qty);
      if (parsed) {
        await prisma.productMaterialRequirement.create({
          data: {
            productId: dbProduct.id,
            name: req.name,
            qtyValue: parsed.value,
            qtyUnit: parsed.unit,
          },
        });
      }
    }

    // Fetch with requirements
    const productWithReqs = await prisma.product.findUnique({
      where: { id: dbProduct.id },
      include: { materialRequirements: true },
    });

    if (!productWithReqs) throw new Error("Failed to create product");

    return {
      id: productWithReqs.id,
      name: productWithReqs.name,
      code: productWithReqs.code,
      length: productWithReqs.lengthMm,
      width: productWithReqs.widthMm,
      thickness: productWithReqs.thicknessMm,
      weight: productWithReqs.weightKg,
      volume: productWithReqs.volumeM3,
      material: productWithReqs.primaryMaterial,
      status: statusFromDb[productWithReqs.status as keyof typeof statusFromDb],
      notes: productWithReqs.notes ?? "",
      materialRequirements: productWithReqs.materialRequirements.map((mr) => ({
        name: mr.name,
        qty: formatQty(mr.qtyValue, mr.qtyUnit),
      })),
    };
  } catch (error) {
    console.error("Failed to add product:", error);
    throw new Error("Failed to add product");
  }
}

export async function updateProduct(
  id: string,
  data: Omit<Product, "id">
): Promise<Product> {
  try {
    // Update product fields
    const dbProduct = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        lengthMm: data.length,
        widthMm: data.width,
        thicknessMm: data.thickness,
        weightKg: data.weight,
        volumeM3: data.volume,
        primaryMaterial: data.material,
        status: statusToDb[data.status],
        notes: data.notes,
      },
    });

    // Delete old material requirements
    await prisma.productMaterialRequirement.deleteMany({
      where: { productId: id },
    });

    // Create new material requirements
    for (const req of data.materialRequirements) {
      const parsed = parseQty(req.qty);
      if (parsed) {
        await prisma.productMaterialRequirement.create({
          data: {
            productId: id,
            name: req.name,
            qtyValue: parsed.value,
            qtyUnit: parsed.unit,
          },
        });
      }
    }

    // Fetch with requirements
    const productWithReqs = await prisma.product.findUnique({
      where: { id },
      include: { materialRequirements: true },
    });

    if (!productWithReqs) throw new Error("Failed to update product");

    return {
      id: productWithReqs.id,
      name: productWithReqs.name,
      code: productWithReqs.code,
      length: productWithReqs.lengthMm,
      width: productWithReqs.widthMm,
      thickness: productWithReqs.thicknessMm,
      weight: productWithReqs.weightKg,
      volume: productWithReqs.volumeM3,
      material: productWithReqs.primaryMaterial,
      status: statusFromDb[productWithReqs.status as keyof typeof statusFromDb],
      notes: productWithReqs.notes ?? "",
      materialRequirements: productWithReqs.materialRequirements.map((mr) => ({
        name: mr.name,
        qty: formatQty(mr.qtyValue, mr.qtyUnit),
      })),
    };
  } catch (error) {
    console.error("Failed to update product:", error);
    throw new Error("Failed to update product");
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await prisma.product.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to delete product:", error);
    throw new Error("Failed to delete product");
  }
}

export async function changeProductStatus(
  id: string,
  status: ProductStatus
): Promise<Product> {
  try {
    const dbProduct = await prisma.product.update({
      where: { id },
      data: {
        status: statusToDb[status],
      },
      include: { materialRequirements: true },
    });

    return {
      id: dbProduct.id,
      name: dbProduct.name,
      code: dbProduct.code,
      length: dbProduct.lengthMm,
      width: dbProduct.widthMm,
      thickness: dbProduct.thicknessMm,
      weight: dbProduct.weightKg,
      volume: dbProduct.volumeM3,
      material: dbProduct.primaryMaterial,
      status: statusFromDb[dbProduct.status as keyof typeof statusFromDb],
      notes: dbProduct.notes ?? "",
      materialRequirements: dbProduct.materialRequirements.map((mr) => ({
        name: mr.name,
        qty: formatQty(mr.qtyValue, mr.qtyUnit),
      })),
    };
  } catch (error) {
    console.error("Failed to change product status:", error);
    throw new Error("Failed to change product status");
  }
}
