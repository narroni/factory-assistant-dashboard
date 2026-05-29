"use server";

import { prisma } from "../../lib/prisma";
import { requireAdmin, requireCanChangeStatus } from "../../lib/auth-helpers";
import { logAuditEvent } from "../../lib/audit";

export type OrderStatus = "Pending" | "In Production" | "Completed" | "Delayed" | "Cancelled";

export type Order = {
  id: string;
  customer: string;
  product: string;
  productCode: string;
  qty: number;
  status: OrderStatus;
  dueDate: string;
  value: number;
};

// Enum mapping: UI format <-> DB format
const statusToDb = {
  Pending: "PENDING",
  "In Production": "IN_PRODUCTION",
  Completed: "COMPLETED",
  Delayed: "DELAYED",
  Cancelled: "CANCELLED",
} as const;

const statusFromDb = {
  PENDING: "Pending",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
} as const;

// Format DateTime to YYYY-MM-DD string
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Parse YYYY-MM-DD string to DateTime
function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00Z`);
}

export async function getOrders(): Promise<Order[]> {
  try {
    const dbOrders = await prisma.order.findMany({
      orderBy: { createdAt: "asc" },
    });

    return dbOrders.map((o) => ({
      id: o.id,
      customer: o.customer,
      product: o.productName,
      productCode: o.productCode,
      qty: o.qty,
      status: statusFromDb[o.status as keyof typeof statusFromDb],
      dueDate: formatDate(o.dueDate),
      value: o.valueEur,
    }));
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    throw new Error("Failed to fetch orders");
  }
}

export async function addOrder(data: Omit<Order, "id">): Promise<Order> {
  try {
    await requireAdmin();

    // Try to find product by code
    let productId: string | null = null;
    if (data.productCode) {
      const product = await prisma.product.findUnique({
        where: { code: data.productCode },
      });
      if (product) {
        productId = product.id;
      }
    }

    const dbOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`, // Temporary order number
        customer: data.customer,
        productId: productId,
        productName: data.product,
        productCode: data.productCode,
        qty: data.qty,
        status: statusToDb[data.status],
        dueDate: parseDate(data.dueDate),
        valueEur: data.value,
      },
    });

    await logAuditEvent("Order", dbOrder.id, "CREATE", undefined, {
      orderNumber: dbOrder.orderNumber,
      customer: dbOrder.customer,
      product: dbOrder.productName,
      qty: dbOrder.qty,
      status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
    });

    return {
      id: dbOrder.id,
      customer: dbOrder.customer,
      product: dbOrder.productName,
      productCode: dbOrder.productCode,
      qty: dbOrder.qty,
      status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
      dueDate: formatDate(dbOrder.dueDate),
      value: dbOrder.valueEur,
    };
  } catch (error) {
    console.error("Failed to add order:", error);
    throw new Error("Failed to add order");
  }
}

export async function updateOrder(
  id: string,
  data: Omit<Order, "id">
): Promise<Order> {
  try {
    await requireAdmin();

    const before = await prisma.order.findUnique({ where: { id } });

    // Try to find product by code
    let productId: string | null = null;
    if (data.productCode) {
      const product = await prisma.product.findUnique({
        where: { code: data.productCode },
      });
      if (product) {
        productId = product.id;
      }
    }

    const dbOrder = await prisma.order.update({
      where: { id },
      data: {
        customer: data.customer,
        productId: productId,
        productName: data.product,
        productCode: data.productCode,
        qty: data.qty,
        status: statusToDb[data.status],
        dueDate: parseDate(data.dueDate),
        valueEur: data.value,
      },
    });

    if (before) {
      await logAuditEvent("Order", id, "UPDATE", {
        customer: before.customer,
        product: before.productName,
        qty: before.qty,
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      }, {
        customer: dbOrder.customer,
        product: dbOrder.productName,
        qty: dbOrder.qty,
        status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
      });
    }

    return {
      id: dbOrder.id,
      customer: dbOrder.customer,
      product: dbOrder.productName,
      productCode: dbOrder.productCode,
      qty: dbOrder.qty,
      status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
      dueDate: formatDate(dbOrder.dueDate),
      value: dbOrder.valueEur,
    };
  } catch (error) {
    console.error("Failed to update order:", error);
    throw new Error("Failed to update order");
  }
}

export async function deleteOrder(id: string): Promise<void> {
  try {
    await requireAdmin();

    const before = await prisma.order.findUnique({ where: { id } });

    await prisma.order.delete({
      where: { id },
    });

    if (before) {
      await logAuditEvent("Order", id, "DELETE", {
        customer: before.customer,
        product: before.productName,
        qty: before.qty,
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      });
    }
  } catch (error) {
    console.error("Failed to delete order:", error);
    throw new Error("Failed to delete order");
  }
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  try {
    await requireCanChangeStatus("order");

    const before = await prisma.order.findUnique({ where: { id } });

    const dbOrder = await prisma.order.update({
      where: { id },
      data: {
        status: statusToDb[status],
      },
    });

    if (before) {
      await logAuditEvent("Order", id, "UPDATE", {
        status: statusFromDb[before.status as keyof typeof statusFromDb],
      }, {
        status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
      });
    }

    return {
      id: dbOrder.id,
      customer: dbOrder.customer,
      product: dbOrder.productName,
      productCode: dbOrder.productCode,
      qty: dbOrder.qty,
      status: statusFromDb[dbOrder.status as keyof typeof statusFromDb],
      dueDate: formatDate(dbOrder.dueDate),
      value: dbOrder.valueEur,
    };
  } catch (error) {
    console.error("Failed to change order status:", error);
    throw new Error("Failed to change order status");
  }
}
