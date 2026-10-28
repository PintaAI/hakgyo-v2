-- AlterTable
ALTER TABLE "TtsJob" ADD COLUMN     "bankQuestionId" TEXT,
ALTER COLUMN "questionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BankQuestion" (
    "id" TEXT NOT NULL,
    "type" "AssessmentQuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "prompt" JSONB NOT NULL,
    "explanation" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "BankItemStatus" NOT NULL DEFAULT 'DRAFT',
    "meta" JSONB,
    "groupId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BankOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankGroup" (
    "id" TEXT NOT NULL,
    "instructions" JSONB,
    "stimulus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankQuestion_status_idx" ON "BankQuestion"("status");

-- CreateIndex
CREATE INDEX "BankQuestion_groupId_idx" ON "BankQuestion"("groupId");

-- CreateIndex
CREATE INDEX "BankQuestion_createdAt_idx" ON "BankQuestion"("createdAt");

-- CreateIndex
CREATE INDEX "BankQuestion_tags_idx" ON "BankQuestion" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "BankOption_questionId_idx" ON "BankOption"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentQuestionGroup_sourceGroupId_idx" ON "AssessmentQuestionGroup"("sourceGroupId");

-- CreateIndex
CREATE INDEX "TtsJob_bankQuestionId_idx" ON "TtsJob"("bankQuestionId");

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "BankQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestionGroup" ADD CONSTRAINT "AssessmentQuestionGroup_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "BankGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BankGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankOption" ADD CONSTRAINT "BankOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TtsJob" ADD CONSTRAINT "TtsJob_bankQuestionId_fkey" FOREIGN KEY ("bankQuestionId") REFERENCES "BankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

