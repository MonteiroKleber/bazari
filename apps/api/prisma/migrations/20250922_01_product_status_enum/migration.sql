-- Create enum type for product publication status
DO $$ BEGIN
  CREATE TYPE "ProductStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

