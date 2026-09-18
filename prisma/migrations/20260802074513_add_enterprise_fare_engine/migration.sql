/*
  Warnings:

  - You are about to drop the column `fare` on the `Ride` table. All the data in the column will be lost.
  - You are about to alter the column `discountAmount` on the `Ride` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `finalFare` on the `Ride` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('INR');

-- AlterTable
ALTER TABLE "public"."Ride" DROP COLUMN "fare",
ADD COLUMN     "airportCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "baseFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bookingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "distanceFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "durationFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "surgeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "surgeMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
ADD COLUMN     "tollCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "waitingCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "finalFare" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."PricingConfig" (
    "id" TEXT NOT NULL,
    "vehicleType" "public"."VehicleType" NOT NULL,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "pricePerKm" DECIMAL(10,2) NOT NULL,
    "pricePerMinute" DECIMAL(10,2) NOT NULL,
    "minimumFare" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "bookingFee" DECIMAL(10,2) NOT NULL,
    "gstPercentage" DECIMAL(5,2) NOT NULL,
    "waitingChargePerMinute" DECIMAL(10,2) NOT NULL,
    "airportCharge" DECIMAL(10,2) NOT NULL,
    "peakMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "nightMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "rainMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "eventMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "currency" "public"."Currency" NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_vehicleType_key" ON "public"."PricingConfig"("vehicleType");

-- CreateIndex
CREATE INDEX "PricingConfig_vehicleType_idx" ON "public"."PricingConfig"("vehicleType");

-- CreateIndex
CREATE INDEX "PricingConfig_isActive_idx" ON "public"."PricingConfig"("isActive");
