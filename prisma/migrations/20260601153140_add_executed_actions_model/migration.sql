-- CreateTable
CREATE TABLE "executed_actions" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "outputFile" TEXT,
    "outputContent" TEXT,
    "executedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executed_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "executed_actions_requestId_key" ON "executed_actions"("requestId");

-- CreateIndex
CREATE INDEX "executed_actions_requestId_idx" ON "executed_actions"("requestId");

-- CreateIndex
CREATE INDEX "executed_actions_actionType_idx" ON "executed_actions"("actionType");

-- CreateIndex
CREATE INDEX "executed_actions_createdAt_idx" ON "executed_actions"("createdAt");

-- AddForeignKey
ALTER TABLE "executed_actions" ADD CONSTRAINT "executed_actions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ai_action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executed_actions" ADD CONSTRAINT "executed_actions_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
