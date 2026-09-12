-- CreateEnum
CREATE TYPE "public"."CouponType" AS ENUM ('FLAT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "public"."Ride" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "finalFare" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."CouponType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minimumRideFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximumDiscount" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "perUserUsageLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "public"."Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "public"."Coupon"("isActive");

-- CreateIndex
CREATE INDEX "Coupon_validFrom_idx" ON "public"."Coupon"("validFrom");

-- CreateIndex
CREATE INDEX "Coupon_validUntil_idx" ON "public"."Coupon"("validUntil");

-- CreateIndex
CREATE INDEX "Coupon_createdById_idx" ON "public"."Coupon"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_rideId_key" ON "public"."CouponUsage"("rideId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "public"."CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_userId_idx" ON "public"."CouponUsage"("userId");

-- CreateIndex
CREATE INDEX "CouponUsage_usedAt_idx" ON "public"."CouponUsage"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_couponId_userId_rideId_key" ON "public"."CouponUsage"("couponId", "userId", "rideId");

-- CreateIndex
CREATE INDEX "Ride_couponId_idx" ON "public"."Ride"("couponId");

-- CreateIndex
CREATE INDEX "RideReview_createdAt_idx" ON "public"."RideReview"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Ride" ADD CONSTRAINT "Ride_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponUsage" ADD CONSTRAINT "CouponUsage_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
