/*
  Warnings:

  - Added the required column `updatedAt` to the `assistant_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssistantMessageStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "assistant_messages" ADD COLUMN     "status" "AssistantMessageStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "assistant_messages_status_idx" ON "assistant_messages"("status");
