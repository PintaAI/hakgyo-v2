-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "themeEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "VocabularyEntry" ADD COLUMN     "imageAssetId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "adminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetId" TEXT,
    "targetType" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adminAuditLog_createdAt_idx" ON "adminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "adminAuditLog_targetUserId_createdAt_idx" ON "adminAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "VocabularyEntry_imageAssetId_idx" ON "VocabularyEntry"("imageAssetId");

-- RenameForeignKey
ALTER TABLE "VocabularyEntry" RENAME CONSTRAINT "VocabularyEntry_audioAssetId_fkey" TO "VocabularyEntry_audioAssetId_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "adminAuditLog" ADD CONSTRAINT "adminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adminAuditLog" ADD CONSTRAINT "adminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_imageAssetId_organizationId_fkey" FOREIGN KEY ("imageAssetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

