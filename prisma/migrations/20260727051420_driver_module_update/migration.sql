/*
  Warnings:

  - You are about to drop the column `isOnline` on the `Driver` table. All the data in the column will be lost.
  - Added the required column `experience` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seats` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DriverAvailability" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY');

-- AlterTable
ALTER TABLE "public"."Driver" DROP COLUMN "isOnline",
ADD COLUMN     "availability" "public"."DriverAvailability" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "experience" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "seats" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "public"."Driver"("status");

-- CreateIndex
CREATE INDEX "Driver_availability_idx" ON "public"."Driver"("availability");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleType_idx" ON "public"."Vehicle"("vehicleType");
