
-- DropIndex
DROP INDEX "PublicQuizAttempt_quizId_score_durationSeconds_idx";

-- AlterTable
ALTER TABLE "PublicQuiz" ADD COLUMN     "ctaClickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PublicQuizAttempt" ADD COLUMN     "contactConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "PublicQuizAttempt_quizId_round_score_durationSeconds_idx" ON "PublicQuizAttempt"("quizId", "round", "score" DESC, "durationSeconds");

