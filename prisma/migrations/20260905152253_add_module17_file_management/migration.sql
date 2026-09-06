-- CreateEnum
CREATE TYPE "UserDocumentType" AS ENUM ('ID_PROOF', 'ADDRESS_PROOF', 'OTHER');

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'FILE';

-- CreateTable
CREATE TABLE "UserDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "UserDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDocument_userId_idx" ON "UserDocument"("userId");

-- CreateIndex
CREATE INDEX "UserDocument_documentType_idx" ON "UserDocument"("documentType");

-- CreateIndex
CREATE INDEX "UserDocument_createdAt_idx" ON "UserDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserDocument_userId_documentType_key" ON "UserDocument"("userId", "documentType");

-- AddForeignKey
ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
