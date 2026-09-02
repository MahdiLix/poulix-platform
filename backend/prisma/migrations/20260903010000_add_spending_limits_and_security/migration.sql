-- CreateEnum
CREATE TYPE "SpendingLimitType" AS ENUM (
  'DAILY_TRANSFER',
  'DAILY_WITHDRAWAL',
  'MONTHLY_TRANSFER',
  'MONTHLY_WITHDRAWAL'
);

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM (
  'NEW_DEVICE_LOGIN',
  'FAILED_LOGIN',
  'FAILED_TRANSFER',
  'FAILED_WITHDRAWAL',
  'LIMIT_EXCEEDED',
  'SUSPICIOUS_ACTIVITY',
  'SESSION_REVOKED'
);

-- CreateTable
CREATE TABLE "UserSpendingLimit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SpendingLimitType" NOT NULL,
  "maxAmount" DECIMAL(20,0) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSpendingLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceKey" VARCHAR(64) NOT NULL,
  "deviceLabel" VARCHAR(120),
  "userAgent" VARCHAR(500),
  "ipAddress" VARCHAR(45),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SecurityEventType" NOT NULL,
  "metadata" JSONB,
  "ipAddress" VARCHAR(45),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSpendingLimit_userId_type_key" ON "UserSpendingLimit"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_userId_deviceKey_key" ON "UserSession"("userId", "deviceKey");

-- CreateIndex
CREATE INDEX "UserSession_userId_lastSeenAt_idx" ON "UserSession"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_type_createdAt_idx" ON "SecurityEvent"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSpendingLimit" ADD CONSTRAINT "UserSpendingLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
