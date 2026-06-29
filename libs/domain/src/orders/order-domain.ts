export type ClobOrderSide = "BUY" | "SELL";
export type ClobOrderType = "FAK" | "FOK" | "GTC" | "GTD";
export type ClobSignatureType = "POLY_1271";
export type ClobTickSize = "0.1" | "0.01" | "0.001" | "0.0001";
export type BuilderAttributionStatus = "CONFIGURED" | "MISSING";
export type OrderReadinessStatus = "READY" | "PENDING" | "BLOCKED";

export interface OrderReadinessGate {
  key: string;
  status: OrderReadinessStatus;
  reason: string;
}

export interface ClobOrderDraftInput {
  amountUsd: number;
  builderCode: string | null;
  funderAddress: string | null;
  negRisk: boolean;
  orderType: ClobOrderType;
  side: ClobOrderSide;
  tickSize: string;
  tokenID: string;
}

export interface ClobOrderDraft {
  amount: number;
  builderCode: string | null;
  funderAddress: string | null;
  negRisk: boolean;
  orderType: ClobOrderType;
  side: ClobOrderSide;
  signatureType: ClobSignatureType;
  tickSize: ClobTickSize;
  tokenID: string;
}

const SUPPORTED_TICK_SIZES = new Set<string>(["0.1", "0.01", "0.001", "0.0001"]);

export function toClobOrderDraft(input: ClobOrderDraftInput): ClobOrderDraft {
  if (!input.tokenID.trim()) {
    throw new Error("CLOB tokenID is required");
  }

  if (!SUPPORTED_TICK_SIZES.has(input.tickSize)) {
    throw new Error("Unsupported CLOB tick size");
  }

  return {
    amount: input.amountUsd,
    builderCode: input.builderCode,
    funderAddress: input.funderAddress,
    negRisk: input.negRisk,
    orderType: input.orderType,
    side: input.side,
    signatureType: "POLY_1271",
    tickSize: input.tickSize as ClobTickSize,
    tokenID: input.tokenID
  };
}
