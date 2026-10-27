-- AlterTable: null follows the assessment's shuffle setting.
ALTER TABLE "AssessmentEvent" ALTER COLUMN "shuffleQuestions" DROP NOT NULL,
ALTER COLUMN "shuffleQuestions" DROP DEFAULT;

-- Events nobody has started yet follow their assessment from now on. Events with attempts keep the
-- shuffled order their learners saw.
UPDATE "AssessmentEvent" AS event
SET "shuffleQuestions" = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "AssessmentAttempt" AS attempt
  WHERE attempt."assessmentEventId" = event."id"
);
