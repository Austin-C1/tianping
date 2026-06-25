ALTER TABLE "DepositWallet"
  ADD COLUMN "pUsdBalance" DECIMAL(18, 8),
  ADD COLUMN "exchangeAllowance" DECIMAL(18, 8),
  ADD COLUMN "balanceAllowanceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "balanceAllowanceRaw" JSONB;
