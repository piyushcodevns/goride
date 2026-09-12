-- Add audit actions used by Module 17 file management.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPLACE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCESS';
