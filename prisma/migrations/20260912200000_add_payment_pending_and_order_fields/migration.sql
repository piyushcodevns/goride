-- AlterEnum
ALTER TYPE "public"."RideStatus" ADD VALUE 'PAYMENT_PENDING';

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN "orderId" TEXT;
ALTER TABLE "public"."Payment" ADD COLUMN "razorpaySignature" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "public"."Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "public"."Payment"("orderId");
