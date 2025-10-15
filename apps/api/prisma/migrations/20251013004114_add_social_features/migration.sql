-- CreateTable
CREATE TABLE "ChatTrustBadge" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "nftId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" BIGINT NOT NULL,

    CONSTRAINT "ChatTrustBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "approveVotes" INTEGER NOT NULL DEFAULT 0,
    "rejectVotes" INTEGER NOT NULL DEFAULT 0,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" BIGINT,
    "resolutionNotes" TEXT,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReportVote" (
    "reportId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "votedAt" BIGINT NOT NULL,

    CONSTRAINT "ChatReportVote_pkey" PRIMARY KEY ("reportId","voterId")
);

-- CreateTable
CREATE TABLE "ChatGroupPoll" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "votes" JSONB NOT NULL DEFAULT '{}',
    "endsAt" BIGINT,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "ChatGroupPoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatTrustBadge_profileId_idx" ON "ChatTrustBadge"("profileId");

-- CreateIndex
CREATE INDEX "ChatTrustBadge_isActive_idx" ON "ChatTrustBadge"("isActive");

-- CreateIndex
CREATE INDEX "ChatReport_reporterId_idx" ON "ChatReport"("reporterId");

-- CreateIndex
CREATE INDEX "ChatReport_reportedId_idx" ON "ChatReport"("reportedId");

-- CreateIndex
CREATE INDEX "ChatReport_status_idx" ON "ChatReport"("status");

-- CreateIndex
CREATE INDEX "ChatReport_createdAt_idx" ON "ChatReport"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChatReportVote_reportId_idx" ON "ChatReportVote"("reportId");

-- CreateIndex
CREATE INDEX "ChatReportVote_voterId_idx" ON "ChatReportVote"("voterId");

-- CreateIndex
CREATE INDEX "ChatGroupPoll_groupId_idx" ON "ChatGroupPoll"("groupId");

-- CreateIndex
CREATE INDEX "ChatGroupPoll_createdAt_idx" ON "ChatGroupPoll"("createdAt" DESC);
