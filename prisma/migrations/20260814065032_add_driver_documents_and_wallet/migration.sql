-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('LICENSE', 'AADHAAR', 'RC', 'INSURANCE', 'PERMIT', 'FITNESS');

-- CreateEnum
CREATE TYPE "DriverDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverWalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "DriverWalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "documentType" "DriverDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT,
    "status" "DriverDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWallet" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "DriverWalletTransactionType" NOT NULL,
    "status" "DriverWalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverDocument_driverId_idx" ON "DriverDocument"("driverId");

-- CreateIndex
CREATE INDEX "DriverDocument_documentType_idx" ON "DriverDocument"("documentType");

-- CreateIndex
CREATE INDEX "DriverDocument_status_idx" ON "DriverDocument"("status");

-- CreateIndex
CREATE INDEX "DriverDocument_createdAt_idx" ON "DriverDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DriverDocument_driverId_documentType_key" ON "DriverDocument"("driverId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "DriverWallet_driverId_key" ON "DriverWallet"("driverId");

-- CreateIndex
CREATE INDEX "DriverWallet_driverId_idx" ON "DriverWallet"("driverId");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_walletId_idx" ON "DriverWalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_type_idx" ON "DriverWalletTransaction"("type");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_status_idx" ON "DriverWalletTransaction"("status");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_referenceId_idx" ON "DriverWalletTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_createdAt_idx" ON "DriverWalletTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWallet" ADD CONSTRAINT "DriverWallet_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWalletTransaction" ADD CONSTRAINT "DriverWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DriverWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
