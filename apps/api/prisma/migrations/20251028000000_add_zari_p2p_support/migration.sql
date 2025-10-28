-- CreateEnum
CREATE TYPE "P2PAssetType" AS ENUM ('BZR', 'ZARI');

-- AlterTable P2POffer - Add ZARI support
ALTER TABLE "P2POffer"
  ADD COLUMN "assetType" "P2PAssetType" NOT NULL DEFAULT 'BZR',
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "phasePrice" DECIMAL(18,12),
  ADD COLUMN "priceBRLPerUnit" DECIMAL(18,2);

-- AlterTable P2POrder - Add ZARI support
ALTER TABLE "P2POrder"
  ADD COLUMN "assetType" "P2PAssetType" NOT NULL DEFAULT 'BZR',
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "priceBRLPerUnit" DECIMAL(18,2),
  ADD COLUMN "amountAsset" DECIMAL(38,18);

-- CreateTable ZARIPhaseConfig
CREATE TABLE "ZARIPhaseConfig" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "priceBZR" DECIMAL(18,12) NOT NULL,
    "supplyLimit" BIGINT NOT NULL,
    "startBlock" BIGINT,
    "endBlock" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZARIPhaseConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZARIPhaseConfig_phase_key" ON "ZARIPhaseConfig"("phase");

-- CreateIndex
CREATE INDEX "ZARIPhaseConfig_phase_active_idx" ON "ZARIPhaseConfig"("phase", "active");

-- CreateIndex on P2POffer
CREATE INDEX "P2POffer_ownerId_status_side_assetType_idx" ON "P2POffer"("ownerId", "status", "side", "assetType");
CREATE INDEX "P2POffer_assetType_phase_status_idx" ON "P2POffer"("assetType", "phase", "status");

-- CreateIndex on P2POrder
CREATE INDEX "P2POrder_makerId_takerId_status_assetType_idx" ON "P2POrder"("makerId", "takerId", "status", "assetType");
CREATE INDEX "P2POrder_assetType_phase_idx" ON "P2POrder"("assetType", "phase");
