-- Trigram GIN indexes below back case-insensitive "contains" searches.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "AssessmentEvent_courseId_status_createdAt_idx";

-- DropIndex
DROP INDEX "CohortMeeting_status_startsAt_idx";

-- DropIndex
DROP INDEX "Course_organizationId_status_idx";

-- DropIndex
DROP INDEX "UserActivityEvent_userId_action_occurredAt_idx";

-- DropIndex
DROP INDEX "VocabularyProgress_userId_nextReviewAt_idx";

-- DropIndex
DROP INDEX "learnerSidebarSeen_userId_organizationId_seenAt_idx";

-- CreateIndex
CREATE INDEX "Assessment_title_trgm_idx" ON "Assessment" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "AssessmentEvent_courseId_cohortId_createdAt_idx" ON "AssessmentEvent"("courseId", "cohortId", "createdAt");

-- CreateIndex
CREATE INDEX "CohortEnrollment_cohortId_enrolledAt_idx" ON "CohortEnrollment"("cohortId", "enrolledAt");

-- CreateIndex
CREATE INDEX "Course_status_createdAt_idx" ON "Course"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Course_organizationId_status_createdAt_idx" ON "Course"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Course_organizationId_updatedAt_idx" ON "Course"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Course_title_trgm_idx" ON "Course" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "CourseEnrollment_courseId_enrolledAt_idx" ON "CourseEnrollment"("courseId", "enrolledAt");

-- CreateIndex
CREATE INDEX "OrganizationInvite_invitedByMembershipId_idx" ON "OrganizationInvite"("invitedByMembershipId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_acceptedByUserId_idx" ON "OrganizationInvite"("acceptedByUserId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_createdAt_idx" ON "OrganizationMember"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PdfBook_createdByMembershipId_idx" ON "PdfBook"("createdByMembershipId");

-- CreateIndex
CREATE INDEX "VocabularyEntry_term_trgm_idx" ON "VocabularyEntry" USING GIN ("term" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "VocabularyEntry_definition_trgm_idx" ON "VocabularyEntry" USING GIN ("definition" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "adminAuditLog_actorUserId_createdAt_idx" ON "adminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "user_name_trgm_idx" ON "user" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_email_trgm_idx" ON "user" USING GIN ("email" gin_trgm_ops);

