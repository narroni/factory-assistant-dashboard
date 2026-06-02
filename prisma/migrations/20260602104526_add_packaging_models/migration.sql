-- CreateTable
CREATE TABLE "crate_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emptyWeightKg" DOUBLE PRECISION NOT NULL,
    "xMeters" DOUBLE PRECISION NOT NULL,
    "yMeters" DOUBLE PRECISION NOT NULL,
    "zMeters" DOUBLE PRECISION NOT NULL,
    "hasLegs" BOOLEAN NOT NULL DEFAULT false,
    "legsDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crate_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthMeters" DOUBLE PRECISION NOT NULL,
    "widthMeters" DOUBLE PRECISION NOT NULL,
    "maxVolumeM3" DOUBLE PRECISION NOT NULL,
    "maxPayloadKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "container_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blade_product_specs" (
    "id" TEXT NOT NULL,
    "articleCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "lengthMm" DOUBLE PRECISION NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "thicknessMm" DOUBLE PRECISION NOT NULL,
    "tpi" INTEGER NOT NULL,
    "punchedOn" TEXT NOT NULL,
    "holeDistance" TEXT,
    "holeSize" TEXT,
    "color" TEXT NOT NULL,
    "weightBeforePunchingKg" DOUBLE PRECISION NOT NULL,
    "weightAfterPunchingKg" DOUBLE PRECISION NOT NULL,
    "pcsPerCrate" INTEGER NOT NULL,
    "crateTypeId" TEXT NOT NULL,
    "maxCratesPerTower" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blade_product_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_calculations" (
    "id" TEXT NOT NULL,
    "articleCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "containerName" TEXT NOT NULL,
    "requiredCrates" DOUBLE PRECISION NOT NULL,
    "fullCrates" INTEGER NOT NULL,
    "towers" INTEGER NOT NULL,
    "netWeightKg" DOUBLE PRECISION NOT NULL,
    "crateWeightKg" DOUBLE PRECISION NOT NULL,
    "totalWeightKg" DOUBLE PRECISION NOT NULL,
    "footprintM2" DOUBLE PRECISION NOT NULL,
    "volumeM3" DOUBLE PRECISION NOT NULL,
    "weightFits" BOOLEAN NOT NULL,
    "areaFits" BOOLEAN NOT NULL,
    "volumeFits" BOOLEAN NOT NULL,
    "overallFits" BOOLEAN NOT NULL,
    "limitingFactors" TEXT,
    "maxPiecesFit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packaging_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crate_types_code_key" ON "crate_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "container_types_name_key" ON "container_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blade_product_specs_articleCode_key" ON "blade_product_specs"("articleCode");

-- CreateIndex
CREATE INDEX "blade_product_specs_crateTypeId_idx" ON "blade_product_specs"("crateTypeId");

-- CreateIndex
CREATE INDEX "packaging_calculations_articleCode_idx" ON "packaging_calculations"("articleCode");

-- CreateIndex
CREATE INDEX "packaging_calculations_createdAt_idx" ON "packaging_calculations"("createdAt");

-- AddForeignKey
ALTER TABLE "blade_product_specs" ADD CONSTRAINT "blade_product_specs_crateTypeId_fkey" FOREIGN KEY ("crateTypeId") REFERENCES "crate_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
