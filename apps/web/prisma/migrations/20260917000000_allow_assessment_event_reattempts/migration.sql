DROP INDEX "AssessmentAttempt_assessmentEventId_userId_key";

CREATE INDEX "AssessmentAttempt_assessmentEventId_userId_attemptNumber_idx"
ON "AssessmentAttempt"("assessmentEventId", "userId", "attemptNumber");
