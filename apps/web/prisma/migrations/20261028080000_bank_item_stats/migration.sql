-- CreateTable
CREATE TABLE "BankItemStats" (
    "questionId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "correctRate" DOUBLE PRECISION NOT NULL,
    "discrimination" DOUBLE PRECISION,
    "unansweredRate" DOUBLE PRECISION NOT NULL,
    "optionRates" JSONB NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankItemStats_pkey" PRIMARY KEY ("questionId")
);

-- AddForeignKey
ALTER TABLE "BankItemStats" ADD CONSTRAINT "BankItemStats_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

