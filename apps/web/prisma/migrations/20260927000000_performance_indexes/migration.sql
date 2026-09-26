-- DropIndex
DROP INDEX "CourseModule_courseId_idx";

-- DropIndex
DROP INDEX "Material_organizationId_idx";

-- DropIndex
DROP INDEX "AssessmentQuestion_assessmentId_idx";

-- DropIndex
DROP INDEX "AssessmentOption_questionId_idx";

-- DropIndex
DROP INDEX "VocabularySet_organizationId_idx";

-- DropIndex
DROP INDEX "UserActivityEvent_userId_activityDate_idx";

-- DropIndex
DROP INDEX "AssessmentAttempt_assessmentId_idx";

-- CreateIndex
CREATE INDEX "session_createdAt_idx" ON "session"("createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_organizationId_idx" ON "notification"("organizationId");

-- CreateIndex
CREATE INDEX "learnerSidebarSeen_organizationId_idx" ON "learnerSidebarSeen"("organizationId");

-- CreateIndex
CREATE INDEX "Cohort_organizationId_createdAt_idx" ON "Cohort"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Cohort_organizationId_updatedAt_idx" ON "Cohort"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "CohortMeeting_organizationId_status_startsAt_idx" ON "CohortMeeting"("organizationId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Material_organizationId_updatedAt_idx" ON "Material"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Assessment_organizationId_updatedAt_idx" ON "Assessment"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "VocabularySet_organizationId_updatedAt_idx" ON "VocabularySet"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "VocabularyEntry_vocabularySetId_createdAt_id_idx" ON "VocabularyEntry"("vocabularySetId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_contributesToStreak_activityDate_idx" ON "UserActivityEvent"("userId", "contributesToStreak", "activityDate");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_userId_idx" ON "AssessmentAttempt"("assessmentId", "userId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_userId_startedAt_idx" ON "AssessmentAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_organizationId_status_submittedAt_idx" ON "AssessmentAttempt"("organizationId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_organizationId_startedAt_idx" ON "AssessmentAttempt"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "VocabularyPracticeAttempt_entryId_idx" ON "VocabularyPracticeAttempt"("entryId");

