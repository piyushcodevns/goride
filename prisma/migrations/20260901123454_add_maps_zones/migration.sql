-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('SERVICE', 'AIRPORT', 'TOLL', 'RESTRICTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'REASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'FORCE_COMPLETE';

-- CreateTable
CREATE TABLE "SupportedCity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportedCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL,
    "cityId" TEXT,
    "description" TEXT,
    "boundary" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportedCity_name_key" ON "SupportedCity"("name");

-- CreateIndex
CREATE INDEX "SupportedCity_isActive_idx" ON "SupportedCity"("isActive");

-- CreateIndex
CREATE INDEX "MapZone_type_idx" ON "MapZone"("type");

-- CreateIndex
CREATE INDEX "MapZone_cityId_idx" ON "MapZone"("cityId");

-- CreateIndex
CREATE INDEX "MapZone_isActive_idx" ON "MapZone"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MapZone_name_type_key" ON "MapZone"("name", "type");

-- AddForeignKey
ALTER TABLE "MapZone" ADD CONSTRAINT "MapZone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "SupportedCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
