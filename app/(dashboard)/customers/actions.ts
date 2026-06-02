"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";

export type Customer = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  orderCount: number;
  totalOrderValue: number;
  lastOrderDate: string | null;
};

export async function getCustomers(): Promise<Customer[]> {
  const rows = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      orders: {
        select: { valueEur: true, dueDate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    contactName: c.contactName,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    orderCount: c.orders.length,
    totalOrderValue: c.orders.reduce((s, o) => s + o.valueEur, 0),
    lastOrderDate: c.orders.length > 0 ? c.orders[0].createdAt.toISOString().split("T")[0] : null,
  }));
}

export async function getCustomerWithOrders(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return c;
}

export async function addCustomer(data: {
  name: string; contactName?: string; email?: string; phone?: string; notes?: string;
}): Promise<Customer> {
  await requireAdmin();
  const row = await prisma.customer.create({
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
    include: { orders: true },
  });
  await logAuditEvent("Customer", row.id, "CREATE", undefined, { name: row.name });
  return {
    id: row.id, name: row.name,
    contactName: row.contactName, email: row.email, phone: row.phone, notes: row.notes,
    orderCount: 0, totalOrderValue: 0, lastOrderDate: null,
  };
}

export async function updateCustomer(id: string, data: {
  name: string; contactName?: string; email?: string; phone?: string; notes?: string;
}): Promise<Customer> {
  await requireAdmin();
  const before = await prisma.customer.findUnique({ where: { id } });
  const row = await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
    include: { orders: { select: { valueEur: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
  });
  if (before) await logAuditEvent("Customer", id, "UPDATE", { name: before.name }, { name: row.name });
  return {
    id: row.id, name: row.name,
    contactName: row.contactName, email: row.email, phone: row.phone, notes: row.notes,
    orderCount: row.orders.length,
    totalOrderValue: row.orders.reduce((s, o) => s + o.valueEur, 0),
    lastOrderDate: row.orders.length > 0 ? row.orders[0].createdAt.toISOString().split("T")[0] : null,
  };
}

export async function deleteCustomer(id: string): Promise<void> {
  await requireAdmin();
  const before = await prisma.customer.findUnique({ where: { id } });
  await prisma.customer.delete({ where: { id } });
  if (before) await logAuditEvent("Customer", id, "DELETE", { name: before.name });
}
