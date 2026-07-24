"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";
import { getSessionUser } from "../../lib/session";
import { revalidatePath } from "next/cache";

export type CrateType = {
  id: string;
  code: string;
  emptyWeightKg: number;
  xMeters: number;
  yMeters: number;
  zMeters: number;
  hasLegs: boolean;
  legsDescription: string;
};

export type ContainerType = {
  id: string;
  name: string;
  lengthMeters: number;
  widthMeters: number;
  maxVolumeM3: number;
  maxPayloadKg: number;
};

// ── Crate Types ────────────────────────────────────────────────────────────────

export async function getCrateTypes(): Promise<CrateType[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  try {
    const rows = await prisma.crateType.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      emptyWeightKg: r.emptyWeightKg,
      xMeters: r.xMeters,
      yMeters: r.yMeters,
      zMeters: r.zMeters,
      hasLegs: r.hasLegs,
      legsDescription: r.legsDescription ?? "",
    }));
  } catch (error) {
    console.error("Failed to fetch crate types:", error);
    throw new Error("Failed to fetch crate types");
  }
}

export async function addCrateType(data: Omit<CrateType, "id">): Promise<CrateType | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const row = await prisma.crateType.create({
      data: {
        code: data.code,
        emptyWeightKg: data.emptyWeightKg,
        xMeters: data.xMeters,
        yMeters: data.yMeters,
        zMeters: data.zMeters,
        hasLegs: data.hasLegs,
        legsDescription: data.legsDescription || null,
      },
    });

    await logAuditEvent("CrateType", row.id, "CREATE", undefined, {
      code: row.code,
      emptyWeightKg: row.emptyWeightKg,
      hasLegs: row.hasLegs,
    });

    revalidatePath("/crates-containers");
    return {
      id: row.id,
      code: row.code,
      emptyWeightKg: row.emptyWeightKg,
      xMeters: row.xMeters,
      yMeters: row.yMeters,
      zMeters: row.zMeters,
      hasLegs: row.hasLegs,
      legsDescription: row.legsDescription ?? "",
    };
  } catch (error) {
    console.error("Failed to add crate type:", error);
    return { error: "A crate with this code already exists, or the data is invalid." };
  }
}

export async function updateCrateType(id: string, data: Omit<CrateType, "id">): Promise<CrateType | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const before = await prisma.crateType.findUnique({ where: { id } });

    const row = await prisma.crateType.update({
      where: { id },
      data: {
        code: data.code,
        emptyWeightKg: data.emptyWeightKg,
        xMeters: data.xMeters,
        yMeters: data.yMeters,
        zMeters: data.zMeters,
        hasLegs: data.hasLegs,
        legsDescription: data.legsDescription || null,
      },
    });

    if (before) {
      await logAuditEvent("CrateType", id, "UPDATE", {
        code: before.code,
        emptyWeightKg: before.emptyWeightKg,
        hasLegs: before.hasLegs,
      }, {
        code: row.code,
        emptyWeightKg: row.emptyWeightKg,
        hasLegs: row.hasLegs,
      });
    }

    revalidatePath("/crates-containers");
    return {
      id: row.id,
      code: row.code,
      emptyWeightKg: row.emptyWeightKg,
      xMeters: row.xMeters,
      yMeters: row.yMeters,
      zMeters: row.zMeters,
      hasLegs: row.hasLegs,
      legsDescription: row.legsDescription ?? "",
    };
  } catch (error) {
    console.error("Failed to update crate type:", error);
    return { error: "A crate with this code already exists, or the data is invalid." };
  }
}

export async function deleteCrateType(id: string): Promise<{ error: string } | void> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const before = await prisma.crateType.findUnique({ where: { id } });

    await prisma.crateType.delete({ where: { id } });

    if (before) {
      await logAuditEvent("CrateType", id, "DELETE", {
        code: before.code,
        emptyWeightKg: before.emptyWeightKg,
        hasLegs: before.hasLegs,
      });
    }
    revalidatePath("/crates-containers");
  } catch (error) {
    console.error("Failed to delete crate type:", error);
    return { error: "This crate type is in use by one or more products and cannot be deleted." };
  }
}

// ── Container Types ──────────────────────────────────────────────────────────

export async function getContainerTypes(): Promise<ContainerType[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Authentication required");
  try {
    const rows = await prisma.containerType.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      lengthMeters: r.lengthMeters,
      widthMeters: r.widthMeters,
      maxVolumeM3: r.maxVolumeM3,
      maxPayloadKg: r.maxPayloadKg,
    }));
  } catch (error) {
    console.error("Failed to fetch container types:", error);
    throw new Error("Failed to fetch container types");
  }
}

export async function addContainerType(data: Omit<ContainerType, "id">): Promise<ContainerType | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const row = await prisma.containerType.create({
      data: {
        name: data.name,
        lengthMeters: data.lengthMeters,
        widthMeters: data.widthMeters,
        maxVolumeM3: data.maxVolumeM3,
        maxPayloadKg: data.maxPayloadKg,
      },
    });

    await logAuditEvent("ContainerType", row.id, "CREATE", undefined, {
      name: row.name,
      maxVolumeM3: row.maxVolumeM3,
      maxPayloadKg: row.maxPayloadKg,
    });

    revalidatePath("/crates-containers");
    return {
      id: row.id,
      name: row.name,
      lengthMeters: row.lengthMeters,
      widthMeters: row.widthMeters,
      maxVolumeM3: row.maxVolumeM3,
      maxPayloadKg: row.maxPayloadKg,
    };
  } catch (error) {
    console.error("Failed to add container type:", error);
    return { error: "A container with this name already exists, or the data is invalid." };
  }
}

export async function updateContainerType(id: string, data: Omit<ContainerType, "id">): Promise<ContainerType | { error: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const before = await prisma.containerType.findUnique({ where: { id } });

    const row = await prisma.containerType.update({
      where: { id },
      data: {
        name: data.name,
        lengthMeters: data.lengthMeters,
        widthMeters: data.widthMeters,
        maxVolumeM3: data.maxVolumeM3,
        maxPayloadKg: data.maxPayloadKg,
      },
    });

    if (before) {
      await logAuditEvent("ContainerType", id, "UPDATE", {
        name: before.name,
        maxVolumeM3: before.maxVolumeM3,
        maxPayloadKg: before.maxPayloadKg,
      }, {
        name: row.name,
        maxVolumeM3: row.maxVolumeM3,
        maxPayloadKg: row.maxPayloadKg,
      });
    }

    revalidatePath("/crates-containers");
    return {
      id: row.id,
      name: row.name,
      lengthMeters: row.lengthMeters,
      widthMeters: row.widthMeters,
      maxVolumeM3: row.maxVolumeM3,
      maxPayloadKg: row.maxPayloadKg,
    };
  } catch (error) {
    console.error("Failed to update container type:", error);
    return { error: "A container with this name already exists, or the data is invalid." };
  }
}

export async function deleteContainerType(id: string): Promise<{ error: string } | void> {
  try {
    await requireAdmin();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Permission denied" };
  }
  try {
    const before = await prisma.containerType.findUnique({ where: { id } });

    await prisma.containerType.delete({ where: { id } });

    if (before) {
      await logAuditEvent("ContainerType", id, "DELETE", {
        name: before.name,
        maxVolumeM3: before.maxVolumeM3,
        maxPayloadKg: before.maxPayloadKg,
      });
    }
    revalidatePath("/crates-containers");
  } catch (error) {
    console.error("Failed to delete container type:", error);
    return { error: "This container type is in use and cannot be deleted." };
  }
}
