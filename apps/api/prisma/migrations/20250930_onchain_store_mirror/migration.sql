-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "onChainStoreId" BIGINT;

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "onChainStoreId" BIGINT;

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "onChainStoreId" BIGINT,
ADD COLUMN     "operatorAddresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ownerAddress" TEXT;

-- CreateIndex
CREATE INDEX "Product_onChainStoreId_idx" ON "Product"("onChainStoreId");

-- CreateIndex
CREATE INDEX "ServiceOffering_onChainStoreId_idx" ON "ServiceOffering"("onChainStoreId");

-- CreateIndex
CREATE INDEX "SellerProfile_onChainStoreId_idx" ON "SellerProfile"("onChainStoreId");

-- CreateIndex
CREATE INDEX "SellerProfile_ownerAddress_idx" ON "SellerProfile"("ownerAddress");

-- CreateIndex
CREATE INDEX "SellerProfile_operatorAddresses_idx" ON "SellerProfile" USING GIN ("operatorAddresses");
