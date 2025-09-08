-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- DropIndex
DROP INDEX "AuditLog_actor_idx";

-- CreateIndex
CREATE INDEX "Product_title_idx" ON "Product"("title");

-- CreateIndex
CREATE INDEX "Product_description_idx" ON "Product"("description");

-- CreateIndex
CREATE INDEX "Product_attributes_idx" ON "Product" USING GIN ("attributes");

-- CreateIndex
CREATE INDEX "Product_priceBzr_idx" ON "Product"("priceBzr");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceOffering_title_idx" ON "ServiceOffering"("title");

-- CreateIndex
CREATE INDEX "ServiceOffering_description_idx" ON "ServiceOffering"("description");

-- CreateIndex
CREATE INDEX "ServiceOffering_attributes_idx" ON "ServiceOffering" USING GIN ("attributes");

-- CreateIndex
CREATE INDEX "ServiceOffering_basePriceBzr_idx" ON "ServiceOffering"("basePriceBzr");

-- CreateIndex
CREATE INDEX "ServiceOffering_createdAt_idx" ON "ServiceOffering"("createdAt");
