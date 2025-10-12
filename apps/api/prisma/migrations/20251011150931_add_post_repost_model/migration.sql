-- CreateTable
CREATE TABLE "PostRepost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRepost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostRepost_postId_idx" ON "PostRepost"("postId");

-- CreateIndex
CREATE INDEX "PostRepost_profileId_idx" ON "PostRepost"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PostRepost_postId_profileId_key" ON "PostRepost"("postId", "profileId");

-- AddForeignKey
ALTER TABLE "PostRepost" ADD CONSTRAINT "PostRepost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRepost" ADD CONSTRAINT "PostRepost_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
