-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM (
  'DINNER',
  'LUNCH',
  'RENT',
  'SHOPPING',
  'GIFT',
  'TRANSPORTATION',
  'FAMILY_SUPPORT',
  'OTHER'
);

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "reason" VARCHAR(200),
ADD COLUMN "category" "TransactionCategory";
