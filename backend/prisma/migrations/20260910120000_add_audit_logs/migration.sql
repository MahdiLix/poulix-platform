-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "event" VARCHAR(80) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "result" VARCHAR(20) NOT NULL,
  "userId" TEXT,
  "resourceType" VARCHAR(80),
  "resourceId" VARCHAR(64),
  "requestId" VARCHAR(64),
  "ip" VARCHAR(45),
  "userAgent" VARCHAR(200),
  "metadata" JSONB,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
