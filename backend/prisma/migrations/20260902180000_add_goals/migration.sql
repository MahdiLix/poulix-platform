-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'GOAL_CONTRIBUTE';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'GOAL_RELEASE';

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalContributionType" AS ENUM ('CONTRIBUTE', 'RELEASE');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "goalId" TEXT;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(500),
    "targetAmount" DECIMAL(20,0) NOT NULL,
    "savedAmount" DECIMAL(20,0) NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalContribution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DECIMAL(20,0) NOT NULL,
    "type" "GoalContributionType" NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_createdAt_idx" ON "Goal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GoalContribution_goalId_createdAt_idx" ON "GoalContribution"("goalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoalContribution_transactionId_key" ON "GoalContribution"("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
