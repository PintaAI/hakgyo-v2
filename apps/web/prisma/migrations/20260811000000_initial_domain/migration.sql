-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "EnrollmentMode" AS ENUM ('OPEN', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CohortStaffRole" AS ENUM ('TEACHER', 'MODERATOR');

-- CreateEnum
CREATE TYPE "ZoomConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CohortMeetingStatus" AS ENUM ('SCHEDULED', 'STARTED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CourseItemType" AS ENUM ('MATERIAL', 'ASSESSMENT', 'VOCABULARY_SET');

-- CreateEnum
CREATE TYPE "RequirementPolicy" AS ENUM ('ALL', 'ANY');

-- CreateEnum
CREATE TYPE "MaterialRequirementType" AS ENUM ('ASSESSMENT', 'VOCABULARY_SET');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN');

-- CreateEnum
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'GRADED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('OPEN', 'INVITE', 'PURCHASE', 'MANUAL', 'COHORT');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultEnrollmentMode" "EnrollmentMode" NOT NULL DEFAULT 'INVITE_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "enrollmentMode" "EnrollmentMode",
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "whatsappGroupUrl" TEXT,
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "enrollmentMode" "EnrollmentMode",
    "price" INTEGER,
    "capacity" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoomConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectedByMembershipId" TEXT NOT NULL,
    "zoomAccountId" TEXT NOT NULL,
    "zoomUserId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "status" "ZoomConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortMeeting" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "zoomMeetingId" TEXT,
    "zoomMeetingUuid" TEXT,
    "joinUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "CohortMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CohortMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortStaff" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationMemberId" TEXT NOT NULL,
    "role" "CohortStaffRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseItem" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "CourseItemType" NOT NULL,
    "position" INTEGER NOT NULL,
    "materialId" TEXT,
    "assessmentId" TEXT,
    "vocabularySetId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "editorSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "requirementPolicy" "RequirementPolicy" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequirement" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "MaterialRequirementType" NOT NULL,
    "assessmentId" TEXT,
    "vocabularySetId" TEXT,
    "minimumScore" INTEGER,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "editorSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "instructions" JSONB,
    "passingScore" INTEGER,
    "maxAttempts" INTEGER,
    "timeLimitMinutes" INTEGER,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "type" "AssessmentQuestionType" NOT NULL,
    "prompt" JSONB NOT NULL,
    "explanation" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularySet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularySet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" TEXT NOT NULL,
    "vocabularySetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "EnrollmentSource" NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortEnrollment" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "EnrollmentSource" NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CohortEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentInvite" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT,
    "createdByMembershipId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentProgress" (
    "id" TEXT NOT NULL,
    "courseItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "courseItemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "maxScore" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" JSONB,
    "autoScore" INTEGER,
    "manualScore" INTEGER,
    "feedback" JSONB,
    "reviewedByMembershipId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswerSelection" (
    "answerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "AssessmentAnswerSelection_pkey" PRIMARY KEY ("answerId","optionId")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "etag" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialAsset" (
    "materialId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "MaterialAsset_pkey" PRIMARY KEY ("materialId","assetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_id_organizationId_key" ON "OrganizationMember"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Course_ownerMembershipId_idx" ON "Course"("ownerMembershipId");

-- CreateIndex
CREATE INDEX "Course_organizationId_status_idx" ON "Course"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Course_organizationId_slug_key" ON "Course"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_id_organizationId_key" ON "Course"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Cohort_courseId_status_idx" ON "Cohort"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_id_courseId_key" ON "Cohort"("id", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_id_organizationId_key" ON "Cohort"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoomConnection_organizationId_key" ON "ZoomConnection"("organizationId");

-- CreateIndex
CREATE INDEX "ZoomConnection_connectedByMembershipId_idx" ON "ZoomConnection"("connectedByMembershipId");

-- CreateIndex
CREATE INDEX "ZoomConnection_zoomAccountId_idx" ON "ZoomConnection"("zoomAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortMeeting_zoomMeetingId_key" ON "CohortMeeting"("zoomMeetingId");

-- CreateIndex
CREATE INDEX "CohortMeeting_cohortId_startsAt_idx" ON "CohortMeeting"("cohortId", "startsAt");

-- CreateIndex
CREATE INDEX "CohortMeeting_createdByMembershipId_idx" ON "CohortMeeting"("createdByMembershipId");

-- CreateIndex
CREATE INDEX "CohortMeeting_status_startsAt_idx" ON "CohortMeeting"("status", "startsAt");

-- CreateIndex
CREATE INDEX "CohortStaff_organizationMemberId_idx" ON "CohortStaff"("organizationMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortStaff_cohortId_organizationMemberId_key" ON "CohortStaff"("cohortId", "organizationMemberId");

-- CreateIndex
CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_courseId_position_key" ON "CourseModule"("courseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CourseModule_id_organizationId_key" ON "CourseModule"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CourseItem_materialId_idx" ON "CourseItem"("materialId");

-- CreateIndex
CREATE INDEX "CourseItem_assessmentId_idx" ON "CourseItem"("assessmentId");

-- CreateIndex
CREATE INDEX "CourseItem_vocabularySetId_idx" ON "CourseItem"("vocabularySetId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseItem_moduleId_position_key" ON "CourseItem"("moduleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CourseItem_id_organizationId_key" ON "CourseItem"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Material_organizationId_idx" ON "Material"("organizationId");

-- CreateIndex
CREATE INDEX "Material_createdByMembershipId_idx" ON "Material"("createdByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_id_organizationId_key" ON "Material"("id", "organizationId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_assessmentId_idx" ON "MaterialRequirement"("assessmentId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_vocabularySetId_idx" ON "MaterialRequirement"("vocabularySetId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequirement_materialId_position_key" ON "MaterialRequirement"("materialId", "position");

-- CreateIndex
CREATE INDEX "Assessment_organizationId_status_idx" ON "Assessment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Assessment_createdByMembershipId_idx" ON "Assessment"("createdByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_id_organizationId_key" ON "Assessment"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_position_key" ON "AssessmentQuestion"("assessmentId", "position");

-- CreateIndex
CREATE INDEX "AssessmentOption_questionId_idx" ON "AssessmentOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_questionId_position_key" ON "AssessmentOption"("questionId", "position");

-- CreateIndex
CREATE INDEX "VocabularySet_organizationId_idx" ON "VocabularySet"("organizationId");

-- CreateIndex
CREATE INDEX "VocabularySet_createdByMembershipId_idx" ON "VocabularySet"("createdByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySet_id_organizationId_key" ON "VocabularySet"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyEntry_vocabularySetId_position_key" ON "VocabularyEntry"("vocabularySetId", "position");

-- CreateIndex
CREATE INDEX "CourseEnrollment_userId_status_idx" ON "CourseEnrollment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_courseId_userId_key" ON "CourseEnrollment"("courseId", "userId");

-- CreateIndex
CREATE INDEX "CohortEnrollment_userId_status_idx" ON "CohortEnrollment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CohortEnrollment_cohortId_userId_key" ON "CohortEnrollment"("cohortId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentInvite_token_key" ON "EnrollmentInvite"("token");

-- CreateIndex
CREATE INDEX "EnrollmentInvite_courseId_idx" ON "EnrollmentInvite"("courseId");

-- CreateIndex
CREATE INDEX "EnrollmentInvite_cohortId_idx" ON "EnrollmentInvite"("cohortId");

-- CreateIndex
CREATE INDEX "EnrollmentInvite_createdByMembershipId_idx" ON "EnrollmentInvite"("createdByMembershipId");

-- CreateIndex
CREATE INDEX "ContentProgress_userId_status_idx" ON "ContentProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentProgress_courseItemId_userId_key" ON "ContentProgress"("courseItemId", "userId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_userId_status_idx" ON "AssessmentAttempt"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_courseItemId_userId_attemptNumber_key" ON "AssessmentAttempt"("courseItemId", "userId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_id_organizationId_key" ON "AssessmentAttempt"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AssessmentAnswer_questionId_idx" ON "AssessmentAnswer"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentAnswer_reviewedByMembershipId_idx" ON "AssessmentAnswer"("reviewedByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswer_attemptId_questionId_key" ON "AssessmentAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswer_id_organizationId_key" ON "AssessmentAnswer"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AssessmentAnswerSelection_optionId_idx" ON "AssessmentAnswerSelection"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_objectKey_key" ON "Asset"("objectKey");

-- CreateIndex
CREATE INDEX "Asset_organizationId_deletedAt_idx" ON "Asset"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Asset_uploadedByUserId_deletedAt_idx" ON "Asset"("uploadedByUserId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_id_organizationId_key" ON "Asset"("id", "organizationId");

-- CreateIndex
CREATE INDEX "MaterialAsset_assetId_idx" ON "MaterialAsset"("assetId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_ownerMembershipId_organizationId_fkey" FOREIGN KEY ("ownerMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_courseId_organizationId_fkey" FOREIGN KEY ("courseId", "organizationId") REFERENCES "Course"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomConnection" ADD CONSTRAINT "ZoomConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomConnection" ADD CONSTRAINT "ZoomConnection_connectedByMembershipId_organizationId_fkey" FOREIGN KEY ("connectedByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMeeting" ADD CONSTRAINT "CohortMeeting_cohortId_organizationId_fkey" FOREIGN KEY ("cohortId", "organizationId") REFERENCES "Cohort"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMeeting" ADD CONSTRAINT "CohortMeeting_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortStaff" ADD CONSTRAINT "CohortStaff_cohortId_organizationId_fkey" FOREIGN KEY ("cohortId", "organizationId") REFERENCES "Cohort"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortStaff" ADD CONSTRAINT "CohortStaff_organizationMemberId_organizationId_fkey" FOREIGN KEY ("organizationMemberId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_organizationId_fkey" FOREIGN KEY ("courseId", "organizationId") REFERENCES "Course"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_moduleId_organizationId_fkey" FOREIGN KEY ("moduleId", "organizationId") REFERENCES "CourseModule"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_materialId_organizationId_fkey" FOREIGN KEY ("materialId", "organizationId") REFERENCES "Material"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_assessmentId_organizationId_fkey" FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_vocabularySetId_organizationId_fkey" FOREIGN KEY ("vocabularySetId", "organizationId") REFERENCES "VocabularySet"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_materialId_organizationId_fkey" FOREIGN KEY ("materialId", "organizationId") REFERENCES "Material"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_assessmentId_organizationId_fkey" FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_vocabularySetId_organizationId_fkey" FOREIGN KEY ("vocabularySetId", "organizationId") REFERENCES "VocabularySet"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySet" ADD CONSTRAINT "VocabularySet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySet" ADD CONSTRAINT "VocabularySet_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_vocabularySetId_fkey" FOREIGN KEY ("vocabularySetId") REFERENCES "VocabularySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_courseId_organizationId_fkey" FOREIGN KEY ("courseId", "organizationId") REFERENCES "Course"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_cohortId_courseId_fkey" FOREIGN KEY ("cohortId", "courseId") REFERENCES "Cohort"("id", "courseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_courseItemId_fkey" FOREIGN KEY ("courseItemId") REFERENCES "CourseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_organizationId_fkey" FOREIGN KEY ("assessmentId", "organizationId") REFERENCES "Assessment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_courseItemId_organizationId_fkey" FOREIGN KEY ("courseItemId", "organizationId") REFERENCES "CourseItem"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_attemptId_organizationId_fkey" FOREIGN KEY ("attemptId", "organizationId") REFERENCES "AssessmentAttempt"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_reviewedByMembershipId_organizationId_fkey" FOREIGN KEY ("reviewedByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswerSelection" ADD CONSTRAINT "AssessmentAnswerSelection_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "AssessmentAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswerSelection" ADD CONSTRAINT "AssessmentAnswerSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AssessmentOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAsset" ADD CONSTRAINT "MaterialAsset_materialId_organizationId_fkey" FOREIGN KEY ("materialId", "organizationId") REFERENCES "Material"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAsset" ADD CONSTRAINT "MaterialAsset_assetId_organizationId_fkey" FOREIGN KEY ("assetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain checks not expressible in Prisma's schema language.
ALTER TABLE "Course" ADD CONSTRAINT "Course_price_check" CHECK ("price" >= 0);
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_price_check" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0);
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_dates_check" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" >= "startsAt");
ALTER TABLE "CohortMeeting" ADD CONSTRAINT "CohortMeeting_durationMinutes_check" CHECK ("durationMinutes" > 0);
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_position_check" CHECK ("position" >= 0);
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_position_check" CHECK ("position" >= 0);
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_target_check" CHECK (
  ("type" = 'MATERIAL' AND "materialId" IS NOT NULL AND "assessmentId" IS NULL AND "vocabularySetId" IS NULL)
  OR ("type" = 'ASSESSMENT' AND "materialId" IS NULL AND "assessmentId" IS NOT NULL AND "vocabularySetId" IS NULL)
  OR ("type" = 'VOCABULARY_SET' AND "materialId" IS NULL AND "assessmentId" IS NULL AND "vocabularySetId" IS NOT NULL)
);
ALTER TABLE "Material" ADD CONSTRAINT "Material_editorSchemaVersion_check" CHECK ("editorSchemaVersion" > 0);
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_position_check" CHECK ("position" >= 0);
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_minimumScore_check" CHECK ("minimumScore" IS NULL OR "minimumScore" >= 0);
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_target_check" CHECK (
  ("type" = 'ASSESSMENT' AND "assessmentId" IS NOT NULL AND "vocabularySetId" IS NULL)
  OR ("type" = 'VOCABULARY_SET' AND "assessmentId" IS NULL AND "vocabularySetId" IS NOT NULL AND "minimumScore" IS NULL)
);
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_editorSchemaVersion_check" CHECK ("editorSchemaVersion" > 0);
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_passingScore_check" CHECK ("passingScore" IS NULL OR "passingScore" >= 0);
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_maxAttempts_check" CHECK ("maxAttempts" IS NULL OR "maxAttempts" > 0);
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_timeLimitMinutes_check" CHECK ("timeLimitMinutes" IS NULL OR "timeLimitMinutes" > 0);
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_publishedAt_check" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_points_check" CHECK ("points" > 0);
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_position_check" CHECK ("position" >= 0);
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_position_check" CHECK ("position" >= 0);
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_position_check" CHECK ("position" >= 0);
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_maxUses_check" CHECK ("maxUses" IS NULL OR "maxUses" > 0);
ALTER TABLE "EnrollmentInvite" ADD CONSTRAINT "EnrollmentInvite_useCount_check" CHECK ("useCount" >= 0 AND ("maxUses" IS NULL OR "useCount" <= "maxUses"));
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_attemptNumber_check" CHECK ("attemptNumber" > 0);
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_scores_check" CHECK (
  ("score" IS NULL OR "score" >= 0)
  AND ("maxScore" IS NULL OR "maxScore" >= 0)
  AND ("score" IS NULL OR "maxScore" IS NULL OR "score" <= "maxScore")
);
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_scores_check" CHECK (
  ("autoScore" IS NULL OR "autoScore" >= 0)
  AND ("manualScore" IS NULL OR "manualScore" >= 0)
);
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_size_check" CHECK ("size" > 0);
