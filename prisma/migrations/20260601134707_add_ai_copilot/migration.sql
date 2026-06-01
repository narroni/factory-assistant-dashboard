-- CreateEnum
CREATE TYPE "AIActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');

-- CreateTable
CREATE TABLE "ai_action_requests" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" "AIActionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interaction_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "intent" TEXT,
    "response" TEXT NOT NULL,
    "ollamaUsed" BOOLEAN NOT NULL DEFAULT false,
    "actionsProposed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_action_requests_status_idx" ON "ai_action_requests"("status");

-- CreateIndex
CREATE INDEX "ai_action_requests_createdByUserId_idx" ON "ai_action_requests"("createdByUserId");

-- CreateIndex
CREATE INDEX "ai_interaction_logs_userId_idx" ON "ai_interaction_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_interaction_logs_createdAt_idx" ON "ai_interaction_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_action_requests" ADD CONSTRAINT "ai_action_requests_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_requests" ADD CONSTRAINT "ai_action_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interaction_logs" ADD CONSTRAINT "ai_interaction_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
