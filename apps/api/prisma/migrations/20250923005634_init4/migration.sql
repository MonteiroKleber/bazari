-- AlterTable
ALTER TABLE "Dao" ADD COLUMN     "ownerUserId" TEXT;

-- CreateIndex
CREATE INDEX "Dao_ownerUserId_idx" ON "Dao"("ownerUserId");

-- AddForeignKey
ALTER TABLE "Dao" ADD CONSTRAINT "Dao_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
