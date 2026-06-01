-- CreateTable
CREATE TABLE "database_backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "database_backups_createdAt_idx" ON "database_backups"("createdAt");
