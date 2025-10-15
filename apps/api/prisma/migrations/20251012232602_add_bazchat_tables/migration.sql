-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "participants" TEXT[],
    "orderId" TEXT,
    "groupId" TEXT,
    "lastMessageAt" BIGINT NOT NULL,
    "metadata" JSONB,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromProfile" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "mediaCid" TEXT,
    "meta" JSONB,
    "createdAt" BIGINT NOT NULL,
    "deliveredAt" BIGINT,
    "readAt" BIGINT,
    "replyTo" TEXT,
    "editedAt" BIGINT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'community',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "adminIds" TEXT[],
    "memberIds" TEXT[],
    "maxMembers" INTEGER DEFAULT 500,
    "metadata" JSONB,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatProposal" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(20,8) NOT NULL,
    "shipping" JSONB,
    "total" DECIMAL(20,8) NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expiresAt" BIGINT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "ChatProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCommissionPolicy" (
    "storeId" BIGINT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'open',
    "percent" INTEGER NOT NULL DEFAULT 5,
    "minReputation" INTEGER,
    "dailyCommissionCap" DECIMAL(20,8),
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "StoreCommissionPolicy_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "ChatMission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward" DECIMAL(20,8) NOT NULL,
    "type" TEXT NOT NULL,
    "requirements" JSONB,
    "maxCompletions" INTEGER,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatOpportunity" (
    "id" TEXT NOT NULL,
    "storeId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "compensation" TEXT,
    "requirements" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" BIGINT NOT NULL,
    "expiresAt" BIGINT,

    CONSTRAINT "ChatOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatThread_participants_idx" ON "ChatThread"("participants");

-- CreateIndex
CREATE INDEX "ChatThread_lastMessageAt_idx" ON "ChatThread"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "ChatThread_kind_idx" ON "ChatThread"("kind");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_fromProfile_idx" ON "ChatMessage"("fromProfile");

-- CreateIndex
CREATE INDEX "ChatMessage_type_idx" ON "ChatMessage"("type");

-- CreateIndex
CREATE INDEX "ChatGroup_adminIds_idx" ON "ChatGroup"("adminIds");

-- CreateIndex
CREATE INDEX "ChatGroup_memberIds_idx" ON "ChatGroup"("memberIds");

-- CreateIndex
CREATE INDEX "ChatGroup_kind_idx" ON "ChatGroup"("kind");

-- CreateIndex
CREATE INDEX "ChatGroup_isPublic_idx" ON "ChatGroup"("isPublic");

-- CreateIndex
CREATE INDEX "ChatProposal_threadId_idx" ON "ChatProposal"("threadId");

-- CreateIndex
CREATE INDEX "ChatProposal_sellerId_idx" ON "ChatProposal"("sellerId");

-- CreateIndex
CREATE INDEX "ChatProposal_status_idx" ON "ChatProposal"("status");

-- CreateIndex
CREATE INDEX "ChatMission_status_expiresAt_idx" ON "ChatMission"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ChatMission_createdBy_idx" ON "ChatMission"("createdBy");

-- CreateIndex
CREATE INDEX "ChatOpportunity_storeId_idx" ON "ChatOpportunity"("storeId");

-- CreateIndex
CREATE INDEX "ChatOpportunity_status_idx" ON "ChatOpportunity"("status");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatProposal" ADD CONSTRAINT "ChatProposal_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
