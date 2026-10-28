-- CreateEnum
CREATE TYPE "TtsJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TtsProvider" AS ENUM ('VOXCPM', 'OPENAI');

-- CreateTable
CREATE TABLE "TtsJob" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "TtsJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "TtsProvider",
    "clips" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TtsJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TtsJob_status_createdAt_idx" ON "TtsJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TtsJob_questionId_idx" ON "TtsJob"("questionId");

-- AddForeignKey
ALTER TABLE "TtsJob" ADD CONSTRAINT "TtsJob_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

