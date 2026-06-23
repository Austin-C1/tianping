ALTER TABLE "MarketSnapshot" ADD COLUMN "conditionId" TEXT;
ALTER TABLE "MarketSnapshot" ADD COLUMN "enableOrderBook" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketSnapshot" ADD COLUMN "clobTokenIds" JSONB;
ALTER TABLE "MarketSnapshot" ADD COLUMN "volume24hr" DECIMAL(18,8);

CREATE INDEX "MarketSnapshot_conditionId_idx" ON "MarketSnapshot"("conditionId");

CREATE TABLE "MarketQuoteSnapshot" (
  "id" TEXT NOT NULL,
  "marketSnapshotId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "outcomeIndex" INTEGER NOT NULL,
  "bestBid" DECIMAL(18,8),
  "bestAsk" DECIMAL(18,8),
  "midpoint" DECIMAL(18,8),
  "spread" DECIMAL(18,8),
  "minOrderSize" DECIMAL(18,8),
  "tickSize" DECIMAL(18,8),
  "orderBookHash" TEXT,
  "raw" JSONB,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketQuoteSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketQuoteSnapshot_tokenId_key" ON "MarketQuoteSnapshot"("tokenId");
CREATE INDEX "MarketQuoteSnapshot_marketSnapshotId_outcomeIndex_idx" ON "MarketQuoteSnapshot"("marketSnapshotId", "outcomeIndex");
CREATE INDEX "MarketQuoteSnapshot_syncedAt_idx" ON "MarketQuoteSnapshot"("syncedAt");

ALTER TABLE "MarketQuoteSnapshot"
  ADD CONSTRAINT "MarketQuoteSnapshot_marketSnapshotId_fkey"
  FOREIGN KEY ("marketSnapshotId") REFERENCES "MarketSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
