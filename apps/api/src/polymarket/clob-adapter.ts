import {
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  Side,
  SignatureTypeV2,
  type ApiKeyCreds,
  type BalanceAllowanceParams,
  type BalanceAllowanceResponse,
  type ClobClientOptions,
  type OpenOrder,
  type OpenOrderParams,
  type OrderPayload,
  type Trade,
  type TradeParams,
  type UserMarketOrderV2,
  type UserOrderV2
} from "@polymarket/clob-client-v2";
import type {
  ClobApiCredentials,
  ClobBalanceAllowance,
  ClobBalanceAllowanceParams,
  ClobErrorCode,
  ClobOpenOrder,
  ClobOpenOrdersParams,
  ClobOrderIntent,
  ClobOrderType,
  ClobPostResult,
  ClobSignedOrder,
  ClobTrade,
  ClobTradeParams
} from "./clob-types";

export interface ClobAdapterProvider {
  createOrDeriveApiKey(nonce?: number): Promise<ApiKeyCreds>;
  createOrder(
    order: UserOrderV2,
    options: { tickSize: ClobOrderIntent["tickSize"]; negRisk?: boolean }
  ): Promise<unknown>;
  createMarketOrder(
    order: UserMarketOrderV2,
    options: { tickSize: ClobOrderIntent["tickSize"]; negRisk?: boolean }
  ): Promise<unknown>;
  createAndPostOrder(
    order: UserOrderV2,
    options: { tickSize: ClobOrderIntent["tickSize"]; negRisk?: boolean },
    orderType?: OrderType,
    postOnly?: boolean,
    deferExec?: boolean
  ): Promise<unknown>;
  createAndPostMarketOrder(
    order: UserMarketOrderV2,
    options: { tickSize: ClobOrderIntent["tickSize"]; negRisk?: boolean },
    orderType?: OrderType,
    deferExec?: boolean
  ): Promise<unknown>;
  postOrder(order: unknown, orderType?: OrderType, postOnly?: boolean, deferExec?: boolean): Promise<unknown>;
  getOpenOrders(
    params?: OpenOrderParams,
    onlyFirstPage?: boolean,
    nextCursor?: string
  ): Promise<OpenOrder[]>;
  getOrder(orderID: string): Promise<OpenOrder>;
  getTrades(params?: TradeParams, onlyFirstPage?: boolean, nextCursor?: string): Promise<Trade[]>;
  getBalanceAllowance(params?: BalanceAllowanceParams): Promise<BalanceAllowanceResponse>;
  cancelOrder(payload: OrderPayload): Promise<unknown>;
}

export class ClobAdapterError extends Error {
  constructor(
    readonly code: ClobErrorCode,
    message: string,
    readonly status: number | null,
    readonly rawPolymarketResponse: unknown
  ) {
    super(message);
  }
}

export interface LiveClobAdapterOptions {
  host: string;
  chainId: number;
  signer?: unknown;
  creds?: ClobApiCredentials;
  signatureType?: ClobSignedOrder["signatureType"];
  funderAddress?: string;
  builderCode?: string;
}

export function createLiveClobAdapter(options: LiveClobAdapterOptions): ClobAdapter {
  const clientOptions: ClobClientOptions = {
    host: options.host,
    chain: options.chainId as Chain,
    signer: options.signer as ClobClientOptions["signer"],
    creds: options.creds,
    signatureType: sdkSignatureType(options.signatureType ?? 3),
    funderAddress: options.funderAddress,
    builderConfig: options.builderCode ? { builderCode: options.builderCode } : undefined,
    throwOnError: true
  };

  return new ClobAdapter(new ClobClient(clientOptions));
}

export class ClobAdapter {
  constructor(private readonly provider: ClobAdapterProvider) {}

  async createOrDeriveApiKey(nonce?: number): Promise<ClobApiCredentials> {
    const response = await this.execute(() => this.provider.createOrDeriveApiKey(nonce));

    return {
      key: response.key,
      passphrase: response.passphrase,
      secret: response.secret
    };
  }

