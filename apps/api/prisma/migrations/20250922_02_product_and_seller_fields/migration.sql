-- Add sellerUserId and status to Product, plus indices
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellerUserId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED';

DO $$ BEGIN
  CREATE INDEX "Product_sellerUserId_idx" ON "Product"("sellerUserId");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "Product_status_idx" ON "Product"("status");
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Add avatar/banner to SellerProfile
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;

