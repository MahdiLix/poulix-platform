-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM (
  'ADMIN_LOGIN',
  'USER_VIEWED',
  'USER_DISABLED',
  'USER_ENABLED',
  'USER_LOCKED',
  'USER_UNLOCKED',
  'TRANSACTION_VIEWED',
  'PAYMENT_VIEWED'
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "statusChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "statusReason" VARCHAR(200);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateTable
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "action" "AdminAuditAction" NOT NULL,
  "targetType" VARCHAR(80) NOT NULL,
  "targetId" VARCHAR(64),
  "success" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "ipAddress" VARCHAR(45),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
