-- ============================================
-- Add Blockchain References Migration
-- Created: 2025-11-12
-- Purpose: Add blockchain reference fields to Orders, Sales, PaymentIntents, etc
-- ============================================

-- Add blockchain references to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "blockchainOrderId" BIGINT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "blockchainTxHash" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "onChainStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_blockchainOrderId_idx" ON "Order"("blockchainOrderId");

-- Add blockchain references to PaymentIntent
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "escrowId" BIGINT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "txHash" TEXT;

CREATE INDEX IF NOT EXISTS "PaymentIntent_txHash_idx" ON "PaymentIntent"("txHash");

-- Add blockchain references to AffiliateSale
ALTER TABLE "AffiliateSale" ADD COLUMN IF NOT EXISTS "blockchainSaleId" BIGINT;
ALTER TABLE "AffiliateSale" ADD COLUMN IF NOT EXISTS "blockchainTxHash" TEXT;
ALTER TABLE "AffiliateSale" ADD COLUMN IF NOT EXISTS "onChainStatus" TEXT;
ALTER TABLE "AffiliateSale" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AffiliateSale_blockchainSaleId_idx" ON "AffiliateSale"("blockchainSaleId");

-- Add blockchain sync fields to DeliveryProfile
ALTER TABLE "DeliveryProfile" ADD COLUMN IF NOT EXISTS "reviewsMerkleRoot" TEXT;
ALTER TABLE "DeliveryProfile" ADD COLUMN IF NOT EXISTS "lastMerkleUpdate" TIMESTAMP(3);
ALTER TABLE "DeliveryProfile" ADD COLUMN IF NOT EXISTS "onChainReputationScore" INTEGER;

CREATE INDEX IF NOT EXISTS "DeliveryProfile_reviewsMerkleRoot_idx" ON "DeliveryProfile"("reviewsMerkleRoot");

-- Create DeliveryWaypoint table (NEW)
CREATE TABLE IF NOT EXISTS "DeliveryWaypoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryRequestId" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "accuracy" REAL,
    "altitude" REAL,
    "speed" REAL,
    "bearing" REAL,
    "timestamp" BIGINT NOT NULL,
    "proofSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "proofCid" TEXT,

    CONSTRAINT "DeliveryWaypoint_deliveryRequestId_fkey" FOREIGN KEY ("deliveryRequestId")
        REFERENCES "DeliveryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeliveryWaypoint_deliveryRequestId_timestamp_idx" ON "DeliveryWaypoint"("deliveryRequestId", "timestamp");
CREATE INDEX IF NOT EXISTS "DeliveryWaypoint_proofSubmitted_idx" ON "DeliveryWaypoint"("proofSubmitted");

-- Create CourierReview table (NEW)
CREATE TABLE IF NOT EXISTS "CourierReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryRequestId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" BIGINT NOT NULL,
    "merkleIncluded" BOOLEAN NOT NULL DEFAULT false,
    "merkleRootHash" TEXT,

    CONSTRAINT "CourierReview_deliveryRequestId_fkey" FOREIGN KEY ("deliveryRequestId")
        REFERENCES "DeliveryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CourierReview_courierId_createdAt_idx" ON "CourierReview"("courierId", "createdAt");
CREATE INDEX IF NOT EXISTS "CourierReview_reviewerId_idx" ON "CourierReview"("reviewerId");
CREATE INDEX IF NOT EXISTS "CourierReview_deliveryRequestId_idx" ON "CourierReview"("deliveryRequestId");
CREATE INDEX IF NOT EXISTS "CourierReview_courierId_merkleIncluded_idx" ON "CourierReview"("courierId", "merkleIncluded");
