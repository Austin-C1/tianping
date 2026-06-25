import {
  ClobAdapter,
  ClobAdapterError,
  type ClobAdapterProvider
} from "./clob-adapter";
import type { ClobOrderIntent } from "./clob-types";

describe("ClobAdapter", () => {
  const intent: ClobOrderIntent = {
    builderCode: `0x${"1".repeat(64)}`,
    funderAddress: "0x1111111111111111111111111111111111111111",
    negRisk: true,
    orderType: "GTC",
    price: 0.42,
    side: "BUY",
    signatureType: 3,
    size: 12,
    tickSize: "0.01",
    tokenID: "token_yes"
  };

  const createProvider = (): jest.Mocked<ClobAdapterProvider> => ({
    cancelOrder: jest.fn(),
    createAndPostMarketOrder: jest.fn(),
    createAndPostOrder: jest.fn(),
    createMarketOrder: jest.fn(),
    createOrDeriveApiKey: jest.fn(),
    createOrder: jest.fn(),
    getBalanceAllowance: jest.fn(),
    getOpenOrders: jest.fn(),
    getOrder: jest.fn(),
    getTrades: jest.fn(),
    postOrder: jest.fn()
  });

  it("creates signed limit orders with builder attribution and Deposit Wallet signature settings", async () => {
    const provider = createProvider();
    const rawSignedOrder = { order: { tokenId: "token_yes" }, signature: "0xsig" };
    provider.createOrder.mockResolvedValue(rawSignedOrder);
    const adapter = new ClobAdapter(provider);

    await expect(adapter.createOrder(intent)).resolves.toEqual({
      builderCode: intent.builderCode,
      funderAddress: intent.funderAddress,
      rawSignedOrder,
      rawPolymarketResponse: rawSignedOrder,
      signatureType: 3
    });
    expect(provider.createOrder).toHaveBeenCalledWith(
      {
        builderCode: intent.builderCode,
        price: 0.42,
        side: "BUY",
        size: 12,
        tokenID: "token_yes"
      },
      {
        negRisk: true,
        tickSize: "0.01"
      }
    );
  });

  it("creates and posts market orders through the provider for server-controlled test paths", async () => {
    const provider = createProvider();
    provider.createAndPostMarketOrder.mockResolvedValue({
      orderID: "poly_order_1",
      success: true,
      status: "matched"
    });
    const adapter = new ClobAdapter(provider);

    await expect(
      adapter.createAndPostOrder({
        ...intent,
        amount: 10,
        orderType: "FOK",
        price: undefined,
        size: undefined
      })
    ).resolves.toMatchObject({
      orderID: "poly_order_1",
      status: "matched",
      success: true
    });
    expect(provider.createAndPostMarketOrder).toHaveBeenCalledWith(
      {
        amount: 10,
        builderCode: intent.builderCode,
        orderType: "FOK",
        price: undefined,
        side: "BUY",
        tokenID: "token_yes"
      },
      { negRisk: true, tickSize: "0.01" },
      "FOK"
    );
  });

  it("normalizes order posting, reads, balance allowance, cancellation, and API key responses", async () => {
    const provider = createProvider();
    provider.createOrDeriveApiKey.mockResolvedValue({
      key: "key",
      passphrase: "pass",
      secret: "secret"
    });
    provider.postOrder.mockResolvedValue({
      makingAmount: "42",
      orderID: "poly_order_1",
      status: "live",
      success: true,
      takingAmount: "100",
      tradeIDs: ["trade_1"],
      transactionsHashes: ["0xtx"]
    });
    provider.getOpenOrders.mockResolvedValue([
      {
        asset_id: "token_yes",
        associate_trades: [],
        created_at: 1,
        expiration: "0",
        id: "poly_order_1",
        maker_address: "0xmaker",
        market: "condition_1",
        order_type: "GTC",
        original_size: "12",
        outcome: "Yes",
        owner: "0xowner",
        price: "0.42",
        side: "BUY",
        size_matched: "0",
        status: "live"
      }
    ]);
    provider.getOrder.mockResolvedValue({
      asset_id: "token_yes",
      associate_trades: [],
      created_at: 1,
      expiration: "0",
      id: "poly_order_1",
      maker_address: "0xmaker",
      market: "condition_1",
      order_type: "GTC",
      original_size: "12",
      outcome: "Yes",
      owner: "0xowner",
      price: "0.42",
      side: "BUY",
      size_matched: "0",
      status: "live"
    });
    provider.getTrades.mockResolvedValue([
      {
        asset_id: "token_yes",
        bucket_index: 0,
        fee_rate_bps: "0",
        id: "trade_1",
        last_update: "2026-06-24T00:00:00Z",
        maker_address: "0xmaker",
        maker_orders: [],
        market: "condition_1",
        match_time: "2026-06-24T00:00:00Z",
        outcome: "Yes",
        owner: "0xowner",
        price: "0.42",
        side: "BUY" as never,
        size: "12",
        status: "matched",
        taker_order_id: "poly_order_1",
        trader_side: "TAKER"
      }
    ] as never);
    provider.getBalanceAllowance.mockResolvedValue({
      allowances: { exchange: "100" },
      balance: "50"
    });
    provider.cancelOrder.mockResolvedValue({
      orderID: "poly_order_1",
      status: "cancelled",
      success: true
    });
    const adapter = new ClobAdapter(provider);
    const signedOrder = {
      builderCode: intent.builderCode,
      funderAddress: intent.funderAddress,
      rawSignedOrder: { order: "signed" },
      rawPolymarketResponse: { order: "signed" },
      signatureType: 3 as const
    };

    await expect(adapter.createOrDeriveApiKey()).resolves.toEqual({
      key: "key",
      passphrase: "pass",
      secret: "secret"
    });
    await expect(adapter.postSignedOrder(signedOrder, "GTC")).resolves.toMatchObject({
      makingAmount: "42",
      orderID: "poly_order_1",
      success: true,
      takingAmount: "100"
    });
    await expect(adapter.getOpenOrders({ market: "condition_1" })).resolves.toEqual([
      expect.objectContaining({
        assetId: "token_yes",
        orderID: "poly_order_1",
        rawPolymarketResponse: expect.any(Object)
      })
    ]);
    await expect(adapter.getOrder("poly_order_1")).resolves.toMatchObject({
      orderID: "poly_order_1",
      status: "live"
    });
    await expect(adapter.getTrades({ market: "condition_1" })).resolves.toEqual([
      expect.objectContaining({
        assetId: "token_yes",
        id: "trade_1",
        orderID: "poly_order_1"
      })
    ]);
    await expect(adapter.getBalanceAllowance({ assetType: "COLLATERAL" })).resolves.toEqual({
      allowances: { exchange: "100" },
      balance: "50",
      rawPolymarketResponse: {
        allowances: { exchange: "100" },
        balance: "50"
      }
    });
    await expect(adapter.cancelOrder("poly_order_1")).resolves.toMatchObject({
      orderID: "poly_order_1",
      status: "cancelled",
      success: true
    });
  });

  it.each([
    [401, "AUTH_FAILED"],
    [400, "ORDER_REJECTED"],
    [404, "MARKET_NOT_FOUND"],
    [425, "EXCHANGE_PAUSED"],
    [429, "RATE_LIMITED"],
    [500, "MATCHING_ENGINE_UNAVAILABLE"],
    [503, "MATCHING_ENGINE_UNAVAILABLE"]
  ] as const)("maps HTTP %s errors to %s", async (status, code) => {
    const provider = createProvider();
    provider.getOrder.mockResolvedValue({ error: "CLOB failed", status } as never);
    const adapter = new ClobAdapter(provider);

    await expect(adapter.getOrder("poly_order_1")).rejects.toMatchObject({
      code,
      rawPolymarketResponse: { error: "CLOB failed", status }
    });
  });

  it.each([
    ["createOrDeriveApiKey", () => ({ providerMethod: "createOrDeriveApiKey", call: (adapter: ClobAdapter) => adapter.createOrDeriveApiKey() })],
    ["createOrder", () => ({ providerMethod: "createOrder", call: (adapter: ClobAdapter) => adapter.createOrder(intent) })],
    ["postSignedOrder", () => ({
      providerMethod: "postOrder",
      call: (adapter: ClobAdapter) =>
        adapter.postSignedOrder({
          builderCode: null,
          funderAddress: null,
          rawPolymarketResponse: {},
          rawSignedOrder: {},
          signatureType: 3
        })
    })],
    ["createAndPostOrder", () => ({ providerMethod: "createAndPostOrder", call: (adapter: ClobAdapter) => adapter.createAndPostOrder(intent) })],
    ["getOpenOrders", () => ({ providerMethod: "getOpenOrders", call: (adapter: ClobAdapter) => adapter.getOpenOrders() })],
    ["getOrder", () => ({ providerMethod: "getOrder", call: (adapter: ClobAdapter) => adapter.getOrder("poly_order_1") })],
    ["getTrades", () => ({ providerMethod: "getTrades", call: (adapter: ClobAdapter) => adapter.getTrades() })],
    ["getBalanceAllowance", () => ({ providerMethod: "getBalanceAllowance", call: (adapter: ClobAdapter) => adapter.getBalanceAllowance() })],
    ["cancelOrder", () => ({ providerMethod: "cancelOrder", call: (adapter: ClobAdapter) => adapter.cancelOrder("poly_order_1") })]
  ] as const)("maps provider failures from %s", async (_name, setup) => {
    const provider = createProvider();
    const { call, providerMethod } = setup();
    const method = provider[providerMethod as keyof ClobAdapterProvider] as jest.Mock;
    method.mockResolvedValue({ error: "rate limited", status: 429 } as never);
    const adapter = new ClobAdapter(provider);

    await expect(call(adapter)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      rawPolymarketResponse: { error: "rate limited", status: 429 }
    });
  });

  it.each([
    ["insufficient balance", "BALANCE_INSUFFICIENT"],
    ["allowance is missing", "ALLOWANCE_MISSING"]
  ] as const)("maps provider messages containing %s", async (message, code) => {
    const provider = createProvider();
    provider.postOrder.mockRejectedValue(new Error(message));
    const adapter = new ClobAdapter(provider);

    await expect(
      adapter.postSignedOrder({
        builderCode: null,
        funderAddress: null,
        rawSignedOrder: {},
        rawPolymarketResponse: {},
        signatureType: 3
      })
    ).rejects.toMatchObject({ code });
  });
});
