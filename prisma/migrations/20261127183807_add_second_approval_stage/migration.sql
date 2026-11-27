-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'PENDING_SECOND_APPROVAL';

-- AlterTable
ALTER TABLE "ExpenseRequest" ADD COLUMN     "secondReviewerId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseRequest_secondReviewerId_idx" ON "ExpenseRequest"("secondReviewerId");

-- AddForeignKey
ALTER TABLE "ExpenseRequest" ADD CONSTRAINT "ExpenseRequest_secondReviewerId_fkey" FOREIGN KEY ("secondReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
