-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('CREATE_PRODUCT', 'CREATE_MATERIAL', 'CREATE_ORDER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'APPROVE_REQUEST';
ALTER TYPE "AuditAction" ADD VALUE 'REJECT_REQUEST';

-- CreateTable
CREATE TABLE "worker_requests" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worker_requests_status_idx" ON "worker_requests"("status");

-- CreateIndex
CREATE INDEX "worker_requests_requestedById_idx" ON "worker_requests"("requestedById");

-- AddForeignKey
ALTER TABLE "worker_requests" ADD CONSTRAINT "worker_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_requests" ADD CONSTRAINT "worker_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
