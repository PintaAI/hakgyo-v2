-- CreateEnum
CREATE TYPE "PdfBookStatus" AS ENUM ('PROCESSING', 'READY');

-- CreateTable
CREATE TABLE "PdfBook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByMembershipId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "pageOffset" INTEGER NOT NULL DEFAULT 0,
    "status" "PdfBookStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfBookPage" (
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "thumbnailAssetId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "text" TEXT,

    CONSTRAINT "PdfBookPage_pkey" PRIMARY KEY ("bookId","pageNumber")
);

-- CreateIndex
CREATE INDEX "PdfBook_organizationId_status_idx" ON "PdfBook"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PdfBook_id_organizationId_key" ON "PdfBook"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfBookPage_assetId_key" ON "PdfBookPage"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfBookPage_thumbnailAssetId_key" ON "PdfBookPage"("thumbnailAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfBookPage_assetId_organizationId_key" ON "PdfBookPage"("assetId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfBookPage_thumbnailAssetId_organizationId_key" ON "PdfBookPage"("thumbnailAssetId", "organizationId");

-- AddForeignKey
ALTER TABLE "PdfBook" ADD CONSTRAINT "PdfBook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfBook" ADD CONSTRAINT "PdfBook_createdByMembershipId_organizationId_fkey" FOREIGN KEY ("createdByMembershipId", "organizationId") REFERENCES "OrganizationMember"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfBookPage" ADD CONSTRAINT "PdfBookPage_bookId_organizationId_fkey" FOREIGN KEY ("bookId", "organizationId") REFERENCES "PdfBook"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfBookPage" ADD CONSTRAINT "PdfBookPage_assetId_organizationId_fkey" FOREIGN KEY ("assetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfBookPage" ADD CONSTRAINT "PdfBookPage_thumbnailAssetId_organizationId_fkey" FOREIGN KEY ("thumbnailAssetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

