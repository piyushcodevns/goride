ALTER TABLE "User"
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "twoFactorLockedUntil" TIMESTAMP(3),
ADD COLUMN "twoFactorLastUsedStep" BIGINT;
