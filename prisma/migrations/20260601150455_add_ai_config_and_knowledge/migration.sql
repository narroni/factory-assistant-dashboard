-- CreateTable
CREATE TABLE "ai_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "assistantName" TEXT NOT NULL DEFAULT 'Factory Copilot',
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "responseStyle" TEXT NOT NULL DEFAULT 'concise',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "allowedActions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_knowledge" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factory_knowledge_enabled_idx" ON "factory_knowledge"("enabled");

-- CreateIndex
CREATE INDEX "factory_knowledge_uploadedBy_idx" ON "factory_knowledge"("uploadedBy");

-- CreateIndex
CREATE INDEX "factory_knowledge_createdAt_idx" ON "factory_knowledge"("createdAt");

-- AddForeignKey
ALTER TABLE "factory_knowledge" ADD CONSTRAINT "factory_knowledge_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
