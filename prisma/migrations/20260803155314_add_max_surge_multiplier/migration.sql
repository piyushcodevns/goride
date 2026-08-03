-- AlterTable
ALTER TABLE "public"."PricingConfig" ADD COLUMN     "maxSurgeMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 3.00;
