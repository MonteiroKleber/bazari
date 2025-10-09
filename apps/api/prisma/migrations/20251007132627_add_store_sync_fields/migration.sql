-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "categoriesCid" TEXT,
ADD COLUMN     "categoriesHash" TEXT,
ADD COLUMN     "lastPublishedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncBlock" BIGINT,
ADD COLUMN     "metadataCid" TEXT,
ADD COLUMN     "productsCid" TEXT,
ADD COLUMN     "productsHash" TEXT,
ADD COLUMN     "syncStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "version" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "StorePublishHistory" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "extrinsicHash" TEXT,
    "metadataCid" TEXT NOT NULL,
    "categoriesCid" TEXT NOT NULL,
    "categoriesHash" TEXT NOT NULL,
    "productsCid" TEXT NOT NULL,
    "productsHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePublishHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePublishHistory_sellerProfileId_version_idx" ON "StorePublishHistory"("sellerProfileId", "version");

-- CreateIndex
CREATE INDEX "StorePublishHistory_blockNumber_idx" ON "StorePublishHistory"("blockNumber");

-- CreateIndex
CREATE INDEX "StorePublishHistory_publishedAt_idx" ON "StorePublishHistory"("publishedAt");

-- CreateIndex
CREATE INDEX "SellerProfile_syncStatus_idx" ON "SellerProfile"("syncStatus");

-- AddForeignKey
ALTER TABLE "StorePublishHistory" ADD CONSTRAINT "StorePublishHistory_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
