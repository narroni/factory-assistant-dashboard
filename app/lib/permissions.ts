import type { UserRole } from "@prisma/client";

export type Permission =
  | "view:dashboard"
  | "view:materials"
  | "view:products"
  | "view:orders"
  | "view:suppliers"
  | "view:reports"
  | "view:settings"
  | "create:material"
  | "edit:material"
  | "delete:material"
  | "create:product"
  | "edit:product"
  | "delete:product"
  | "create:order"
  | "edit:order"
  | "delete:order"
  | "change:order_status"
  | "create:supplier"
  | "edit:supplier"
  | "delete:supplier"
  | "manage:users"
  | "change:material_status";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "view:dashboard",
    "view:materials",
    "view:products",
    "view:orders",
    "view:suppliers",
    "view:reports",
    "view:settings",
    "create:material",
    "edit:material",
    "delete:material",
    "change:material_status",
    "create:product",
    "edit:product",
    "delete:product",
    "create:order",
    "edit:order",
    "delete:order",
    "change:order_status",
    "create:supplier",
    "edit:supplier",
    "delete:supplier",
    "manage:users",
  ],
  WORKER: [
    "view:dashboard",
    "view:materials",
    "view:products",
    "view:orders",
    "view:suppliers",
    "view:reports",
    "edit:material",
    "change:material_status",
    "edit:order",
    "change:order_status",
  ],
  VIEWER: [
    "view:dashboard",
    "view:materials",
    "view:products",
    "view:orders",
    "view:suppliers",
    "view:reports",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
