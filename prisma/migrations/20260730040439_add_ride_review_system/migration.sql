-- AlterTable
ALTER TABLE "public"."Driver" ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."RideReview" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideReview_rideId_key" ON "public"."RideReview"("rideId");

-- CreateIndex
CREATE INDEX "RideReview_driverId_idx" ON "public"."RideReview"("driverId");

-- CreateIndex
CREATE INDEX "RideReview_userId_idx" ON "public"."RideReview"("userId");

-- AddForeignKey
ALTER TABLE "public"."RideReview" ADD CONSTRAINT "RideReview_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideReview" ADD CONSTRAINT "RideReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideReview" ADD CONSTRAINT "RideReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
