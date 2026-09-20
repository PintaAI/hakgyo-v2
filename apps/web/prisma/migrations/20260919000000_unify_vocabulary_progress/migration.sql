-- CreateEnum
CREATE TYPE "VocabularyPracticeEvidence" AS ENUM ('RECOGNITION', 'RECALL', 'APPLICATION');

-- CreateEnum
CREATE TYPE "VocabularyPracticeResult" AS ENUM ('CORRECT', 'INCORRECT', 'REVEALED');

-- CreateTable
CREATE TABLE "VocabularyProgress" (
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "practicedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "correctRecallCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyProgress_pkey" PRIMARY KEY ("entryId","userId")
);

-- CreateTable
CREATE TABLE "VocabularyPracticeAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceCourseItemId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "evidence" "VocabularyPracticeEvidence" NOT NULL,
    "result" "VocabularyPracticeResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyPracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- Preserve the old learner state. Old remembered entries stay mastered so a
-- deployment never takes earned progress away.
INSERT INTO "VocabularyProgress" (
    "entryId",
    "userId",
    "contentHash",
    "practicedAt",
    "masteredAt",
    "nextReviewAt",
    "correctRecallCount",
    "updatedAt"
)
SELECT
    "entryId",
    "userId",
    "contentHash",
    "updatedAt",
    "rememberedAt",
    "nextReviewAt",
    CASE WHEN "rememberedAt" IS NOT NULL THEN 2 ELSE LEAST("passStreak", 1) END,
    "updatedAt"
FROM "VocabularyMemory";

-- CreateIndex
CREATE INDEX "VocabularyProgress_userId_masteredAt_idx" ON "VocabularyProgress"("userId", "masteredAt");
CREATE INDEX "VocabularyProgress_userId_nextReviewAt_idx" ON "VocabularyProgress"("userId", "nextReviewAt");
CREATE UNIQUE INDEX "VocabularyPracticeAttempt_userId_sessionId_entryId_key" ON "VocabularyPracticeAttempt"("userId", "sessionId", "entryId");
CREATE INDEX "VocabularyPracticeAttempt_userId_entryId_createdAt_idx" ON "VocabularyPracticeAttempt"("userId", "entryId", "createdAt");
CREATE INDEX "VocabularyPracticeAttempt_sourceCourseItemId_idx" ON "VocabularyPracticeAttempt"("sourceCourseItemId");

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyPracticeAttempt" ADD CONSTRAINT "VocabularyPracticeAttempt_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyPracticeAttempt" ADD CONSTRAINT "VocabularyPracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyPracticeAttempt" ADD CONSTRAINT "VocabularyPracticeAttempt_sourceCourseItemId_fkey" FOREIGN KEY ("sourceCourseItemId") REFERENCES "CourseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove the challenge protocol after all existing memory has been migrated.
DROP TABLE "VocabularyRecallChallenge";
DROP TABLE "VocabularyMemory";
