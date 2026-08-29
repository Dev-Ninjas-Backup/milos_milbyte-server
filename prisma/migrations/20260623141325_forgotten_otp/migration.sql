-- AlterTable
ALTER TABLE "User" ADD COLUMN     "forgotPasswordOtp" TEXT,
ADD COLUMN     "forgotPasswordOtpExpiry" TIMESTAMP(3);
