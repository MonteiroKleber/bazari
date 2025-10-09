-- CreateTable
CREATE TABLE "StoreSnapshot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storeJson" JSONB NOT NULL,
    "categoriesJson" JSONB,
    "productsJson" JSONB,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreSnapshot_storeId_idx" ON "StoreSnapshot"("storeId");

-- CreateIndex
CREATE INDEX "StoreSnapshot_cachedAt_idx" ON "StoreSnapshot"("cachedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSnapshot_storeId_version_key" ON "StoreSnapshot"("storeId", "version");
