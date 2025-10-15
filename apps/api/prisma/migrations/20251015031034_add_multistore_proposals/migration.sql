-- AlterTable
ALTER TABLE "ChatProposal" ADD COLUMN     "isMultiStore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storeGroups" JSONB;

-- CreateIndex
CREATE INDEX "ChatSale_proposalId_idx" ON "ChatSale"("proposalId");

-- AddForeignKey
ALTER TABLE "ChatSale" ADD CONSTRAINT "ChatSale_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ChatProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
