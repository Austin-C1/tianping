import type { components } from "./generated/schema";

export type AuthCredentials = components["schemas"]["LoginDto"];
export type RegisterInput = components["schemas"]["RegisterDto"];
export type AuthResult = components["schemas"]["AuthResultDto"];
export type AuthUser = components["schemas"]["AuthUserDto"];
export type MarketListItem = components["schemas"]["MarketListItemDto"];
export type MarketSyncResult = components["schemas"]["MarketSyncResultDto"];
export type AdminSummary = components["schemas"]["AdminSummaryDto"];
export type AdminGate = components["schemas"]["AdminGateDto"];
export type OrderRouterEnvironment =
  components["schemas"]["OrderRouterEnvironmentDto"];
export type ManagedUser = components["schemas"]["ManagedUserDto"];
export type PreviewOrderInput = components["schemas"]["PreviewOrderDto"];
export type PreviewOrderResponse =
  components["schemas"]["PreviewOrderResponseDto"];
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
      listUsers: () =>
        request<ManagedUser[]>("GET", "/admin/users", undefined, {
          authenticated: true
        })
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
      preview: (body: PreviewOrderInput) =>
        request<PreviewOrderResponse, PreviewOrderInput>(
          "POST",
          "/orders/preview",
          body,
          { authenticated: true }
        )
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
