import type { Prisma } from "@prisma/client";

export interface CreateAuditLogInput {
  action: string;
  metadata?: Record<string, unknown>;
  userId: string | null;
}

export interface AuditLogsRepository {
  create(input: CreateAuditLogInput): Promise<void>;
}

export type DecimalLike = string | number | { toString(): string };

export interface DepositWalletFundingRecord {
  address: string | null;
  balanceAllowanceUpdatedAt: Date | null;
  chainId: number;
  exchangeAllowance: DecimalLike | null;
  id: string;
  pUsdBalance: DecimalLike | null;
  status: string;
}

export interface UpdateFundingSnapshotInput {
  balanceAllowanceRaw: unknown;
  balanceAllowanceUpdatedAt: Date;
  depositWalletId: string;
  exchangeAllowance: string;
  pUsdBalance: string;
}

export interface FundingRepository {
  findLatestDepositWalletFunding(userId: string): Promise<DepositWalletFundingRecord | null>;
  updateFundingSnapshot(input: UpdateFundingSnapshotInput): Promise<unknown>;
}

export interface OrderPreviewQuoteRecord {
  bestAsk: string | { toString(): string } | null;
  midpoint: string | { toString(): string } | null;
  minOrderSize: string | { toString(): string } | null;
  negRisk: boolean;
  outcome: string;
  outcomeIndex: number;
  tickSize: string | { toString(): string } | null;
  tokenId: string;
}

export interface OrderPreviewMarketRecord {
  active: boolean;
  closed: boolean;
  conditionId: string | null;
  id: string;
  marketId: string;
  outcomes: Prisma.JsonValue | null;
  question: string;
  quotes: OrderPreviewQuoteRecord[];
}

export interface CreatePreviewOrderInput {
  builderCode: string | null;
  clobStatus: string;
  failureReason: string | null;
  funderAddress: string | null;
  marketSnapshotId: string;
  orderType: string;
  outcome: string;
  price: string;
  rawPreview: Prisma.InputJsonObject;
  rawSignedOrder: Prisma.InputJsonObject | undefined;
  side: "BUY" | "SELL";
  signatureType: string;
  size: string;
  status: "PREVIEWED";
  tokenId: string;
  userId: string;
}

export interface OrdersRepository {
  createPreviewOrder(input: CreatePreviewOrderInput): Promise<{ id: string }>;
  findPreviewMarket(marketId: string): Promise<OrderPreviewMarketRecord | null>;
}

export interface DepositWalletRecord {
  address: string | null;
  chainId: number;
  id: string;
  ownerAddress: string;
  status: string;
  updatedAt: Date;
}

export interface WalletOperationRecord {
  failureReason: string | null;
  id: string;
  status: string;
  type: string;
  updatedAt: Date;
}

export interface WalletOperationLookupRecord {
  depositWalletId: string | null;
  id: string;
  status: string;
}

export interface RelayerTransactionRecord {
  failureReason: string | null;
  id: string;
  relayerTransactionId: string | null;
  status: string;
  updatedAt: Date;
}

export interface UpsertDepositWalletIntentInput {
  address: string | null;
  chainId: number;
  ownerAddress: string;
  raw: Record<string, unknown>;
  userId: string;
}

export interface CreateWalletOperationInput {
  depositWalletId: string;
  intentPayload: Record<string, unknown>;
  status: string;
  type: string;
  userId: string;
}

export interface FindDepositWalletByOwnerInput {
  chainId: number;
  ownerAddress: string;
  userId: string;
}

export interface FindWalletOperationForUserInput {
  operationId: string;
  type: string;
  userId: string;
}

export interface WalletOperationSignedPayloadInput {
  operationId: string;
  signedPayload: Record<string, unknown>;
}

export interface WalletOperationFailureInput extends WalletOperationSignedPayloadInput {
  failureReason: string;
}

export interface UpdateDepositWalletAfterRelayerInput {
  depositWalletAddress: string | null;
  depositWalletId: string;
  failureReason: string | null;
  raw: unknown;
  status: string;
}

export interface MarkDepositWalletFailedInput {
  depositWalletId: string;
  failureReason: string;
}

export interface CreateRelayerTransactionInput {
  depositWalletId: string;
  failureReason: string | null;
  raw: unknown;
  relayerTransactionId: string | null;
  status: string;
  userId: string;
  walletOperationId: string;
}

export interface LatestDepositWalletChildInput {
  depositWalletId: string;
  userId: string;
}

export interface DepositWalletsRepository {
  createRelayerTransaction(input: CreateRelayerTransactionInput): Promise<RelayerTransactionRecord>;
  createWalletOperation(input: CreateWalletOperationInput): Promise<{ id: string; status: string }>;
  findDepositWalletById(depositWalletId: string): Promise<DepositWalletRecord | null>;
  findDepositWalletByOwner(input: FindDepositWalletByOwnerInput): Promise<DepositWalletRecord | null>;
  findLatestDepositWallet(userId: string): Promise<DepositWalletRecord | null>;
  findLatestRelayerTransaction(input: LatestDepositWalletChildInput): Promise<RelayerTransactionRecord | null>;
  findLatestWalletOperation(input: LatestDepositWalletChildInput): Promise<WalletOperationRecord | null>;
  findWalletOperationForUser(input: FindWalletOperationForUserInput): Promise<WalletOperationLookupRecord | null>;
  markDepositWalletFailed(input: MarkDepositWalletFailedInput): Promise<unknown>;
  markWalletOperationFailed(input: WalletOperationFailureInput): Promise<unknown>;
  markWalletOperationSubmitted(input: WalletOperationSignedPayloadInput): Promise<unknown>;
  updateDepositWalletAfterRelayer(input: UpdateDepositWalletAfterRelayerInput): Promise<unknown>;
  upsertDepositWalletIntent(input: UpsertDepositWalletIntentInput): Promise<DepositWalletRecord>;
}

export interface WalletRecord {
  address: string;
  chainId: number;
}

export interface WalletChallengeRecord {
  consumedAt: Date | null;
  expiresAt: Date;
  id: string;
  message: string;
  nonce: string;
  userId: string;
}

export interface CreateWalletChallengeInput {
  expiresAt: Date;
  message: string;
  nonce: string;
  userId: string;
}

export interface ConnectEoaWalletInput {
  address: string;
  chainId: number;
  userId: string;
}

export interface ConsumeWalletChallengeInput {
  address: string;
  chainId: number;
  challengeId: string;
  consumedAt: Date;
}

export interface FindLatestWalletInput {
  type: "DEPOSIT" | "EOA";
  userId: string;
}

export interface FindConnectedEoaWalletInput {
  address: string;
  chainId: number;
  userId: string;
}

export interface WalletsRepository {
  connectEoaWallet(input: ConnectEoaWalletInput): Promise<unknown>;
  consumeChallenge(input: ConsumeWalletChallengeInput): Promise<unknown>;
  createChallenge(input: CreateWalletChallengeInput): Promise<CreateWalletChallengeResult>;
  findChallengeByNonce(nonce: string): Promise<WalletChallengeRecord | null>;
  findConnectedEoaWallet(input: FindConnectedEoaWalletInput): Promise<WalletRecord | null>;
  findLatestWallet(input: FindLatestWalletInput): Promise<WalletRecord | null>;
}

export interface CreateWalletChallengeResult {
  expiresAt: Date;
  message: string;
  nonce: string;
}
