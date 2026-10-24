-- AlterTable
ALTER TABLE "VocabularyEntry" ADD COLUMN "meanings" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: every existing definition becomes the entry's only meaning.
UPDATE "VocabularyEntry"
SET "meanings" = ARRAY["definition"]
WHERE cardinality("meanings") = 0 AND btrim("definition") <> '';
