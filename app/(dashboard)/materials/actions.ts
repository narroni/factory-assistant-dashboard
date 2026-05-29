"use server";

import { prisma } from "../../lib/prisma";

export type MaterialStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type Material = {
  id: string;
  name: string;
  code: string;
  category: string;
  quantity: number;
  unit: string;
  supplier: string;
  status: MaterialStatus;
};

// Enum mapping: UI format <-> DB format
const statusToDb = {
  "In Stock": "IN_STOCK",
  "Low Stock": "LOW_STOCK",
  "Out of Stock": "OUT_OF_STOCK",
} as const;

const statusFromDb = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
} as const;

export async function getMaterials(): Promise<Material[]> {
  try {
    const dbMaterials = await prisma.material.findMany({
      orderBy: { createdAt: "asc" },
    });

    return dbMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      category: m.category,
      quantity: m.quantity,
      unit: m.unit,
      supplier: "", // Not in DB, will be fetched separately if needed
      status: statusFromDb[m.status as keyof typeof statusFromDb],
    }));
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    throw new Error("Failed to fetch materials");
  }
}

export async function addMaterial(data: Omit<Material, "id">): Promise<Material> {
  try {
    const dbMaterial = await prisma.material.create({
      data: {
        name: data.name,
        code: data.code,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        status: statusToDb[data.status],
      },
    });

    return {
      id: dbMaterial.id,
      name: dbMaterial.name,
      code: dbMaterial.code,
      category: dbMaterial.category,
      quantity: dbMaterial.quantity,
      unit: dbMaterial.unit,
      supplier: "",
      status: statusFromDb[dbMaterial.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to add material:", error);
    throw new Error("Failed to add material");
  }
}

export async function updateMaterial(
  id: string,
  data: Omit<Material, "id">
): Promise<Material> {
  try {
    const dbMaterial = await prisma.material.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        status: statusToDb[data.status],
      },
    });

    return {
      id: dbMaterial.id,
      name: dbMaterial.name,
      code: dbMaterial.code,
      category: dbMaterial.category,
      quantity: dbMaterial.quantity,
      unit: dbMaterial.unit,
      supplier: "",
      status: statusFromDb[dbMaterial.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to update material:", error);
    throw new Error("Failed to update material");
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    await prisma.material.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to delete material:", error);
    throw new Error("Failed to delete material");
  }
}

export async function changeMaterialStatus(
  id: string,
  status: MaterialStatus
): Promise<Material> {
  try {
    const dbMaterial = await prisma.material.update({
      where: { id },
      data: {
        status: statusToDb[status],
      },
    });

    return {
      id: dbMaterial.id,
      name: dbMaterial.name,
      code: dbMaterial.code,
      category: dbMaterial.category,
      quantity: dbMaterial.quantity,
      unit: dbMaterial.unit,
      supplier: "",
      status: statusFromDb[dbMaterial.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to change material status:", error);
    throw new Error("Failed to change material status");
  }
}
