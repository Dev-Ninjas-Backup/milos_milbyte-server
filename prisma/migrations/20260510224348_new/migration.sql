/*
  Warnings:

  - The `passengers` column on the `AiMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN     "parameters_extracted" JSONB,
ALTER COLUMN "travelers" SET DATA TYPE TEXT,
DROP COLUMN "passengers",
ADD COLUMN     "passengers" JSONB;
