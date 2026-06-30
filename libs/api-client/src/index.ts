import type { components } from "./generated/schema";

export type AuthCredentials = components["schemas"]["LoginDto"];
export type RegisterInput = components["schemas"]["RegisterDto"];
export type AuthResult = components["schemas"]["AuthResultDto"];
export type AuthUser = components["schemas"]["AuthUserDto"];
export type MarketListItem = components["schemas"]["MarketListItemDto"];
export type MarketSyncResult = components["schemas"]["MarketSyncResultDto"];
export type SyncJobRun = components["schemas"]["SyncJobRunDto"];
export type AdminSummary = components["schemas"]["AdminSummaryDto"];
export type AdminGate = components["schemas"]["AdminGateDto"];
export type OrderRouterEnvironment =
  components["schemas"]["OrderRouterEnvironmentDto"];
export type ManagedUser = components["schemas"]["ManagedUserDto"];
export type PreviewOrderInput = components["schemas"]["PreviewOrderDto"];
export type PreviewOrderResponse =
  components["schemas"]["PreviewOrderResponseDto"];
export type AdminGateStatus = AdminGate["status"];
export type OrderRouterMode = OrderRouterEnvironment["mode"];
export type WalletFundingState = components["schemas"]["WalletFundingStateDto"];
export type WalletReadiness = components["schemas"]["WalletReadinessDto"];
export type DepositWalletStatus =
  components["schemas"]["DepositWalletStatusDto"];
export type CreateDepositWalletIntentInput =
  components["schemas"]["CreateDepositWalletIntentDto"];
export type CreateDepositWalletIntentResult =
  components["schemas"]["CreateDepositWalletIntentResultDto"];
export type SubmitDepositWalletSignedBatchInput =
  components["schemas"]["SubmitDepositWalletSignedBatchDto"];
export type SubmitDepositWalletSignedBatchResult =
  components["schemas"]["SubmitDepositWalletSignedBatchResultDto"];
export type WalletChallenge = components["schemas"]["WalletChallengeDto"];
export type VerifyWalletInput = components["schemas"]["VerifyWalletDto"];
export type VerifyWalletResult =
  components["schemas"]["VerifyWalletResultDto"];

export interface OrderIdInput {
  orderId: string;
}

export interface SigningIntentResponse {
  id: string;
  signingPayload: Record<string, unknown>;
  status: "SIGNING_REQUESTED";
}

export interface SaveSignedOrderInput extends OrderIdInput {
  signedPayload: Record<string, unknown>;
}

export interface SignedOrderResponse {
  id: string;
  signedPayload: Record<string, unknown>;
  status: "SIGNED";
}

