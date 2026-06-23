ALTER TABLE "MarketSnapshot" ADD COLUMN "category" TEXT;
ALTER TABLE "MarketSnapshot" ADD COLUMN "outcomes" JSONB;
ALTER TABLE "MarketSnapshot" ADD COLUMN "outcomePrices" JSONB;
ALTER TABLE "MarketSnapshot" ADD COLUMN "volume" DECIMAL(18,8);
ALTER TABLE "MarketSnapshot" ADD COLUMN "liquidity" DECIMAL(18,8);
