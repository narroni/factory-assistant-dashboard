#!/usr/bin/env node

/**
 * Cleanup script: Delete demo orders (orders with customerId = NULL)
 *
 * These are legacy demo orders that are not linked to any real customer:
 * - John Deere
 * - Hexcel Corp
 * - Nordex Group
 * - Rolls-Royce PLC
 * - Airbus Helicopters
 * - Siemens Gamesa
 *
 * Safe deletion:
 * - Only deletes orders where customerId is NULL
 * - Only deletes orders with specific demo customer names
 * - Does NOT delete user-created orders (those have customerId)
 */

const { PrismaClient } = require("@prisma/client");

const DEMO_CUSTOMERS = [
  "John Deere",
  "Hexcel Corp",
  "Nordex Group",
  "Rolls-Royce PLC",
  "Airbus Helicopters",
  "Siemens Gamesa"
];

async function cleanupDemoOrders() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Scanning for demo orders...\n");

    // Find demo orders
    const demoOrders = await prisma.order.findMany({
      where: {
        customerId: null,
        customer: { in: DEMO_CUSTOMERS }
      },
      select: {
        id: true,
        orderNumber: true,
        customer: true,
        status: true
      }
    });

    if (demoOrders.length === 0) {
      console.log("✅ No demo orders found. Database is clean.");
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${demoOrders.length} demo orders:\n`);
    demoOrders.forEach(o => {
      console.log(`  • ${o.orderNumber}: ${o.customer} (${o.status})`);
    });

    console.log("\n⚠️  These orders have NO customer link (customerId = NULL)");
    console.log("   They are NOT user-created orders and are safe to delete.\n");

    // Confirm deletion
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("Delete these demo orders? (yes/no) ", async (answer) => {
      rl.close();

      if (answer.toLowerCase() !== "yes") {
        console.log("\n❌ Cancelled. No orders deleted.");
        await prisma.$disconnect();
        return;
      }

      try {
        // Delete associated OrderLine records first (due to foreign key)
        const orderIds = demoOrders.map(o => o.id);
        const deletedLines = await prisma.orderLine.deleteMany({
          where: { orderId: { in: orderIds } }
        });

        // Delete orders
        const deleted = await prisma.order.deleteMany({
          where: { id: { in: orderIds } }
        });

        console.log(`\n✅ Cleanup complete!`);
        console.log(`   Deleted ${deletedLines.count} order lines`);
        console.log(`   Deleted ${deleted.count} demo orders\n`);

        // Verify
        const remaining = await prisma.order.count({
          where: {
            customerId: null,
            customer: { in: DEMO_CUSTOMERS }
          }
        });

        if (remaining === 0) {
          console.log("✅ Verification: No demo orders remaining in database");
        } else {
          console.log(`⚠️  Warning: ${remaining} demo orders still in database`);
        }
      } catch (error) {
        console.error("\n❌ Error during deletion:", error.message);
      } finally {
        await prisma.$disconnect();
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupDemoOrders();