export interface ManagedOrder {
  clobOrderId: string | null;
  createdAt: string;
  failureReason: string | null;
  id: string;
  market: {
    marketId: string;
    question: string;
  } | null;
  outcome: string | null;
  price: string;
  size: string;
  status: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface PortfolioMarket {
  marketId: string;
  question: string;
}

export interface PortfolioPosition {
  averagePrice: string;
  id: string;
  market: PortfolioMarket | null;
  outcome: string;
  size: string;
  updatedAt: string;
}

export interface PortfolioTrade {
  clobTradeId: string | null;
  executedAt: string;
  id: string;
  market: PortfolioMarket | null;
  orderId: string | null;
  price: string;
  side: "BUY" | "SELL";
  size: string;
}

export interface PortfolioSummary {
  positionCount: number;
  tradeCount: number;
}

export interface PortfolioResponse {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
  trades: PortfolioTrade[];
}

export interface ManagedAuditLog {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export type RiskGateCategory = "environment" | "market" | "wallet" | "compliance" | "risk";
export type RiskGateSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface RiskGate {
  key: string;
  title: string;
  category: RiskGateCategory;
  status: AdminGateStatus;
  severity: RiskGateSeverity;
  blocking: boolean;
  description: string;
  evidence: string;
  updatedAt: string | null;
}

export interface RiskGateReport {
  generatedAt: string;
  mode: OrderRouterMode;
  liveTradingEnabled: boolean;
  canSubmitLiveOrders: boolean;
  blockingCount: number;
  warningCount: number;
  gates: RiskGate[];
}

export type LiveApprovalStatusValue = "APPROVED" | "NOT_APPROVED";
export type LiveApprovalRecordStatus = "APPROVED" | "REVOKED";

export interface LiveApprovalRecord {
  id: string;
  status: LiveApprovalRecordStatus;
  approvalReason: string;
  approvedById: string | null;
  approvedByEmail: string | null;
  approvedAt: string;
  revokeReason: string | null;
  revokedById: string | null;
  revokedByEmail: string | null;
  revokedAt: string | null;
}

export interface LiveApprovalStatus {
  status: LiveApprovalStatusValue;
  latestApproval: LiveApprovalRecord | null;
  safetyNotice: string;
}

export interface LiveApprovalReason {
  reason: string;
}

export interface CreateApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  getAccessToken?: () => string | null | undefined;
}

export class ApiClientError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.body = body;
    this.status = status;
  }
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  const request = createRequest(options);

  return {
    admin: {
      approveLiveTrading: (body: LiveApprovalReason) =>
        request<LiveApprovalStatus, LiveApprovalReason>(
          "POST",
          "/admin/live-approval/approve",
          body,
          { authenticated: true }
        ),
      enqueueMarketSync: () =>
        request<SyncJobRun, Record<string, never>>(
          "POST",
          "/admin/sync/market",
          {},
          { authenticated: true }
        ),
      getAuditLogs: () =>
        request<ManagedAuditLog[]>("GET", "/admin/audit", undefined, {
          authenticated: true
        }),
      getEnvironment: () =>
        request<OrderRouterEnvironment>("GET", "/admin/environment", undefined, {
          authenticated: true
        }),
      getGates: () =>
        request<AdminGate[]>("GET", "/admin/gates", undefined, {
          authenticated: true
        }),
      getSummary: () =>
        request<AdminSummary>("GET", "/admin/summary", undefined, {
          authenticated: true
        }),
      getLiveApproval: () =>
        request<LiveApprovalStatus>("GET", "/admin/live-approval", undefined, {
          authenticated: true
        }),
      getRiskGateReport: () =>
        request<RiskGateReport>("GET", "/admin/risk/gates", undefined, {
          authenticated: true
        }),
      getSyncJob: (id: string) =>
        request<SyncJobRun>(
          "GET",
          `/admin/sync/jobs/${encodeURIComponent(id)}`,
          undefined,
          { authenticated: true }
        ),
      listSyncJobs: () =>
        request<SyncJobRun[]>("GET", "/admin/sync/jobs", undefined, {
          authenticated: true
        }),
      listUsers: () =>
        request<ManagedUser[]>("GET", "/admin/users", undefined, {
          authenticated: true
        }),
      revokeLiveTrading: (body: LiveApprovalReason) =>
        request<LiveApprovalStatus, LiveApprovalReason>(
          "POST",
          "/admin/live-approval/revoke",
          body,
          { authenticated: true }
        )
    },
    auth: {
      getCurrentUser: () =>
        request<AuthUser>("GET", "/auth/me", undefined, { authenticated: true }),
      login: (body: AuthCredentials) =>
        request<AuthResult, AuthCredentials>("POST", "/auth/login", body),
      register: (body: RegisterInput) =>
        request<AuthResult, RegisterInput>("POST", "/auth/register", body)
    },
    markets: {
      get: (id: string) =>
        request<MarketListItem>("GET", `/markets/${encodeURIComponent(id)}`),
      list: () => request<MarketListItem[]>("GET", "/markets"),
      sync: () =>
        request<MarketSyncResult, Record<string, never>>(
          "POST",
          "/admin/markets/sync",
          {},
          { authenticated: true }
        )
    },
    orders: {
      createSigningIntent: (body: OrderIdInput) =>
        request<SigningIntentResponse, OrderIdInput>(
          "POST",
          "/orders/signing-intent",
          body,
          { authenticated: true }
        ),
      list: () =>
        request<ManagedOrder[]>("GET", "/orders", undefined, {
          authenticated: true
        }),
      preview: (body: PreviewOrderInput) =>
        request<PreviewOrderResponse, PreviewOrderInput>(
          "POST",
          "/orders/preview",
          body,
          { authenticated: true }
        ),
      saveSignedOrder: (body: SaveSignedOrderInput) =>
        request<SignedOrderResponse, SaveSignedOrderInput>(
          "POST",
          "/orders/signed",
          body,
          { authenticated: true }
        ),
      submit: (body: OrderIdInput) =>
        request<ManagedOrder, OrderIdInput>("POST", "/orders/submit", body, {
          authenticated: true
        })
    },
    portfolio: {
      get: () =>
        request<PortfolioResponse>("GET", "/portfolio", undefined, {
          authenticated: true
        })
    },
    wallets: {
      createDepositWalletIntent: (body: CreateDepositWalletIntentInput) =>
        request<CreateDepositWalletIntentResult, CreateDepositWalletIntentInput>(
          "POST",
          "/wallets/deposit/create-intent",
          body,
          { authenticated: true }
        ),
      getDepositWalletStatus: () =>
        request<DepositWalletStatus>("GET", "/wallets/deposit/status", undefined, {
          authenticated: true
        }),
      getReadiness: () =>
        request<WalletReadiness>("GET", "/wallets/me", undefined, {
          authenticated: true
        }),
      refreshBalanceAllowance: () =>
        request<WalletFundingState>(
          "POST",
          "/wallets/balance-allowance/refresh",
          undefined,
          { authenticated: true }
        ),
      requestChallenge: () =>
        request<WalletChallenge>("POST", "/wallets/nonce", undefined, {
          authenticated: true
        }),
      submitDepositWalletSignedBatch: (
        body: SubmitDepositWalletSignedBatchInput
      ) =>
        request<
          SubmitDepositWalletSignedBatchResult,
          SubmitDepositWalletSignedBatchInput
        >("POST", "/wallets/deposit/submit-signed-batch", body, {
          authenticated: true
        }),
      verify: (body: VerifyWalletInput) =>
        request<VerifyWalletResult, VerifyWalletInput>(
          "POST",
          "/wallets/verify",
          body,
          { authenticated: true }
        )
    }
  };
}

