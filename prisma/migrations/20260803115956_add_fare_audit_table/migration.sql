/*
  Warnings:

  - You are about to alter the column `discountValue` on the `Coupon` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `minimumRideFare` on the `Coupon` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `maximumDiscount` on the `Coupon` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `discountAmount` on the `CouponUsage` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "public"."Coupon" ALTER COLUMN "discountValue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minimumRideFare" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "maximumDiscount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."CouponUsage" ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."Payment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."FareAudit" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "pricingConfigId" TEXT,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "distanceFare" DECIMAL(10,2) NOT NULL,
    "durationFare" DECIMAL(10,2) NOT NULL,
    "surgeAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "finalFare" DECIMAL(10,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FareAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FareAudit_rideId_key" ON "public"."FareAudit"("rideId");

-- CreateIndex
CREATE INDEX "FareAudit_rideId_idx" ON "public"."FareAudit"("rideId");

-- CreateIndex
CREATE INDEX "FareAudit_createdAt_idx" ON "public"."FareAudit"("createdAt");

-- CreateIndex
CREATE INDEX "Ride_createdAt_idx" ON "public"."Ride"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."FareAudit" ADD CONSTRAINT "FareAudit_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
