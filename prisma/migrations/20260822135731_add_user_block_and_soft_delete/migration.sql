-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isBlocked_idx" ON "User"("isBlocked");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
