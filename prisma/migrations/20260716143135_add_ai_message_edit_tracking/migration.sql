-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalMessage" TEXT;
