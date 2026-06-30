CREATE TABLE "LiveTradingApproval" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "approvalReason" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokeReason" TEXT,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveTradingApproval_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LiveTradingApproval"
  ADD CONSTRAINT "LiveTradingApproval_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveTradingApproval"
  ADD CONSTRAINT "LiveTradingApproval_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LiveTradingApproval_status_approvedAt_idx"
  ON "LiveTradingApproval"("status", "approvedAt");

CREATE INDEX "LiveTradingApproval_approvedById_approvedAt_idx"
  ON "LiveTradingApproval"("approvedById", "approvedAt");

CREATE INDEX "LiveTradingApproval_revokedById_revokedAt_idx"
  ON "LiveTradingApproval"("revokedById", "revokedAt");

CREATE INDEX "LiveTradingApproval_revokedAt_approvedAt_idx"
  ON "LiveTradingApproval"("revokedAt", "approvedAt");

CREATE UNIQUE INDEX "LiveTradingApproval_one_active_idx"
  ON "LiveTradingApproval"((1))
  WHERE "status" = 'APPROVED' AND "revokedAt" IS NULL;
