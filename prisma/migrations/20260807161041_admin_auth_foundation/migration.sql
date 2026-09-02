-- CreateEnum
CREATE TYPE "public"."LoginStatus" AS ENUM ('SUCCESS', 'FAILED', 'LOCKED', 'LOGOUT');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'SUSPEND', 'ACTIVATE', 'CANCEL', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."AuditEntity" AS ENUM ('USER', 'DRIVER', 'VEHICLE', 'RIDE', 'PAYMENT', 'COUPON', 'PRICING', 'NOTIFICATION', 'SETTINGS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "public"."UserRole" ADD VALUE 'OPERATIONS_MANAGER';
ALTER TYPE "public"."UserRole" ADD VALUE 'FINANCE_MANAGER';
ALTER TYPE "public"."UserRole" ADD VALUE 'SUPPORT_EXECUTIVE';
ALTER TYPE "public"."UserRole" ADD VALUE 'DRIVER_MANAGER';
ALTER TYPE "public"."UserRole" ADD VALUE 'MARKETING_MANAGER';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "accountLockedUntil" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastPasswordResetAt" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminLoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "public"."LoginStatus" NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "entity" "public"."AuditEntity" NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "public"."AdminSession"("userId");

-- CreateIndex
CREATE INDEX "AdminSession_isRevoked_idx" ON "public"."AdminSession"("isRevoked");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "public"."AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminLoginHistory_userId_idx" ON "public"."AdminLoginHistory"("userId");

-- CreateIndex
CREATE INDEX "AdminLoginHistory_email_idx" ON "public"."AdminLoginHistory"("email");

-- CreateIndex
CREATE INDEX "AdminLoginHistory_status_idx" ON "public"."AdminLoginHistory"("status");

-- CreateIndex
CREATE INDEX "AdminLoginHistory_createdAt_idx" ON "public"."AdminLoginHistory"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "public"."AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "public"."AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminLoginHistory" ADD CONSTRAINT "AdminLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
