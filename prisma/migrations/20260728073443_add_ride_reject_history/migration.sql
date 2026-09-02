-- CreateTable
CREATE TABLE "public"."RideReject" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideReject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideReject_rideId_idx" ON "public"."RideReject"("rideId");

-- CreateIndex
CREATE INDEX "RideReject_driverId_idx" ON "public"."RideReject"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "RideReject_rideId_driverId_key" ON "public"."RideReject"("rideId", "driverId");

-- AddForeignKey
ALTER TABLE "public"."RideReject" ADD CONSTRAINT "RideReject_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideReject" ADD CONSTRAINT "RideReject_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
