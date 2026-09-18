/*
  Warnings:

  - A unique constraint covering the columns `[refreshTokenHash]` on the table `AdminSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."AuditEntity" ADD VALUE 'ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_refreshTokenHash_key" ON "public"."AdminSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_refreshTokenHash_idx" ON "public"."AdminSession"("refreshTokenHash");
