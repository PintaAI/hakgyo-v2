-- Points and scores may have up to two decimals (EPS-TOPIK: 2.5 per question). Widening int to
-- double precision keeps every stored value, and code that only writes integers keeps working.

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "scoreBands" JSONB;

-- AlterTable
ALTER TABLE "AssessmentQuestion" ALTER COLUMN "points" SET DEFAULT 1,
ALTER COLUMN "points" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AssessmentAttempt" ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxScore" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AssessmentAnswer" ALTER COLUMN "autoScore" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "manualScore" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PublicQuizAttempt" ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxScore" SET DATA TYPE DOUBLE PRECISION;

