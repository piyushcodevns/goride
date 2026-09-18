-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('GENERAL', 'COMPANY', 'MAINTENANCE', 'UPLOAD');

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" "SettingCategory" NOT NULL,
    "value" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");
