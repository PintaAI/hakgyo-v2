-- CreateEnum
CREATE TYPE "AssessmentSubmissionSource" AS ENUM ('LEARNER', 'AUTO_CLOSE', 'DEVICE_LATE');

-- CreateEnum
CREATE TYPE "AssessmentLogKind" AS ENUM ('QUESTION_SHOWN', 'ANSWERED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "AssessmentLogSource" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "AssessmentAttempt" ADD COLUMN     "lastLogSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offlineSyncedAt" TIMESTAMP(3),
ADD COLUMN     "runtimeVersion" INTEGER,
ADD COLUMN     "submittedVia" "AssessmentSubmissionSource";

-- AlterTable
ALTER TABLE "AssessmentAnswer" ADD COLUMN     "answeredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AssessmentAttemptLog" (
    "attemptId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "kind" "AssessmentLogKind" NOT NULL,
    "questionId" TEXT,
    "optionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" TEXT,
    "clientAt" TIMESTAMP(3) NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "AssessmentLogSource" NOT NULL,

    CONSTRAINT "AssessmentAttemptLog_pkey" PRIMARY KEY ("attemptId","seq")
);

-- AddForeignKey
ALTER TABLE "AssessmentAttemptLog" ADD CONSTRAINT "AssessmentAttemptLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

