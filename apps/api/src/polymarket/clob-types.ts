export type ClobOrderSide = "BUY" | "SELL";
export type ClobOrderType = "GTC" | "GTD" | "FAK" | "FOK";
export type ClobSignatureType = 3;
export type ClobTickSize = "0.1" | "0.01" | "0.001" | "0.0001";
export type ClobAssetType = "COLLATERAL" | "CONDITIONAL";

export type ClobErrorCode =
  | "AUTH_FAILED"
  | "ORDER_REJECTED"
  | "BALANCE_INSUFFICIENT"
  | "ALLOWANCE_MISSING"
  | "MARKET_NOT_FOUND"
  | "RATE_LIMITED"
  | "MATCHING_ENGINE_UNAVAILABLE"
  | "EXCHANGE_PAUSED";

export interface ClobOrderIntent {
  tokenID: string;
  price?: number;
  size?: number;
  amount?: number;
  side: ClobOrderSide;
  orderType: ClobOrderType;
  tickSize: ClobTickSize;
  negRisk: boolean;
  builderCode: string | null;
  signatureType: ClobSignatureType;
  funderAddress: string | null;
}

export interface ClobSignedOrder {
  rawSignedOrder: unknown;
  rawPolymarketResponse: unknown;
  signatureType: ClobSignatureType;
  funderAddress: string | null;
  builderCode: string | null;
}

export interface ClobApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface ClobPostResult {
  success: boolean;
  orderID: string | null;
  status: string | null;
  makingAmount: string | null;
  takingAmount: string | null;
  transactionHashes: string[];
  tradeIds: string[];
  rawPolymarketResponse: unknown;
}

export interface ClobOpenOrder {
  orderID: string;
  status: string;
  owner: string | null;
  makerAddress: string | null;
  market: string | null;
  assetId: string | null;
  side: string | null;
  originalSize: string | null;
  sizeMatched: string | null;
  price: string | null;
  outcome: string | null;
  orderType: string | null;
  rawPolymarketResponse: unknown;
}

export interface ClobTrade {
  id: string;
  orderID: string | null;
  market: string | null;
  assetId: string | null;
  side: string | null;
  size: string | null;
  price: string | null;
  status: string | null;
  outcome: string | null;
  transactionHash: string | null;
  rawPolymarketResponse: unknown;
}

export interface ClobBalanceAllowance {
  balance: string;
  allowances: Record<string, string>;
  rawPolymarketResponse: unknown;
}

export interface ClobOpenOrdersParams {
  id?: string;
  market?: string;
  assetId?: string;
}

export interface ClobTradeParams {
  id?: string;
  makerAddress?: string;
  market?: string;
  assetId?: string;
  before?: string;
  after?: string;
}

export interface ClobBalanceAllowanceParams {
  assetType: ClobAssetType;
  tokenId?: string;
}
