"use server";

import { getSessionUser } from "./session";
import type { UserRole } from "@prisma/client";

export async function getCurrentUser() {
  return await getSessionUser();
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER")) {
    throw new Error("Admin access required");
  }
  return user;
}

export async function requireCanEdit() {
  const user = await getSessionUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && user.role !== "WORKER")) {
    throw new Error("Permission denied: editing not allowed");
  }
  return user;
}

export async function requireCanChangeStatus(entity: "material" | "order") {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") {
    return user;
  }

  if (user.role === "WORKER") {
    if (entity === "material" || entity === "order") {
      return user;
    }
  }

  throw new Error(`Permission denied: cannot change ${entity} status`);
}

export async function canCreateMaterial(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canEditMaterial(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canDeleteMaterial(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canChangeMaterialStatus(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER" || role === "WORKER";
}

export async function canCreateProduct(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canEditProduct(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canDeleteProduct(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canChangeProductStatus(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canCreateOrder(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canEditOrder(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canDeleteOrder(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canChangeOrderStatus(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER" || role === "WORKER";
}

export async function canCreateSupplier(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canEditSupplier(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canDeleteSupplier(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function canChangeSupplierStatus(role: UserRole): Promise<boolean> {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}
