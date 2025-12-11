-- Migration: Remove IPFS fields from Stores, Auth, and Affiliates modules
-- This migration removes redundant IPFS-related fields that are no longer used
-- The data is now stored directly in PostgreSQL instead of being duplicated to IPFS

-- ============================================================================
-- 1. Remove IPFS fields from Profile (Auth module)
-- ============================================================================
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "metadataCid";

-- ============================================================================
-- 2. Remove IPFS fields from SellerProfile (Stores module)
-- ============================================================================
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsHash";

-- ============================================================================
-- 3. Remove IPFS fields from StorePublishHistory
-- ============================================================================
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsHash";

-- ============================================================================
-- 4. Remove IPFS fields from AffiliateMarketplace
-- ============================================================================
ALTER TABLE "AffiliateMarketplace" DROP COLUMN IF EXISTS "metadataCid";

-- ============================================================================
-- 5. Drop StoreSnapshot table (redundant cache)
-- ============================================================================
DROP TABLE IF EXISTS "StoreSnapshot";
