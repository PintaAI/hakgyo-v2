-- Learner-owned records are removed with the user. Staff-authored records remain
-- restricted and are checked before account deletion.
ALTER TABLE "CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_userId_fkey";
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CohortEnrollment" DROP CONSTRAINT "CohortEnrollment_userId_fkey";
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentProgress" DROP CONSTRAINT "ContentProgress_userId_fkey";
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentAttempt" DROP CONSTRAINT "AssessmentAttempt_userId_fkey";
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Organization assets must survive when their uploader deletes their account.
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_uploadedByUserId_fkey";
ALTER TABLE "Asset" ALTER COLUMN "uploadedByUserId" DROP NOT NULL;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
