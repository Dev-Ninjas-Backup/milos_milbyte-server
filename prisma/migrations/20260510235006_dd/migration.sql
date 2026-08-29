/*
  Warnings:

  - You are about to drop the column `budget` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `citizenship` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `passengers` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `AiMessage` table. All the data in the column will be lost.
  - You are about to drop the column `travelers` on the `AiMessage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AiMessage" DROP COLUMN "budget",
DROP COLUMN "citizenship",
DROP COLUMN "endDate",
DROP COLUMN "experience",
DROP COLUMN "location",
DROP COLUMN "passengers",
DROP COLUMN "startDate",
DROP COLUMN "travelers";