  async createOrder(intent: ClobOrderIntent): Promise<ClobSignedOrder> {
    const rawSignedOrder = await this.execute(() => {
      if (intent.size !== undefined) {
        return this.provider.createOrder(this.limitOrder(intent), this.createOrderOptions(intent));
      }

      return this.provider.createMarketOrder(this.marketOrder(intent), this.createOrderOptions(intent));
    });

    return {
      builderCode: intent.builderCode,
      funderAddress: intent.funderAddress,
      rawPolymarketResponse: rawSignedOrder,
      rawSignedOrder,
      signatureType: intent.signatureType
    };
  }

  async postSignedOrder(
    signedOrder: ClobSignedOrder,
    orderType: ClobOrderType = "GTC"
  ): Promise<ClobPostResult> {
    const response = await this.execute(() =>
      this.provider.postOrder(signedOrder.rawSignedOrder, sdkOrderType(orderType))
    );

    return this.postResult(response);
  }

  async createAndPostOrder(intent: ClobOrderIntent): Promise<ClobPostResult> {
    const response = await this.execute(() => {
      if (intent.size !== undefined) {
        return this.provider.createAndPostOrder(
          this.limitOrder(intent),
          this.createOrderOptions(intent),
          sdkOrderType(intent.orderType)
        );
      }

      return this.provider.createAndPostMarketOrder(
        this.marketOrder(intent),
        this.createOrderOptions(intent),
        sdkOrderType(intent.orderType)
      );
    });

    return this.postResult(response);
  }

  async getOpenOrders(params?: ClobOpenOrdersParams): Promise<ClobOpenOrder[]> {
    const response = await this.execute(() => this.provider.getOpenOrders(this.openOrderParams(params)));

    return response.map((order) => this.openOrder(order));
  }

  async getOrder(orderID: string): Promise<ClobOpenOrder> {
    const response = await this.execute(() => this.provider.getOrder(orderID));

    return this.openOrder(response);
  }

  async getTrades(params?: ClobTradeParams): Promise<ClobTrade[]> {
    const response = await this.execute(() => this.provider.getTrades(this.tradeParams(params)));

    return response.map((trade) => this.trade(trade));
  }

  async getBalanceAllowance(params?: ClobBalanceAllowanceParams): Promise<ClobBalanceAllowance> {
    const response = await this.execute(() => this.provider.getBalanceAllowance(this.balanceAllowanceParams(params)));

    return {
      allowances: response.allowances,
      balance: response.balance,
      rawPolymarketResponse: response
    };
  }

  async cancelOrder(orderID: string): Promise<ClobPostResult> {
    const response = await this.execute(() => this.provider.cancelOrder({ orderID }));

    return this.postResult(response);
  }

  private async execute<T>(action: () => Promise<T>): Promise<T> {
    try {
      const response = await action();
      this.throwIfProviderError(response);

      return response;
    } catch (error) {
      if (error instanceof ClobAdapterError) {
        throw error;
      }

      throw this.adapterError(error);
    }
  }

  private limitOrder(intent: ClobOrderIntent): UserOrderV2 {
    if (intent.price === undefined || intent.size === undefined) {
      throw new ClobAdapterError(
        "ORDER_REJECTED",
        "Limit CLOB order requires price and size",
        null,
        intent
      );
    }

    return {
      builderCode: intent.builderCode ?? undefined,
      price: intent.price,
      side: sdkSide(intent.side),
      size: intent.size,
      tokenID: intent.tokenID
    };
  }

  private marketOrder(intent: ClobOrderIntent): UserMarketOrderV2 {
    if (intent.amount === undefined) {
      throw new ClobAdapterError(
        "ORDER_REJECTED",
        "Market CLOB order requires amount",
        null,
        intent
      );
    }

    return {
      amount: intent.amount,
      builderCode: intent.builderCode ?? undefined,
      orderType: sdkOrderType(intent.orderType) as OrderType.FAK | OrderType.FOK,
      price: intent.price,
      side: sdkSide(intent.side),
      tokenID: intent.tokenID
    };
  }

  private createOrderOptions(intent: ClobOrderIntent) {
    return {
      negRisk: intent.negRisk,
      tickSize: intent.tickSize
    };
  }

