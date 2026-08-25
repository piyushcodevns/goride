/*
  Warnings:

  - Added the required column `category` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('ECONOMY', 'PREMIUM', 'LUXURY');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('RC', 'INSURANCE', 'PERMIT', 'FITNESS');

-- CreateEnum
CREATE TYPE "VehicleDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "category" "VehicleCategory" NOT NULL,
ADD COLUMN     "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "documentType" "VehicleDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT,
    "status" "VehicleDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDocument_documentType_idx" ON "VehicleDocument"("documentType");

-- CreateIndex
CREATE INDEX "VehicleDocument_status_idx" ON "VehicleDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDocument_vehicleId_documentType_key" ON "VehicleDocument"("vehicleId", "documentType");

-- CreateIndex
CREATE INDEX "Vehicle_category_idx" ON "Vehicle"("category");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
