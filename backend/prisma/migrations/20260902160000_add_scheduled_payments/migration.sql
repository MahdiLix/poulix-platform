-- CreateEnum
CREATE TYPE "ScheduledPaymentFrequency" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ScheduledPaymentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduledPaymentExecutionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "scheduledPaymentExecutionId" TEXT;

-- CreateTable
CREATE TABLE "ScheduledPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "amount" DECIMAL(20,0) NOT NULL,
    "reason" VARCHAR(200),
    "category" "TransactionCategory",
    "frequency" "ScheduledPaymentFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextExecutionAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "ScheduledPaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPaymentExecution" (
    "id" TEXT NOT NULL,
    "scheduledPaymentId" TEXT NOT NULL,
    "status" "ScheduledPaymentExecutionStatus" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "failureReason" VARCHAR(200),
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPaymentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPayment_userId_createdAt_idx" ON "ScheduledPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledPayment_status_nextExecutionAt_idx" ON "ScheduledPayment"("status", "nextExecutionAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPaymentExecution_scheduledPaymentId_scheduledFor_key" ON "ScheduledPaymentExecution"("scheduledPaymentId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledPaymentExecution_scheduledPaymentId_executedAt_idx" ON "ScheduledPaymentExecution"("scheduledPaymentId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_scheduledPaymentExecutionId_key" ON "Transaction"("scheduledPaymentExecutionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_scheduledPaymentExecutionId_fkey" FOREIGN KEY ("scheduledPaymentExecutionId") REFERENCES "ScheduledPaymentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPaymentExecution" ADD CONSTRAINT "ScheduledPaymentExecution_scheduledPaymentId_fkey" FOREIGN KEY ("scheduledPaymentId") REFERENCES "ScheduledPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
