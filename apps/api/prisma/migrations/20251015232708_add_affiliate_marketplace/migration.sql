/*
  Warnings:

  - You are about to drop the `ChatSale` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatSale" DROP CONSTRAINT "ChatSale_proposalId_fkey";

-- DropTable
DROP TABLE "ChatSale";

-- CreateTable
CREATE TABLE "AffiliateSale" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT,
    "storeId" BIGINT NOT NULL,
    "buyer" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "promoter" TEXT,
    "amount" DECIMAL(20,8) NOT NULL,
    "commissionPercent" INTEGER NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "bazariFee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "sellerAmount" DECIMAL(20,8) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "receiptNftCid" TEXT,
    "proposalId" TEXT,
    "createdAt" BIGINT NOT NULL,
    "settledAt" BIGINT,

    CONSTRAINT "AffiliateSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateMarketplace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'bazari',
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "metadataCid" TEXT,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "AffiliateMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateProduct" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "productPrice" DECIMAL(20,8) NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "customDescription" TEXT,
    "customImageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "addedAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "AffiliateProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateSale_storeId_idx" ON "AffiliateSale"("storeId");

-- CreateIndex
CREATE INDEX "AffiliateSale_buyer_idx" ON "AffiliateSale"("buyer");

-- CreateIndex
CREATE INDEX "AffiliateSale_seller_idx" ON "AffiliateSale"("seller");

-- CreateIndex
CREATE INDEX "AffiliateSale_promoter_idx" ON "AffiliateSale"("promoter");

-- CreateIndex
CREATE INDEX "AffiliateSale_marketplaceId_idx" ON "AffiliateSale"("marketplaceId");

-- CreateIndex
CREATE INDEX "AffiliateSale_status_idx" ON "AffiliateSale"("status");

-- CreateIndex
CREATE INDEX "AffiliateSale_proposalId_idx" ON "AffiliateSale"("proposalId");

-- CreateIndex
CREATE INDEX "AffiliateSale_createdAt_idx" ON "AffiliateSale"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateMarketplace_slug_key" ON "AffiliateMarketplace"("slug");

-- CreateIndex
CREATE INDEX "AffiliateMarketplace_ownerId_idx" ON "AffiliateMarketplace"("ownerId");

-- CreateIndex
CREATE INDEX "AffiliateMarketplace_slug_idx" ON "AffiliateMarketplace"("slug");

-- CreateIndex
CREATE INDEX "AffiliateMarketplace_isActive_isPublic_idx" ON "AffiliateMarketplace"("isActive", "isPublic");

-- CreateIndex
CREATE INDEX "AffiliateProduct_marketplaceId_idx" ON "AffiliateProduct"("marketplaceId");

-- CreateIndex
CREATE INDEX "AffiliateProduct_storeId_idx" ON "AffiliateProduct"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProduct_marketplaceId_storeId_productId_key" ON "AffiliateProduct"("marketplaceId", "storeId", "productId");

-- AddForeignKey
ALTER TABLE "AffiliateSale" ADD CONSTRAINT "AffiliateSale_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "AffiliateMarketplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateSale" ADD CONSTRAINT "AffiliateSale_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ChatProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMarketplace" ADD CONSTRAINT "AffiliateMarketplace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateProduct" ADD CONSTRAINT "AffiliateProduct_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "AffiliateMarketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