  private openOrder(order: OpenOrder): ClobOpenOrder {
    return {
      assetId: order.asset_id ?? null,
      makerAddress: order.maker_address ?? null,
      market: order.market ?? null,
      orderID: order.id,
      orderType: order.order_type ?? null,
      originalSize: order.original_size ?? null,
      outcome: order.outcome ?? null,
      owner: order.owner ?? null,
      price: order.price ?? null,
      rawPolymarketResponse: order,
      side: order.side ?? null,
      sizeMatched: order.size_matched ?? null,
      status: order.status
    };
  }

  private trade(trade: Trade): ClobTrade {
    return {
      assetId: trade.asset_id ?? null,
      id: trade.id,
      market: trade.market ?? null,
      orderID: trade.taker_order_id ?? null,
      outcome: trade.outcome ?? null,
      price: trade.price ?? null,
      rawPolymarketResponse: trade,
      side: trade.side ?? null,
      size: trade.size ?? null,
      status: trade.status ?? null,
      transactionHash: trade.transaction_hash ?? null
    };
  }

  private postResult(response: unknown): ClobPostResult {
    const payload = recordValue(response);

    return {
      makingAmount: stringOrNull(payload.makingAmount),
      orderID: stringOrNull(payload.orderID),
      rawPolymarketResponse: response,
      status: stringOrNull(payload.status),
      success: payload.success === true,
      takingAmount: stringOrNull(payload.takingAmount),
      tradeIds: stringArray(payload.tradeIDs),
      transactionHashes: stringArray(payload.transactionsHashes)
    };
  }

  private openOrderParams(params?: ClobOpenOrdersParams): OpenOrderParams | undefined {
    if (!params) {
      return undefined;
    }

    return {
      asset_id: params.assetId,
      id: params.id,
      market: params.market
    };
  }

  private tradeParams(params?: ClobTradeParams): TradeParams | undefined {
    if (!params) {
      return undefined;
    }

    return {
      after: params.after,
      asset_id: params.assetId,
      before: params.before,
      id: params.id,
      maker_address: params.makerAddress,
      market: params.market
    };
  }

  private balanceAllowanceParams(params?: ClobBalanceAllowanceParams): BalanceAllowanceParams | undefined {
    if (!params) {
      return undefined;
    }

    return {
      asset_type: sdkAssetType(params.assetType),
      token_id: params.tokenId
    };
  }

  private throwIfProviderError(response: unknown) {
    const payload = recordValue(response);
    const status = numberOrNull(payload.status);
    const message = stringOrNull(payload.error) ?? stringOrNull(payload.errorMsg);

    if (message) {
      throw new ClobAdapterError(this.errorCode(status, message), message, status, response);
    }
  }

  private adapterError(error: unknown): ClobAdapterError {
    const payload = recordValue(error);
    const status = numberOrNull(payload.status);
    const data = "data" in payload ? payload.data : error;
    const message =
      stringOrNull(payload.message) ?? stringOrNull(payload.error) ?? "Polymarket CLOB request failed";

    return new ClobAdapterError(this.errorCode(status, message), message, status, data);
  }

  private errorCode(status: number | null, message: string): ClobErrorCode {
    const normalizedMessage = message.toLowerCase();

    if (status === 401 || status === 403) {
      return "AUTH_FAILED";
    }

    if (status === 404) {
      return "MARKET_NOT_FOUND";
    }

    if (status === 425) {
      return "EXCHANGE_PAUSED";
    }

    if (status === 429) {
      return "RATE_LIMITED";
    }

    if (status === 500 || status === 503) {
      return "MATCHING_ENGINE_UNAVAILABLE";
    }

    if (normalizedMessage.includes("balance")) {
      return "BALANCE_INSUFFICIENT";
    }

    if (normalizedMessage.includes("allowance") || normalizedMessage.includes("approval")) {
      return "ALLOWANCE_MISSING";
    }

    return "ORDER_REJECTED";
  }
}

function sdkOrderType(value: ClobOrderType): OrderType {
  return OrderType[value];
}

function sdkSide(value: "BUY" | "SELL"): Side {
  return Side[value];
}

function sdkSignatureType(value: 3): SignatureTypeV2 {
  return value as SignatureTypeV2;
}

function sdkAssetType(value: "COLLATERAL" | "CONDITIONAL"): AssetType {
  return AssetType[value];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
