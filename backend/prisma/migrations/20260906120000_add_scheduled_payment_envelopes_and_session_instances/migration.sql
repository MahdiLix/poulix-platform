-- User sessions are individual login instances. Device environments are grouped
-- when they are returned by the security API.
DROP INDEX "UserSession_userId_deviceKey_key";

CREATE INDEX "UserSession_userId_deviceKey_idx"
ON "UserSession"("userId", "deviceKey");

-- Persist the selected funding envelope for every scheduled execution.
ALTER TABLE "ScheduledPayment" ADD COLUMN "envelopeId" TEXT;

CREATE INDEX "ScheduledPayment_envelopeId_idx"
ON "ScheduledPayment"("envelopeId");

ALTER TABLE "ScheduledPayment"
ADD CONSTRAINT "ScheduledPayment_envelopeId_fkey"
FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
