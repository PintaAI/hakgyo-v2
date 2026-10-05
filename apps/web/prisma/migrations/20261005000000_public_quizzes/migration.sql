
-- CreateEnum
CREATE TYPE "PublicQuizStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "PublicQuiz" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PublicQuizStatus" NOT NULL DEFAULT 'DRAFT',
    "closesAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicQuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "displayName" TEXT,
    "contact" TEXT,
    "ipHash" TEXT,
    "answers" JSONB,
    "score" INTEGER,
    "maxScore" INTEGER,
    "durationSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "PublicQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicQuiz_assessmentId_key" ON "PublicQuiz"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicQuiz_assessmentId_organizationId_key" ON "PublicQuiz"("assessmentId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicQuiz_organizationId_slug_key" ON "PublicQuiz"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublicQuizAttempt_tokenHash_key" ON "PublicQuizAttempt"("tokenHash");

-- CreateIndex
CREATE INDEX "PublicQuizAttempt_quizId_score_durationSeconds_idx" ON "PublicQuizAttempt"("quizId", "score" DESC, "durationSeconds");

-- CreateIndex
CREATE INDEX "PublicQuizAttempt_quizId_ipHash_startedAt_idx" ON "PublicQuizAttempt"("quizId", "ipHash", "startedAt");

-- CreateIndex
CREATE INDEX "PublicQuizAttempt_quizId_startedAt_idx" ON "PublicQuizAttempt"("quizId", "startedAt");

-- AddForeignKey
ALTER TABLE "PublicQuiz" ADD CONSTRAINT "PublicQuiz_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicQuiz" ADD CONSTRAINT "PublicQuiz_assessmentId_organizationId_fkey" FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicQuizAttempt" ADD CONSTRAINT "PublicQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "PublicQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

