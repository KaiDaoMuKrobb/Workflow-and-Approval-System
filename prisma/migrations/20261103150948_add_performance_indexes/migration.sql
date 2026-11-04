-- CreateIndex
CREATE INDEX "ApprovalHistory_requestId_idx" ON "ApprovalHistory"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalHistory_actorId_idx" ON "ApprovalHistory"("actorId");

-- CreateIndex
CREATE INDEX "ExpenseItem_requestId_idx" ON "ExpenseItem"("requestId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_requesterId_idx" ON "ExpenseRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_assignedReviewerId_idx" ON "ExpenseRequest"("assignedReviewerId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_status_idx" ON "ExpenseRequest"("status");
