CREATE TABLE "SyncJobRun" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "queueJobId" TEXT,
  "requestedById" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyncJobRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SyncJobRun"
  ADD CONSTRAINT "SyncJobRun_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SyncJobRun_type_status_createdAt_idx"
  ON "SyncJobRun"("type", "status", "createdAt");

CREATE INDEX "SyncJobRun_requestedById_createdAt_idx"
  ON "SyncJobRun"("requestedById", "createdAt");

CREATE INDEX "SyncJobRun_queueJobId_idx"
  ON "SyncJobRun"("queueJobId");

CREATE INDEX "SyncJobRun_status_updatedAt_idx"
  ON "SyncJobRun"("status", "updatedAt");
