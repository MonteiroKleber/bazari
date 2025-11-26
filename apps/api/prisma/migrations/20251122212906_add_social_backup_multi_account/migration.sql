-- CreateTable
CREATE TABLE "SocialBackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountIndex" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "encryptedMnemonic" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL DEFAULT 150000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceFingerprint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SocialBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialBackup_address_key" ON "SocialBackup"("address");

-- CreateIndex
CREATE INDEX "SocialBackup_userId_isActive_idx" ON "SocialBackup"("userId", "isActive");

-- CreateIndex
CREATE INDEX "SocialBackup_address_idx" ON "SocialBackup"("address");

-- CreateIndex
CREATE INDEX "SocialBackup_lastUsedAt_idx" ON "SocialBackup"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialBackup_userId_accountIndex_key" ON "SocialBackup"("userId", "accountIndex");

-- AddForeignKey
ALTER TABLE "SocialBackup" ADD CONSTRAINT "SocialBackup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
