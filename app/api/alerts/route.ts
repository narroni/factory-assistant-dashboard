import { prisma } from "../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [lowStockMaterials, delayedOrders, pendingOrders] = await Promise.all([
      prisma.material.findMany({
        where: { status: "LOW_STOCK" },
        take: 3,
      }),
      prisma.order.findMany({
        where: { status: "DELAYED" },
        take: 3,
      }),
      prisma.order.findMany({
        where: { status: "PENDING" },
        take: 3,
      }),
    ]);

    const alerts = [
      ...lowStockMaterials.map((m) => ({
        type: "warning" as const,
        title: `Low Stock: ${m.name}`,
        description: `${m.name} is at ${m.quantity} ${m.unit}. Consider reordering.`,
      })),
      ...delayedOrders.map((o) => ({
        type: "warning" as const,
        title: `Delayed Order: ${o.orderNumber}`,
        description: `Order ${o.orderNumber} for ${o.customer} is delayed. Due: ${o.dueDate.toLocaleDateString()}`,
      })),
      ...pendingOrders.slice(0, 2).map((o) => ({
        type: "info" as const,
        title: `Pending Order: ${o.orderNumber}`,
        description: `Order ${o.orderNumber} from ${o.customer} is pending fulfillment.`,
      })),
    ];

    return NextResponse.json(alerts.slice(0, 5));
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json([], { status: 500 });
  }
}
