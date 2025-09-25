/*
  Warnings:

  - Added the required column `updatedAt` to the `SellerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SellerProfile_userId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sellerStoreId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sellerStoreId" TEXT;

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "sellerStoreId" TEXT;

-- CreateIndex
CREATE INDEX "Order_sellerStoreId_idx" ON "Order"("sellerStoreId");

-- CreateIndex
CREATE INDEX "Product_sellerStoreId_idx" ON "Product"("sellerStoreId");

-- CreateIndex
CREATE INDEX "SellerProfile_userId_idx" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "ServiceOffering_sellerStoreId_idx" ON "ServiceOffering"("sellerStoreId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerStoreId_fkey" FOREIGN KEY ("sellerStoreId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_sellerStoreId_fkey" FOREIGN KEY ("sellerStoreId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
