import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  service!: string;

  @ApiProperty()
  stage!: string;
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiPropertyOptional({ enum: ["ADMIN", "USER"] })
  role?: "ADMIN" | "USER";
}

export class AuthResultDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class MarketQuoteItemDto {
  @ApiProperty()
  outcome!: string;

  @ApiProperty()
  outcomeIndex!: number;

  @ApiProperty()
  tokenId!: string;

  @ApiProperty({ nullable: true, type: String })
  bestBid!: string | null;

  @ApiProperty({ nullable: true, type: String })
  bestAsk!: string | null;

  @ApiProperty({ nullable: true, type: String })
  midpoint!: string | null;

  @ApiProperty({ nullable: true, type: String })
  spread!: string | null;

  @ApiProperty({ nullable: true, type: String })
  minOrderSize!: string | null;

  @ApiPropertyOptional()
  negRisk?: boolean;

  @ApiProperty({ nullable: true, type: String })
  tickSize!: string | null;

  @ApiProperty({ format: "date-time" })
  syncedAt!: string;
}

export class MarketListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  marketId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  conditionId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    oneOf: [
      { type: "array", items: { type: "string" } },
      { type: "object", additionalProperties: true }
    ]
  })
  clobTokenIds?: unknown;

  @ApiPropertyOptional()
  enableOrderBook?: boolean;

  @ApiProperty({ nullable: true, type: String })
  slug!: string | null;

  @ApiProperty()
  question!: string;

  @ApiProperty({ nullable: true, type: String })
  category!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  closed!: boolean;

  @ApiProperty({
    nullable: true,
    oneOf: [
      { type: "array", items: { type: "string" } },
      { type: "object", additionalProperties: true }
    ]
  })
  outcomes!: unknown;

  @ApiProperty({
    nullable: true,
    oneOf: [
      { type: "array", items: { type: "string" } },
      { type: "object", additionalProperties: true }
    ]
  })
  outcomePrices!: unknown;

  @ApiProperty({ nullable: true, type: String })
  volume!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  volume24hr?: string | null;

  @ApiProperty({ nullable: true, type: String })
  liquidity!: string | null;

  @ApiProperty({ format: "date-time" })
  syncedAt!: string;

  @ApiPropertyOptional({ type: [MarketQuoteItemDto] })
  quotes?: MarketQuoteItemDto[];
}

export class MarketSyncResultDto {
  @ApiProperty()
  synced!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  quotesSynced!: number;

  @ApiProperty()
  quotesFailed!: number;

  @ApiPropertyOptional()
  error?: string;
}

export class AdminSummaryDto {
  @ApiProperty()
  registeredUsers!: number;

  @ApiProperty()
  adminUsers!: number;

  @ApiProperty()
  walletsConnected!: number;

  @ApiProperty()
  marketsSynced!: number;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  latestMarketSyncedAt!: string | null;

  @ApiProperty()
  marketQuotesSynced!: number;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  latestMarketQuoteSyncedAt!: string | null;

  @ApiProperty()
  ordersPreviewed!: number;

  @ApiProperty()
  openRiskEvents!: number;
}

export class AdminGateDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  owner!: string;

  @ApiProperty({ enum: ["READY", "PENDING", "BLOCKED"] })
  status!: "READY" | "PENDING" | "BLOCKED";

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  updatedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  details?: string | null;
}

export class OrderRouterEnvironmentDto {
  @ApiProperty({ enum: ["preview", "paper", "live"] })
  mode!: "preview" | "paper" | "live";

  @ApiProperty()
  clobHost!: string;

  @ApiProperty({ nullable: true, type: Number })
  chainId!: number | null;

  @ApiProperty()
  builderCodeConfigured!: boolean;

  @ApiProperty()
  relayerConfigured!: boolean;

  @ApiProperty()
  rpcConfigured!: boolean;

  @ApiProperty()
  liveTradingEnabled!: boolean;
}

export class ManagedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty({ enum: ["ADMIN", "USER"] })
  role!: "ADMIN" | "USER";

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty()
  walletCount!: number;

  @ApiProperty({ enum: ["CONNECTED", "NOT_CONNECTED"] })
  walletStatus!: "CONNECTED" | "NOT_CONNECTED";

  @ApiProperty({ nullable: true, type: String })
  primaryWalletAddress!: string | null;
}

export class WalletFundingStateDto {
  @ApiProperty({ nullable: true, type: String })
  allowance!: string | null;

  @ApiProperty()
  balanceCacheStale!: boolean;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  balanceCacheUpdatedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  minimumOrderSize!: string | null;

  @ApiProperty({ nullable: true, type: Boolean })
  minimumOrderSizeMet!: boolean | null;

  @ApiProperty({ nullable: true, type: String })
  pUsdBalance!: string | null;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ nullable: true, type: String })
  requiredAllowance!: string | null;

  @ApiProperty({
    enum: ["ALLOWANCE_MISSING", "CACHE_STALE", "NO_DEPOSIT_WALLET", "NO_PUSD", "READY"]
  })
  status!:
    | "ALLOWANCE_MISSING"
    | "CACHE_STALE"
    | "NO_DEPOSIT_WALLET"
    | "NO_PUSD"
    | "READY";
}

export class WalletReadinessGateDto {
  @ApiProperty({
    enum: ["wallet-binding", "deposit-wallet", "funding-allowance", "region-risk"]
  })
  key!: "wallet-binding" | "deposit-wallet" | "funding-allowance" | "region-risk";

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ["PENDING", "READY"] })
  status!: "PENDING" | "READY";
}

export class DepositWalletReadinessDto {
  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  chainId!: number | null;