interface RequestOptions {
  authenticated?: boolean;
}

function createRequest(options: CreateApiClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "http://localhost:4000");
  const fetchImpl = options.fetch ?? fetch;

  return async function request<TResponse, TBody = undefined>(
    method: "GET" | "POST",
    path: string,
    body?: TBody,
    requestOptions: RequestOptions = {}
  ): Promise<TResponse> {
    const token = requestOptions.authenticated ? options.getAccessToken?.() : null;
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const init: RequestInit = {};

    if (method !== "GET") {
      init.method = method;
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    if (Object.keys(headers).length > 0) {
      init.headers = headers;
    }

    const url = `${baseUrl}${path}`;
    const response =
      Object.keys(init).length > 0 ? await fetchImpl(url, init) : await fetchImpl(url);

    if (!response.ok) {
      throw await toApiClientError(response);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return readResponseBody(response) as Promise<TResponse>;
  };
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
  const body = await readErrorBody(response);
  const message = errorMessage(body) ?? (response.statusText || "Request failed");

  return new ApiClientError(message, response.status, body);
}

async function readErrorBody(response: Response): Promise<unknown> {
  return readResponseBody(response);
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (typeof response.text !== "function") {
    const json = (response as { json?: () => Promise<unknown> }).json;

    return typeof json === "function" ? json.call(response) : undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("message" in body)) {
    return null;
  }

  const message = (body as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return typeof message === "string" ? message : null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}
