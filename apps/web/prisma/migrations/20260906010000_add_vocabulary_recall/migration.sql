-- CreateTable
CREATE TABLE "VocabularyMemory" (
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "passStreak" INTEGER NOT NULL DEFAULT 0,
    "failStreak" INTEGER NOT NULL DEFAULT 0,
    "rememberedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyMemory_pkey" PRIMARY KEY ("entryId","userId")
);

-- CreateTable
CREATE TABLE "VocabularyRecallChallenge" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceCourseItemId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "expectedAnswer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "correct" BOOLEAN,

    CONSTRAINT "VocabularyRecallChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyMemory_userId_rememberedAt_idx" ON "VocabularyMemory"("userId", "rememberedAt");

-- CreateIndex
CREATE INDEX "VocabularyRecallChallenge_userId_entryId_createdAt_idx" ON "VocabularyRecallChallenge"("userId", "entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "VocabularyMemory" ADD CONSTRAINT "VocabularyMemory_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyMemory" ADD CONSTRAINT "VocabularyMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyRecallChallenge" ADD CONSTRAINT "VocabularyRecallChallenge_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyRecallChallenge" ADD CONSTRAINT "VocabularyRecallChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyRecallChallenge" ADD CONSTRAINT "VocabularyRecallChallenge_sourceCourseItemId_fkey" FOREIGN KEY ("sourceCourseItemId") REFERENCES "CourseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
