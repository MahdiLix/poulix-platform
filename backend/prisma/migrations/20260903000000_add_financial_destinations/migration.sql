-- CreateEnum
CREATE TYPE "FinancialDestinationType" AS ENUM ('P2P_USER', 'BANK_ACCOUNT', 'SHABA', 'CARD');

-- CreateTable
CREATE TABLE "FinancialDestination" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "FinancialDestinationType" NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "maskedValue" VARCHAR(64) NOT NULL,
  "identifierHash" VARCHAR(64) NOT NULL,
  "encryptedValue" VARCHAR(500),
  "recipientUserId" TEXT,
  "recipientUsername" VARCHAR(120),
  "isSaved" BOOLEAN NOT NULL DEFAULT false,
  "useCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialDestination_userId_lastUsedAt_idx" ON "FinancialDestination"("userId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "FinancialDestination_userId_isSaved_idx" ON "FinancialDestination"("userId", "isSaved");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialDestination_userId_type_identifierHash_key" ON "FinancialDestination"("userId", "type", "identifierHash");

-- AddForeignKey
ALTER TABLE "FinancialDestination" ADD CONSTRAINT "FinancialDestination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialDestination" ADD CONSTRAINT "FinancialDestination_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
