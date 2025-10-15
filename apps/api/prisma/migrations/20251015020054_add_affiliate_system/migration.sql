-- CreateTable
CREATE TABLE "ChatStoreAffiliate" (
    "id" TEXT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customCommission" INTEGER,
    "monthlySalesCap" DECIMAL(20,8),
    "notes" TEXT,
    "requestedAt" BIGINT NOT NULL,
    "approvedAt" BIGINT,
    "rejectedAt" BIGINT,
    "suspendedAt" BIGINT,
    "totalSales" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "ChatStoreAffiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAffiliateInvite" (
    "id" TEXT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" BIGINT,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "defaultCommission" INTEGER NOT NULL DEFAULT 5,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatAffiliateInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatStoreAffiliate_promoterId_idx" ON "ChatStoreAffiliate"("promoterId");

-- CreateIndex
CREATE INDEX "ChatStoreAffiliate_storeId_status_idx" ON "ChatStoreAffiliate"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatStoreAffiliate_storeId_promoterId_key" ON "ChatStoreAffiliate"("storeId", "promoterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatAffiliateInvite_inviteCode_key" ON "ChatAffiliateInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "ChatAffiliateInvite_storeId_idx" ON "ChatAffiliateInvite"("storeId");

-- AddForeignKey
ALTER TABLE "ChatStoreAffiliate" ADD CONSTRAINT "ChatStoreAffiliate_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
