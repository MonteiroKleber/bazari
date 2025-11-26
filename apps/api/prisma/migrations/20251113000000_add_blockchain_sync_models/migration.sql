-- CreateTable
CREATE TABLE "blockchain_orders" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "buyer" VARCHAR(66) NOT NULL,
    "seller" VARCHAR(66) NOT NULL,
    "marketplace" INTEGER NOT NULL,
    "totalAmount" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "proofCid" VARCHAR(100) NOT NULL,
    "attestor" VARCHAR(66) NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_disputes" (
    "id" SERIAL NOT NULL,
    "disputeId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "plaintiff" VARCHAR(66) NOT NULL,
    "defendant" VARCHAR(66) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPENED',
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_orders_orderId_key" ON "blockchain_orders"("orderId");

-- CreateIndex
CREATE INDEX "blockchain_orders_orderId_idx" ON "blockchain_orders"("orderId");

-- CreateIndex
CREATE INDEX "blockchain_orders_buyer_idx" ON "blockchain_orders"("buyer");

-- CreateIndex
CREATE INDEX "blockchain_orders_seller_idx" ON "blockchain_orders"("seller");

-- CreateIndex
CREATE INDEX "blockchain_orders_status_idx" ON "blockchain_orders"("status");

-- CreateIndex
CREATE INDEX "blockchain_orders_createdAt_idx" ON "blockchain_orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_orderId_proofCid_key" ON "delivery_proofs"("orderId", "proofCid");

-- CreateIndex
CREATE INDEX "delivery_proofs_orderId_idx" ON "delivery_proofs"("orderId");

-- CreateIndex
CREATE INDEX "delivery_proofs_attestor_idx" ON "delivery_proofs"("attestor");

-- CreateIndex
CREATE INDEX "delivery_proofs_submittedAt_idx" ON "delivery_proofs"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_disputes_disputeId_key" ON "blockchain_disputes"("disputeId");

-- CreateIndex
CREATE INDEX "blockchain_disputes_disputeId_idx" ON "blockchain_disputes"("disputeId");

-- CreateIndex
CREATE INDEX "blockchain_disputes_orderId_idx" ON "blockchain_disputes"("orderId");

-- CreateIndex
CREATE INDEX "blockchain_disputes_plaintiff_idx" ON "blockchain_disputes"("plaintiff");

-- CreateIndex
CREATE INDEX "blockchain_disputes_defendant_idx" ON "blockchain_disputes"("defendant");

-- CreateIndex
CREATE INDEX "blockchain_disputes_status_idx" ON "blockchain_disputes"("status");

-- CreateIndex
CREATE INDEX "blockchain_disputes_createdAt_idx" ON "blockchain_disputes"("createdAt");
