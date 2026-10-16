-- CreateIndex
CREATE INDEX "Payment_organizationId_status_paidAt_idx" ON "Payment"("organizationId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_organizationId_status_gradedAt_idx" ON "AssessmentAttempt"("organizationId", "status", "gradedAt");
