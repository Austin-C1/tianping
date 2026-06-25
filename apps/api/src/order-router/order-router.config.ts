import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type OrderRouterMode = "preview" | "paper" | "live";

export interface OrderRouterEnvironment {
  mode: OrderRouterMode;
  clobHost: string;
  chainId: number | null;
  builderCodeConfigured: boolean;
  relayerConfigured: boolean;
  rpcConfigured: boolean;
  liveTradingEnabled: boolean;
}

export const DEFAULT_ORDER_ROUTER_MODE: OrderRouterMode = "preview";
export const DEFAULT_POLYMARKET_CLOB_HOST = "https://clob.polymarket.com";

const ORDER_ROUTER_MODES = new Set<OrderRouterMode>(["preview", "paper", "live"]);
const LIVE_REQUIRED_KEYS = [
  "POLYMARKET_CLOB_HOST",
  "POLYMARKET_CHAIN_ID",
  "POLYMARKET_BUILDER_CODE",
  "POLYMARKET_RELAYER_API_KEY",
  "POLYMARKET_RELAYER_API_KEY_ADDRESS",
  "POLYMARKET_RPC_URL"
] as const;

@Injectable()
export class OrderRouterConfigService {
  constructor(private readonly config: ConfigService) {}

  getEnvironment(): OrderRouterEnvironment {
    const mode = orderRouterMode(this.config.get<string>("ORDER_ROUTER_MODE"));
    const clobHost = textValue(
      this.config.get<string>("POLYMARKET_CLOB_HOST"),
      DEFAULT_POLYMARKET_CLOB_HOST
    );
    const chainId = chainIdValue(this.config.get<string>("POLYMARKET_CHAIN_ID"));
    const builderCodeConfigured = isBytes32(this.config.get<string>("POLYMARKET_BUILDER_CODE"));
    const relayerConfigured =
      hasValue(this.config.get<string>("POLYMARKET_RELAYER_API_KEY")) &&
      hasValue(this.config.get<string>("POLYMARKET_RELAYER_API_KEY_ADDRESS"));
    const rpcConfigured = hasValue(this.config.get<string>("POLYMARKET_RPC_URL"));

    return {
      builderCodeConfigured,
      chainId,
      clobHost,
      liveTradingEnabled:
        mode === "live" &&
        Boolean(clobHost) &&
        chainId !== null &&
        builderCodeConfigured &&
        relayerConfigured &&
        rpcConfigured,
      mode,
      relayerConfigured,
      rpcConfigured
    };
  }
}

export function validateOrderRouterEnv(config: Record<string, unknown>): Record<string, unknown> {
  const mode = orderRouterMode(rawText(config.ORDER_ROUTER_MODE));

  if (mode === "live") {
    const missingKeys = LIVE_REQUIRED_KEYS.filter((key) => !hasValue(rawText(config[key])));
    if (missingKeys.length > 0) {
      throw new Error(`ORDER_ROUTER_MODE=live requires ${missingKeys.join(", ")}`);
    }

    if (chainIdValue(rawText(config.POLYMARKET_CHAIN_ID)) === null) {
      throw new Error("POLYMARKET_CHAIN_ID must be a positive integer");
    }

    if (!isBytes32(rawText(config.POLYMARKET_BUILDER_CODE))) {
      throw new Error("POLYMARKET_BUILDER_CODE must be a bytes32 hex value");
    }
  }

  return {
    ...config,
    ORDER_ROUTER_MODE: mode,
    POLYMARKET_CLOB_HOST: textValue(
      rawText(config.POLYMARKET_CLOB_HOST),
      DEFAULT_POLYMARKET_CLOB_HOST
    )
  };
}

function orderRouterMode(value: string | undefined): OrderRouterMode {
  const mode = textValue(value, DEFAULT_ORDER_ROUTER_MODE);

  if (!ORDER_ROUTER_MODES.has(mode as OrderRouterMode)) {
    throw new Error("ORDER_ROUTER_MODE must be one of preview, paper, live");
  }

  return mode as OrderRouterMode;
}

function chainIdValue(value: string | undefined): number | null {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function isBytes32(value: string | undefined): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value?.trim() ?? "");
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function textValue(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function rawText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
