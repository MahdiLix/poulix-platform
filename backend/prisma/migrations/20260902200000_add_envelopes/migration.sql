-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ENVELOPE_ALLOCATE';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ENVELOPE_RELEASE';

-- CreateEnum
CREATE TYPE "EnvelopeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnvelopeMovementType" AS ENUM ('ALLOCATE', 'RELEASE');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "envelopeId" TEXT;

-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(500),
    "allocatedAmount" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "status" "EnvelopeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvelopeMovement" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "amount" DECIMAL(20,0) NOT NULL,
    "type" "EnvelopeMovementType" NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvelopeMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Envelope_userId_createdAt_idx" ON "Envelope"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EnvelopeMovement_envelopeId_createdAt_idx" ON "EnvelopeMovement"("envelopeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnvelopeMovement_transactionId_key" ON "EnvelopeMovement"("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeMovement" ADD CONSTRAINT "EnvelopeMovement_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeMovement" ADD CONSTRAINT "EnvelopeMovement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
