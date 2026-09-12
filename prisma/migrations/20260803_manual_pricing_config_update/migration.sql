-- AlterTable
ALTER TABLE "public"."PricingConfig" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT 'DEFAULT';

-- DropIndex
DROP INDEX IF EXISTS "public"."PricingConfig_vehicleType_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PricingConfig_city_vehicleType_key" ON "public"."PricingConfig"("city", "vehicleType");