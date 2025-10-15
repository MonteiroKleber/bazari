-- CreateTable: ChatSale (MOCK de vendas on-chain)
-- Esta tabela simula o que seria armazenado na blockchain
-- Será substituída por integração real posteriormente

CREATE TABLE "ChatSale" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" BIGINT NOT NULL,
  "buyer" TEXT NOT NULL,
  "seller" TEXT NOT NULL,
  "promoter" TEXT,
  "amount" NUMERIC(20, 8) NOT NULL,
  "commissionPercent" INTEGER NOT NULL DEFAULT 0,
  "commissionAmount" NUMERIC(20, 8) NOT NULL DEFAULT 0,
  "bazariFee" NUMERIC(20, 8) NOT NULL DEFAULT 0,
  "sellerAmount" NUMERIC(20, 8) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "txHash" TEXT,
  "receiptNftCid" TEXT,
  "proposalId" TEXT,
  "createdAt" BIGINT NOT NULL,
  "settledAt" BIGINT
);

CREATE INDEX "ChatSale_storeId_idx" ON "ChatSale"("storeId");
CREATE INDEX "ChatSale_buyer_idx" ON "ChatSale"("buyer");
CREATE INDEX "ChatSale_seller_idx" ON "ChatSale"("seller");
CREATE INDEX "ChatSale_promoter_idx" ON "ChatSale"("promoter");
CREATE INDEX "ChatSale_status_idx" ON "ChatSale"("status");
CREATE INDEX "ChatSale_createdAt_idx" ON "ChatSale"("createdAt" DESC);