DROP INDEX "VocabularyEntry_vocabularySetId_position_key";

ALTER TABLE "VocabularyEntry"
DROP CONSTRAINT "VocabularyEntry_position_check",
DROP COLUMN "position";
