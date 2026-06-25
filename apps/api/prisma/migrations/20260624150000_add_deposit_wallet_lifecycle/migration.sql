CREATE TABLE "DepositWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "address" TEXT,
    "chainId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "depositWalletId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "intentPayload" JSONB,
    "signedPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RelayerTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "depositWalletId" TEXT,
    "walletOperationId" TEXT,
    "relayerTransactionId" TEXT,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelayerTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepositWallet_userId_ownerAddress_chainId_key" ON "DepositWallet"("userId", "ownerAddress", "chainId");
CREATE INDEX "DepositWallet_address_idx" ON "DepositWallet"("address");
CREATE INDEX "DepositWallet_userId_status_idx" ON "DepositWallet"("userId", "status");
CREATE INDEX "WalletOperation_userId_type_status_idx" ON "WalletOperation"("userId", "type", "status");
CREATE INDEX "WalletOperation_depositWalletId_updatedAt_idx" ON "WalletOperation"("depositWalletId", "updatedAt");
CREATE INDEX "RelayerTransaction_userId_status_idx" ON "RelayerTransaction"("userId", "status");
CREATE INDEX "RelayerTransaction_depositWalletId_updatedAt_idx" ON "RelayerTransaction"("depositWalletId", "updatedAt");
CREATE INDEX "RelayerTransaction_walletOperationId_updatedAt_idx" ON "RelayerTransaction"("walletOperationId", "updatedAt");
CREATE INDEX "RelayerTransaction_relayerTransactionId_idx" ON "RelayerTransaction"("relayerTransactionId");

ALTER TABLE "DepositWallet" ADD CONSTRAINT "DepositWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletOperation" ADD CONSTRAINT "WalletOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletOperation" ADD CONSTRAINT "WalletOperation_depositWalletId_fkey" FOREIGN KEY ("depositWalletId") REFERENCES "DepositWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RelayerTransaction" ADD CONSTRAINT "RelayerTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RelayerTransaction" ADD CONSTRAINT "RelayerTransaction_depositWalletId_fkey" FOREIGN KEY ("depositWalletId") REFERENCES "DepositWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RelayerTransaction" ADD CONSTRAINT "RelayerTransaction_walletOperationId_fkey" FOREIGN KEY ("walletOperationId") REFERENCES "WalletOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
