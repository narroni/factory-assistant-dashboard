"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";

export type SupplierStatus = "Active" | "Warning" | "Inactive";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  leadTime: string;
  materials: string[];
  onTimeRate: number;
  status: SupplierStatus;
};

// Enum mapping: UI format <-> DB format
const statusToDb = {
  Active: "ACTIVE",
  Warning: "WARNING",
  Inactive: "INACTIVE",
} as const;

const statusFromDb = {
  ACTIVE: "Active",
  WARNING: "Warning",
  INACTIVE: "Inactive",
} as const;

// Convert leadTimeDays to display string
function formatLeadTime(days: number): string {
  const weeks = Math.round(days / 7);
  if (weeks < 2) return `${days} days`;
  return `${weeks} weeks`;
}

// Parse lead time string to days: "6 weeks" → 42, "10 days" → 10
function parseLeadTime(str: string): number {
  const match = str.match(/^(\d+)\s*(weeks?|days?)$/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("w")) return num * 7;
  return num;
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const dbSuppliers = await prisma.supplier.findMany({
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return dbSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contact: s.contact,
      email: s.email,
      phone: s.phone ?? "",
      country: s.country,
      leadTime: formatLeadTime(s.leadTimeDays),
      materials: s.materials.map((sm) => sm.material.name),
      onTimeRate: Math.round(s.onTimeRate),
      status: statusFromDb[s.status as keyof typeof statusFromDb],
    }));
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    throw new Error("Failed to fetch suppliers");
  }
}

export async function addSupplier(data: Omit<Supplier, "id">): Promise<Supplier> {
  try {
    await requireAdmin();

    // Create supplier
    const dbSupplier = await prisma.supplier.create({
      data: {
        code: `SUP-${Date.now()}`, // Temporary code
        name: data.name,
        contact: data.contact,
        email: data.email,
        phone: data.phone,
        country: data.country,
        leadTimeDays: parseLeadTime(data.leadTime),
        onTimeRate: data.onTimeRate,
        status: statusToDb[data.status],
      },
    });

    // Link materials if they exist in the database
    for (const matName of data.materials) {
      const material = await prisma.material.findFirst({
        where: { name: matName },
      });
      if (material) {
        await prisma.supplierMaterial.create({
          data: {
            supplierId: dbSupplier.id,
            materialId: material.id,
          },
        });
      }
    }

    // Fetch with materials
    const supplierWithMats = await prisma.supplier.findUnique({
      where: { id: dbSupplier.id },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!supplierWithMats) throw new Error("Failed to create supplier");

    await logAuditEvent("Supplier", supplierWithMats.id, "CREATE", undefined, {
      name: supplierWithMats.name,
      contact: supplierWithMats.contact,
      email: supplierWithMats.email,
      country: supplierWithMats.country,
      status: statusFromDb[supplierWithMats.status as keyof typeof statusFromDb],
    });

    return {
      id: supplierWithMats.id,
      name: supplierWithMats.name,
      contact: supplierWithMats.contact,
      email: supplierWithMats.email,
      phone: supplierWithMats.phone ?? "",
      country: supplierWithMats.country,
      leadTime: formatLeadTime(supplierWithMats.leadTimeDays),
      materials: supplierWithMats.materials.map((sm) => sm.material.name),
      onTimeRate: Math.round(supplierWithMats.onTimeRate),
      status: statusFromDb[supplierWithMats.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to add supplier:", error);
    throw new Error("Failed to add supplier");
  }
}

export async function updateSupplier(
  id: string,
  data: Omit<Supplier, "id">
): Promise<Supplier> {
  try {
    await requireAdmin();

    const before = await prisma.supplier.findUnique({ where: { id } });

    // Update supplier fields
    const dbSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contact: data.contact,
        email: data.email,
        phone: data.phone,
        country: data.country,
        leadTimeDays: parseLeadTime(data.leadTime),
        onTimeRate: data.onTimeRate,
        status: statusToDb[data.status],
      },
    });

    // Delete old material links
    await prisma.supplierMaterial.deleteMany({
      where: { supplierId: id },
    });

    // Create new material links
    for (const matName of data.materials) {
      const material = await prisma.material.findFirst({
        where: { name: matName },
      });
      if (material) {
        await prisma.supplierMaterial.create({
          data: {
            supplierId: id,
            materialId: material.id,
          },
        });
      }
    }

    // Fetch with materials
    const supplierWithMats = await prisma.supplier.findUnique({
      where: { id },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!supplierWithMats) throw new Error("Failed to update supplier");

    if (before) {
      await logAuditEvent("Supplier", id, "UPDATE", {
        name: before.name,
        contact: before.contact,
        email: before.email,
        country: before.country,
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      }, {
        name: supplierWithMats.name,
        contact: supplierWithMats.contact,
        email: supplierWithMats.email,
        country: supplierWithMats.country,
        status: statusFromDb[supplierWithMats.status as keyof typeof statusFromDb],
      });
    }

    return {
      id: supplierWithMats.id,
      name: supplierWithMats.name,
      contact: supplierWithMats.contact,
      email: supplierWithMats.email,
      phone: supplierWithMats.phone ?? "",
      country: supplierWithMats.country,
      leadTime: formatLeadTime(supplierWithMats.leadTimeDays),
      materials: supplierWithMats.materials.map((sm) => sm.material.name),
      onTimeRate: Math.round(supplierWithMats.onTimeRate),
      status: statusFromDb[supplierWithMats.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to update supplier:", error);
    throw new Error("Failed to update supplier");
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    await requireAdmin();

    const before = await prisma.supplier.findUnique({ where: { id } });

    await prisma.supplier.delete({
      where: { id },
    });

    if (before) {
      await logAuditEvent("Supplier", id, "DELETE", {
        name: before.name,
        contact: before.contact,
        email: before.email,
        country: before.country,
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      });
    }
  } catch (error) {
    console.error("Failed to delete supplier:", error);
    throw new Error("Failed to delete supplier");
  }
}

export async function changeSupplierStatus(
  id: string,
  status: SupplierStatus
): Promise<Supplier> {
  try {
    await requireAdmin();

    const before = await prisma.supplier.findUnique({ where: { id } });

    const dbSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: statusToDb[status],
      },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (before) {
      await logAuditEvent("Supplier", id, "UPDATE", {
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      }, {
        status: statusFromDb[dbSupplier.status as keyof typeof statusFromDb],
      });
    }

    return {
      id: dbSupplier.id,
      name: dbSupplier.name,
      contact: dbSupplier.contact,
      email: dbSupplier.email,
      phone: dbSupplier.phone ?? "",
      country: dbSupplier.country,
      leadTime: formatLeadTime(dbSupplier.leadTimeDays),
      materials: dbSupplier.materials.map((sm) => sm.material.name),
      onTimeRate: Math.round(dbSupplier.onTimeRate),
      status: statusFromDb[dbSupplier.status as keyof typeof statusFromDb],
    };
  } catch (error) {
    console.error("Failed to change supplier status:", error);
    throw new Error("Failed to change supplier status");
  }
}
