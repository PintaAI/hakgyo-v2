-- CreateTable
CREATE TABLE "mobileClientVersion" (
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "protocol" INTEGER NOT NULL,
    "runtime" TEXT,
    "updateId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobileClientVersion_pkey" PRIMARY KEY ("userId","platform")
);

-- CreateIndex
CREATE INDEX "mobileClientVersion_lastSeenAt_idx" ON "mobileClientVersion"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "mobileClientVersion" ADD CONSTRAINT "mobileClientVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
