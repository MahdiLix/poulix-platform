-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "counterpartyUserId" TEXT,
ADD COLUMN "relatedTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_relatedTransactionId_key" ON "Transaction"("relatedTransactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterpartyUserId_fkey" FOREIGN KEY ("counterpartyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
