-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'security',
  "event" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "requestId" TEXT,
  "actorUserId" TEXT,
  "path" TEXT,
  "ipAddress" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_channel_createdAt_idx" ON "AuditLog"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_event_createdAt_idx" ON "AuditLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