  @ApiProperty({ enum: ["CREATED", "FAILED", "NOT_CREATED", "PENDING", "READY"] })
  status!: "CREATED" | "FAILED" | "NOT_CREATED" | "PENDING" | "READY";
}

export class EoaReadinessDto {
  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  chainId!: number | null;

  @ApiProperty({ enum: ["CONNECTED", "NOT_CONNECTED"] })
  status!: "CONNECTED" | "NOT_CONNECTED";
}

export class RegionReadinessDto {
  @ApiProperty({ enum: ["NOT_CHECKED"] })
  status!: "NOT_CHECKED";
}

export class WalletReadinessDto {
  @ApiProperty()
  canPreview!: true;

  @ApiProperty()
  canSign!: boolean;

  @ApiProperty({ type: DepositWalletReadinessDto })
  depositWallet!: DepositWalletReadinessDto;

  @ApiProperty({ type: EoaReadinessDto })
  eoa!: EoaReadinessDto;

  @ApiProperty({ type: WalletFundingStateDto })
  funding!: WalletFundingStateDto;

  @ApiProperty({ type: [WalletReadinessGateDto] })
  gates!: WalletReadinessGateDto[];

  @ApiProperty({ type: RegionReadinessDto })
  region!: RegionReadinessDto;
}

export class WalletOperationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true, type: String })
  failureReason!: string | null;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class RelayerTransactionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  relayerTransactionId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true, type: String })
  failureReason!: string | null;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class DepositWalletStatusDto {
  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  ownerAddress!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  chainId!: number | null;

  @ApiProperty({
    enum: ["FAILED", "INTENT_CREATED", "NOT_CREATED", "PENDING", "READY"]
  })
  status!: "FAILED" | "INTENT_CREATED" | "NOT_CREATED" | "PENDING" | "READY";

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  updatedAt!: string | null;

  @ApiProperty({ type: WalletOperationSummaryDto, nullable: true })
  latestOperation!: WalletOperationSummaryDto | null;

  @ApiProperty({ type: RelayerTransactionSummaryDto, nullable: true })
  latestRelayerTransaction!: RelayerTransactionSummaryDto | null;
}

export class CreateDepositWalletIntentResultDto {
  @ApiProperty({ enum: ["CREATE_DEPOSIT_WALLET"] })
  action!: "CREATE_DEPOSIT_WALLET";

  @ApiProperty()
  operationId!: string;

  @ApiProperty()
  ownerAddress!: string;

  @ApiProperty()
  chainId!: number;

  @ApiProperty({ nullable: true, type: String })
  depositWalletAddress!: string | null;

  @ApiProperty({ type: "object", additionalProperties: true })
  relayerRequest!: Record<string, unknown>;

  @ApiProperty({ enum: ["INTENT_CREATED", "SUBMITTED", "FAILED"] })
  status!: "INTENT_CREATED" | "SUBMITTED" | "FAILED";

  @ApiProperty({
    type: "object",
    properties: {
      action: { enum: ["CREATE_DEPOSIT_WALLET"], type: "string" },
      chainId: { type: "number" },
      ownerAddress: { type: "string" }
    },
    required: ["action", "chainId", "ownerAddress"]
  })
  typedData!: {
    action: "CREATE_DEPOSIT_WALLET";
    ownerAddress: string;
    chainId: number;
  };
}

export class SubmitDepositWalletSignedBatchResultDto {
  @ApiProperty()
  operationId!: string;

  @ApiProperty({ enum: ["PENDING", "CONFIRMED", "FAILED"] })
  status!: "PENDING" | "CONFIRMED" | "FAILED";

  @ApiProperty({ nullable: true, type: String })
  relayerTransactionId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  depositWalletAddress!: string | null;

  @ApiProperty({ nullable: true, type: String })
  failureReason!: string | null;
}

export class WalletChallengeDto {
  @ApiProperty({ format: "date-time" })
  expiresAt!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  nonce!: string;
}

export class VerifyWalletResultDto {
  @ApiProperty()
  address!: string;

  @ApiProperty()
  chainId!: number;

  @ApiProperty({ enum: ["CONNECTED"] })
  status!: "CONNECTED";
}

export class PreviewOrderReadinessGateDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ["BLOCKED", "PENDING", "READY"] })
  status!: "BLOCKED" | "PENDING" | "READY";
}

export class PreviewOrderReadinessDto {
  @ApiProperty()
  canPreview!: boolean;

  @ApiProperty()
  canSign!: boolean;

  @ApiPropertyOptional({ type: WalletFundingStateDto })
  funding?: WalletFundingStateDto;

  @ApiProperty({ type: [PreviewOrderReadinessGateDto] })
  gates!: PreviewOrderReadinessGateDto[];
}

export class ClobOrderDraftDto {
  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  builderCode?: string | null;

  @ApiPropertyOptional()
  negRisk?: boolean;

  @ApiPropertyOptional({ enum: ["FAK", "FOK"] })
  orderType?: "FAK" | "FOK";

  @ApiPropertyOptional({ enum: ["BUY", "SELL"] })
  side?: "BUY" | "SELL";

  @ApiPropertyOptional()
  signatureType?: string;

  @ApiPropertyOptional()
  tickSize?: string;

  @ApiPropertyOptional()
  tokenID?: string;
}

export class PreviewOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ enum: ["CONFIGURED", "MISSING"] })
  builderAttributionStatus?: "CONFIGURED" | "MISSING";

  @ApiPropertyOptional({ type: ClobOrderDraftDto })
  clob?: ClobOrderDraftDto;

  @ApiPropertyOptional({ type: PreviewOrderReadinessDto })
  readiness?: PreviewOrderReadinessDto;

  @ApiProperty()
  submitDisabled!: boolean;
}
