/*
  Warnings:

  - You are about to drop the column `forgotPasswordOtpExpiry` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "forgotPasswordOtpExpiry",
ADD COLUMN     "forgotPasswordOtpExpiresAt" TIMESTAMP(3);
