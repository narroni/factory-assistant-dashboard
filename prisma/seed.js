/**
 * Seed script — creates system users only.
 * Materials and suppliers are entered by the user via the UI.
 * Packaging data (BladeProductSpec, CrateType, ContainerType) is seeded by prisma/seed-packaging.js.
 */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const { promisify } = require("util");

const pbkdf2 = promisify(crypto.pbkdf2);

const prisma = new PrismaClient({ log: ["error"] });

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await pbkdf2(password, salt, 100000, 64, "sha256");
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  // Only clear users so the seed is idempotent-safe for users.
  // Do NOT clear materials, suppliers, orders, products, or packaging data.
  await prisma.user.deleteMany();

  const adminHash  = await hashPassword("password123");
  const workerHash = await hashPassword("password123");
  const viewerHash = await hashPassword("password123");

  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@narko.local",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      name: "Worker User",
      email: "worker@narko.local",
      passwordHash: workerHash,
      role: "WORKER",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      name: "Viewer User",
      email: "viewer@narko.local",
      passwordHash: viewerHash,
      role: "VIEWER",
      status: "ACTIVE",
    },
  });

  console.log("✓ Users seeded (admin@narko.local, worker@narko.local, viewer@narko.local)");
  console.log("  Run node prisma/seed-packaging.js to seed blade product data.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
