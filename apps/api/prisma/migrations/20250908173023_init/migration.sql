-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "ownerType" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "namePt" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "pathSlugs" TEXT[],
    "pathNamesPt" TEXT[],
    "pathNamesEn" TEXT[],
    "pathNamesEs" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySpec" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "inheritsFrom" TEXT,
    "jsonSchema" JSONB NOT NULL,
    "uiSchema" JSONB NOT NULL,
    "indexHints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "daoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceBzr" DECIMAL(20,12) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryPath" TEXT[],
    "attributes" JSONB NOT NULL,
    "attributesSpecVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "daoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "basePriceBzr" DECIMAL(20,12),
    "categoryId" TEXT NOT NULL,
    "categoryPath" TEXT[],
    "attributes" JSONB NOT NULL,
    "attributesSpecVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "ip" TEXT,
    "ua" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_ownerType_ownerId_idx" ON "MediaAsset"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "MediaAsset_contentHash_idx" ON "MediaAsset"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_kind_level_idx" ON "Category"("kind", "level");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_pathSlugs_idx" ON "Category" USING GIN ("pathSlugs");

-- CreateIndex
CREATE INDEX "CategorySpec_categoryId_idx" ON "CategorySpec"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySpec_categoryId_version_key" ON "CategorySpec"("categoryId", "version");

-- CreateIndex
CREATE INDEX "Product_daoId_idx" ON "Product"("daoId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_categoryPath_idx" ON "Product" USING GIN ("categoryPath");

-- CreateIndex
CREATE INDEX "ServiceOffering_daoId_idx" ON "ServiceOffering"("daoId");

-- CreateIndex
CREATE INDEX "ServiceOffering_categoryId_idx" ON "ServiceOffering"("categoryId");

-- CreateIndex
CREATE INDEX "ServiceOffering_categoryPath_idx" ON "ServiceOffering" USING GIN ("categoryPath");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
