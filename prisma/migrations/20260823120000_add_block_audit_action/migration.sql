-- Add the dedicated audit action used when an admin blocks a user account.
ALTER TYPE "public"."AuditAction" ADD VALUE IF NOT EXISTS 'BLOCK';
