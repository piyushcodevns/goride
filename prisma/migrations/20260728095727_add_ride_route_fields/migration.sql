-- AlterTable
ALTER TABLE "public"."Ride" ADD COLUMN     "destinationLatitude" DOUBLE PRECISION,
ADD COLUMN     "destinationLongitude" DOUBLE PRECISION,
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3),
ADD COLUMN     "pickupLatitude" DOUBLE PRECISION,
ADD COLUMN     "pickupLongitude" DOUBLE PRECISION,
ADD COLUMN     "routeGeometry" JSONB;

-- CreateIndex
CREATE INDEX "Ride_vehicleType_idx" ON "public"."Ride"("vehicleType");
