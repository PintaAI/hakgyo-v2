-- CreateEnum
CREATE TYPE "CourseProgressionMode" AS ENUM ('OPEN', 'SEQUENTIAL');

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "progressionMode" "CourseProgressionMode" NOT NULL DEFAULT 'OPEN';
