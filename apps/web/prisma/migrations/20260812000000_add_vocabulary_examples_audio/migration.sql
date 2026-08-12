ALTER TABLE "VocabularyEntry"
ADD COLUMN "examples" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "audioAssetId" TEXT,
ADD COLUMN "organizationId" TEXT;

UPDATE "VocabularyEntry" entry
SET "organizationId" = vocabulary_set."organizationId"
FROM "VocabularySet" vocabulary_set
WHERE vocabulary_set."id" = entry."vocabularySetId";

ALTER TABLE "VocabularyEntry"
ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "VocabularyEntry"
DROP CONSTRAINT "VocabularyEntry_vocabularySetId_fkey";

ALTER TABLE "VocabularyEntry"
ADD CONSTRAINT "VocabularyEntry_vocabularySetId_organizationId_fkey"
FOREIGN KEY ("vocabularySetId", "organizationId")
REFERENCES "VocabularySet"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "VocabularyEntry_audioAssetId_idx" ON "VocabularyEntry"("audioAssetId");

ALTER TABLE "VocabularyEntry"
ADD CONSTRAINT "VocabularyEntry_audioAssetId_fkey"
FOREIGN KEY ("audioAssetId", "organizationId") REFERENCES "Asset"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
