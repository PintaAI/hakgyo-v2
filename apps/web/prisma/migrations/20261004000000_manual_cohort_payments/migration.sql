-- Manual cohort payments: an organization's static QRIS and bank accounts, and
-- the payments learners make to join paid cohorts. Gateway providers reuse
-- the Payment table through provider and providerPaymentId.
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'MIDTRANS', 'XENDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'PAID', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "OrganizationQris" (
    "organizationId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "merchantCity" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationQris_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "OrganizationBankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentInviteId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "method" "PaymentMethod" NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "instructions" JSONB NOT NULL,
    "providerPaymentId" TEXT,
    "providerData" JSONB,
    "proofKey" TEXT,
    "payerName" TEXT,
    "payerNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationBankAccount_organizationId_position_idx" ON "OrganizationBankAccount"("organizationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_cohortId_status_createdAt_idx" ON "Payment"("cohortId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_cohortId_userId_idx" ON "Payment"("cohortId", "userId");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_organizationId_status_createdAt_idx" ON "Payment"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_reviewedByUserId_idx" ON "Payment"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "Payment_enrollmentInviteId_idx" ON "Payment"("enrollmentInviteId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- AddForeignKey
ALTER TABLE "OrganizationQris" ADD CONSTRAINT "OrganizationQris_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBankAccount" ADD CONSTRAINT "OrganizationBankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cohortId_organizationId_fkey" FOREIGN KEY ("cohortId", "organizationId") REFERENCES "Cohort"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentInviteId_fkey" FOREIGN KEY ("enrollmentInviteId") REFERENCES "EnrollmentInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

