-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorOtp" TEXT,
ADD COLUMN     "twoFactorOtpExpiresAt" TIMESTAMP(3);
