-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('WEB', 'MOBILE');

-- AlterTable
ALTER TABLE "UserFcmToken" ADD COLUMN     "platform" "DevicePlatform" NOT NULL DEFAULT 'MOBILE';
