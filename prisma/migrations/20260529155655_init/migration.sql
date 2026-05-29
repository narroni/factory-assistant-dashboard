-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WORKER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROTOTYPE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PRODUCTION', 'COMPLETED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'WARNING', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'CONSUMPTION', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "onTimeRate" DOUBLE PRECISION NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_materials" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "supplier_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryMaterial" TEXT NOT NULL,
    "notes" TEXT,
    "lengthMm" DOUBLE PRECISION NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "thicknessMm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "volumeM3" DOUBLE PRECISION NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_material_requirements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialId" TEXT,
    "name" TEXT NOT NULL,
    "qtyValue" DOUBLE PRECISION NOT NULL,
    "qtyUnit" TEXT NOT NULL,

    CONSTRAINT "product_material_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "valueEur" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "qtyDelta" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_email_key" ON "suppliers"("email");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_materials_supplierId_materialId_key" ON "supplier_materials"("supplierId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "materials"("code");

-- CreateIndex
CREATE INDEX "materials_status_idx" ON "materials"("status");

-- CreateIndex
CREATE INDEX "materials_category_idx" ON "materials"("category");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "product_material_requirements_productId_idx" ON "product_material_requirements"("productId");

-- CreateIndex
CREATE INDEX "product_material_requirements_materialId_idx" ON "product_material_requirements"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customer_idx" ON "orders"("customer");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_dueDate_idx" ON "orders"("dueDate");

-- CreateIndex
CREATE INDEX "stock_movements_materialId_idx" ON "stock_movements"("materialId");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "supplier_materials" ADD CONSTRAINT "supplier_materials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_materials" ADD CONSTRAINT "supplier_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_material_requirements" ADD CONSTRAINT "product_material_requirements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_material_requirements" ADD CONSTRAINT "product_material_requirements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
