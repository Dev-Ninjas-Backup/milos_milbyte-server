-- CreateTable
CREATE TABLE "UserSavedDestination" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedDestination_userId_destinationId_key" ON "UserSavedDestination"("userId", "destinationId");

-- AddForeignKey
ALTER TABLE "UserSavedDestination" ADD CONSTRAINT "UserSavedDestination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedDestination" ADD CONSTRAINT "UserSavedDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
