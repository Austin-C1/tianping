CREATE UNIQUE INDEX "SyncJobRun_type_active_unique_idx"
  ON "SyncJobRun"("type")
  WHERE "status" IN ('QUEUED', 'RUNNING');
