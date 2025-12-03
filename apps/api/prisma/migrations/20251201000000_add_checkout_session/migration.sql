-- PROPOSAL-003: Multi-Store Checkout Session
-- Creates CheckoutSession table and adds checkoutSessionId to Order

-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "buyerAddr" TEXT NOT NULL,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'PENDING',
    "batchTxHash" TEXT,
    "totalBzr" DECIMAL(30,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Order" ADD COLUMN "checkoutSessionId" TEXT;

-- CreateIndex
CREATE INDEX "CheckoutSession_buyerAddr_status_idx" ON "CheckoutSession"("buyerAddr", "status");

-- CreateIndex
CREATE INDEX "CheckoutSession_batchTxHash_idx" ON "CheckoutSession"("batchTxHash");

-- CreateIndex
CREATE INDEX "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Order_checkoutSessionId_idx" ON "Order"("checkoutSessionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
