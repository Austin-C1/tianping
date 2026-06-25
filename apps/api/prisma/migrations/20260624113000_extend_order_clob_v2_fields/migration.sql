ALTER TABLE "Order"
  ADD COLUMN "tokenId" TEXT,
  ADD COLUMN "outcome" TEXT,
  ADD COLUMN "orderType" TEXT,
  ADD COLUMN "builderCode" TEXT,
  ADD COLUMN "funderAddress" TEXT,
  ADD COLUMN "signatureType" TEXT,
  ADD COLUMN "clobStatus" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "rawPreview" JSONB,
  ADD COLUMN "rawSignedOrder" JSONB;

CREATE INDEX "Order_tokenId_idx" ON "Order"("tokenId");
