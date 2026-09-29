-- AlterTable
ALTER TABLE "CohortMeeting" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AssessmentEvent" ADD COLUMN     "closingReminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pushTicket" (
    "id" TEXT NOT NULL,
    "pushTargetId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pushTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pushTicket_ticketId_key" ON "pushTicket"("ticketId");

-- CreateIndex
CREATE INDEX "pushTicket_createdAt_idx" ON "pushTicket"("createdAt");

-- CreateIndex
CREATE INDEX "pushTicket_pushTargetId_idx" ON "pushTicket"("pushTargetId");

-- AddForeignKey
ALTER TABLE "pushTicket" ADD CONSTRAINT "pushTicket_pushTargetId_fkey" FOREIGN KEY ("pushTargetId") REFERENCES "pushTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

