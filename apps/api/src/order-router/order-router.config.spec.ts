import {
  DEFAULT_POLYMARKET_CLOB_HOST,
  OrderRouterConfigService,
  validateOrderRouterEnv
} from "./order-router.config";

describe("order router config", () => {
  it("defaults the router mode to preview", () => {
    const config = new OrderRouterConfigService({
      get: jest.fn((key: string, fallback?: string) => fallback)
    } as never);

    expect(config.getEnvironment()).toMatchObject({
      clobHost: DEFAULT_POLYMARKET_CLOB_HOST,
      liveTradingEnabled: false,
      mode: "preview"
    });
  });

  it("refuses live mode when required Polymarket config is missing", () => {
    expect(() => validateOrderRouterEnv({ ORDER_ROUTER_MODE: "live" })).toThrow(
      "ORDER_ROUTER_MODE=live requires POLYMARKET_CLOB_HOST, POLYMARKET_CHAIN_ID, POLYMARKET_BUILDER_CODE, POLYMARKET_RELAYER_API_KEY, POLYMARKET_RELAYER_API_KEY_ADDRESS, POLYMARKET_RPC_URL"
    );
  });

  it("enables live trading only when live mode has every required setting", () => {
    const builderCode = `0x${"1".repeat(64)}`;
    const env = validateOrderRouterEnv({
      ORDER_ROUTER_MODE: "live",
      POLYMARKET_BUILDER_CODE: builderCode,
      POLYMARKET_CHAIN_ID: "137",
      POLYMARKET_CLOB_HOST: "https://clob.polymarket.com",
      POLYMARKET_RELAYER_API_KEY: "relayer-key",
      POLYMARKET_RELAYER_API_KEY_ADDRESS: "0x0000000000000000000000000000000000000001",
      POLYMARKET_RPC_URL: "https://polygon-rpc.example"
    });

    const config = new OrderRouterConfigService({
      get: jest.fn((key: string, fallback?: string) => env[key] ?? fallback)
    } as never);

    expect(config.getEnvironment()).toEqual({
      builderCodeConfigured: true,
      chainId: 137,
      clobHost: "https://clob.polymarket.com",
      liveTradingEnabled: true,
      mode: "live",
      relayerConfigured: true,
      rpcConfigured: true
    });
  });

  it("rejects unsupported router modes", () => {
    expect(() => validateOrderRouterEnv({ ORDER_ROUTER_MODE: "prod" })).toThrow(
      "ORDER_ROUTER_MODE must be one of preview, paper, live"
    );
  });
});
