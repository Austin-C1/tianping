import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  const validBuilderCode = `0x${"1".repeat(64)}`;

  const createOrdersRepository = () => ({
    createPaperFill: jest.fn(),
    createPreviewOrder: jest.fn(),
    findOrderById: jest.fn(),
    findOrderForSignedPayload: jest.fn(),
    findOrderForSigningIntent: jest.fn(),
    findOrderForSubmit: jest.fn(),
    findPreviewMarket: jest.fn(),
    listOrders: jest.fn(),
    markOrderSubmitted: jest.fn(),
    markSigningRequested: jest.fn(),
    saveSignedOrder: jest.fn()
  });

  const createConfig = (values: Record<string, string | undefined> = {}) =>
    ({
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback)
    }) as unknown as ConfigService;

  const previewOnlyReadiness = {
    canPreview: true,
    canSign: false,
    depositWallet: {
      address: null,
      chainId: null,
      status: "NOT_CREATED" as const
    },
    eoa: {
      address: null,
      chainId: null,
      status: "NOT_CONNECTED" as const
    },
    funding: {
      allowance: null,
      pUsdBalance: null,
      status: "NOT_CHECKED" as const
    },
    gates: [
      {
        key: "wallet-binding" as const,
        reason: "EOA wallet is not connected",
        status: "PENDING" as const
      },
      {
        key: "deposit-wallet" as const,
        reason: "Deposit Wallet is not created",
        status: "PENDING" as const
      },
      {
        key: "funding-allowance" as const,
        reason: "pUSD balance and allowance are not checked",
        status: "PENDING" as const
      },
      {
        key: "region-risk" as const,
        reason: "Region risk check is not complete",
        status: "PENDING" as const
      }
    ],
    region: {
      status: "NOT_CHECKED" as const
    }
  };

  const createWalletReadinessService = (readiness: unknown = previewOnlyReadiness) => ({
    getReadiness: jest.fn().mockResolvedValue(readiness)
  });

  const createPaperOrderProvider = () => ({
    submit: jest.fn().mockResolvedValue({
      clobOrderId: "paper_order_1",
      raw: {
        mode: "paper",
        orderId: "order_1"
      },
      status: "SUBMITTED"
    })
  });

  const createAuditLogsRepository = () => ({
    create: jest.fn().mockResolvedValue(undefined)
  });

  const createService = (
    ordersRepository: ReturnType<typeof createOrdersRepository>,
    config: ConfigService = createConfig(),
    walletReadinessService: ReturnType<typeof createWalletReadinessService> = createWalletReadinessService(),
    paperOrderProvider: ReturnType<typeof createPaperOrderProvider> = createPaperOrderProvider(),
    auditLogsRepository: ReturnType<typeof createAuditLogsRepository> = createAuditLogsRepository()
  ) =>
    new OrdersService(
      ordersRepository as never,
      config,
      walletReadinessService as never,
      paperOrderProvider as never,
      auditLogsRepository as never
    );

  const openMarket = () => ({
    id: "snapshot_1",
    marketId: "market_1",
    conditionId: "condition_1",
    slug: "btc-120k",
    question: "Will BTC hit $120k in 2026?",
    active: true,
    closed: false,
    outcomes: ["Yes", "No"],
    quotes: [
      {
        outcome: "Yes",
        outcomeIndex: 0,
        tokenId: "token_yes",
        bestAsk: "0.53",
        midpoint: "0.52",
        minOrderSize: "5",
        negRisk: true,
        tickSize: "0.01"
      }
    ]
  });

  const orderItem = () => ({
    clobOrderId: "paper_order_1",
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    failureReason: null,
    id: "order_1",
    marketSnapshot: { marketId: "market_1", question: "Question?" },
    outcome: "Yes",
    price: { toString: () => "0.5" },
    size: { toString: () => "20" },
    status: "SUBMITTED",
    submittedAt: new Date("2026-06-30T00:01:00.000Z"),
    updatedAt: new Date("2026-06-30T00:01:00.000Z")
  });

  it("creates a CLOB V2 preview draft with builder attribution and disabled submission", async () => {
    const ordersRepository = createOrdersRepository();
    const auditLogsRepository = createAuditLogsRepository();
    ordersRepository.findPreviewMarket.mockResolvedValue(openMarket());
    ordersRepository.createPreviewOrder.mockResolvedValue({ id: "order_1" });
    const service = createService(
      ordersRepository,
      createConfig({ POLYMARKET_BUILDER_CODE: validBuilderCode }),
      createWalletReadinessService(),
      createPaperOrderProvider(),
      auditLogsRepository
    );

    await expect(
      service.previewOrder(
        {
          amountUsd: 10,
          marketId: "market_1",
          outcomeIndex: 0,
          orderType: "FAK"
        },
        { userId: "user_1" }
      )
    ).resolves.toEqual({
      id: "order_1",
      builderAttributionStatus: "CONFIGURED",
      clob: {
        amount: 10,
        builderCode: validBuilderCode,
        funderAddress: null,
        negRisk: true,
        orderType: "FAK",
        side: "BUY",
        signatureType: "POLY_1271",
        tickSize: "0.01",
        tokenID: "token_yes"
      },
      costUsd: 10,
      estimatedPayout: 18.87,
      estimatedProfit: 8.87,
      market: {
        conditionId: "condition_1",
        marketId: "market_1",
        question: "Will BTC hit $120k in 2026?"
      },
      outcome: "Yes",
      price: 0.53,
      readiness: previewOnlyReadiness,
      shares: 18.87,
      submitDisabled: true,
      submitDisabledReason: "Real CLOB submission is disabled by the manual Gate"
    });
    expect(ordersRepository.findPreviewMarket).toHaveBeenCalledWith("market_1");
    expect(ordersRepository.createPreviewOrder).toHaveBeenCalledWith({
      marketSnapshotId: "snapshot_1",
      builderCode: validBuilderCode,
      clobStatus: "PREVIEWED",
      failureReason: null,
      funderAddress: null,
      orderType: "FAK",
      outcome: "Yes",
      price: "0.53",
      rawPreview: expect.objectContaining({
        amount: 10,
        builderCode: validBuilderCode,
        tokenID: "token_yes"
      }),
      rawSignedOrder: undefined,
      side: "BUY",
      signatureType: "POLY_1271",
      size: "18.87",
      status: "PREVIEWED",
      tokenId: "token_yes",
      userId: "user_1"
    });
    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      action: "order.previewed",
      metadata: {
        amountUsd: 10,
        marketId: "market_1",
        orderId: "order_1",
        outcome: "Yes",
        price: 0.53
      },
      userId: "user_1"
    });
  });

  it("marks builder attribution missing without blocking the preview", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.findPreviewMarket.mockResolvedValue({
      ...openMarket(),
      conditionId: null,
      outcomes: ["Yes"]
    });
    ordersRepository.createPreviewOrder.mockResolvedValue({ id: "order_1" });
    const service = createService(ordersRepository);

    await expect(
      service.previewOrder(
        { amountUsd: 5, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).resolves.toMatchObject({
      builderAttributionStatus: "MISSING",
      clob: {
        builderCode: null,
        funderAddress: null,
        orderType: "FAK"
      },
      submitDisabled: true
    });
  });

  it("rejects previews below CLOB minimum order size", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.findPreviewMarket.mockResolvedValue(openMarket());
    const service = createService(ordersRepository);

    await expect(
      service.previewOrder(
        { amountUsd: 4.99, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toThrow("Order amount is below the CLOB minimum order size");
    expect(ordersRepository.createPreviewOrder).not.toHaveBeenCalled();
  });

  it("rejects previews when the CLOB tick size is unsupported", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.findPreviewMarket.mockResolvedValue({
      ...openMarket(),
      quotes: [
        {
          ...openMarket().quotes[0],
          tickSize: "0.005"
        }
      ]
    });
    const service = createService(ordersRepository);

    await expect(
      service.previewOrder(
        { amountUsd: 5, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toThrow("Unsupported CLOB tick size");
    expect(ordersRepository.createPreviewOrder).not.toHaveBeenCalled();
  });

  it("rejects previews when the market is closed or the outcome quote is missing", async () => {
    const ordersRepository = createOrdersRepository();
    const service = createService(
      ordersRepository,
      createConfig({ POLYMARKET_BUILDER_CODE: validBuilderCode })
    );

    ordersRepository.findPreviewMarket.mockResolvedValueOnce(null);
    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "missing", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    ordersRepository.findPreviewMarket.mockResolvedValueOnce({
      ...openMarket(),
      active: false,
      closed: true,
      quotes: []
    });
    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    ordersRepository.findPreviewMarket.mockResolvedValueOnce({
      ...openMarket(),
      quotes: []
    });
    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "market_2", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns deposit wallet readiness gates without blocking the preview", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.findPreviewMarket.mockResolvedValue(openMarket());
    ordersRepository.createPreviewOrder.mockResolvedValue({ id: "order_1" });
    const readiness = {
      ...previewOnlyReadiness,
      eoa: {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED" as const
      },
      gates: [
        {
          key: "wallet-binding" as const,
          reason: "EOA wallet is connected",
          status: "READY" as const
        },
        {
          key: "deposit-wallet" as const,
          reason: "Deposit Wallet is not created",
          status: "PENDING" as const
        },
        previewOnlyReadiness.gates[2],
        previewOnlyReadiness.gates[3]
      ]
    };
    const walletReadinessService = createWalletReadinessService(readiness);
    const service = createService(ordersRepository, createConfig(), walletReadinessService);

    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).resolves.toMatchObject({
      readiness: {
        canPreview: true,
        canSign: false,
        gates: expect.arrayContaining([
          expect.objectContaining({
            key: "wallet-binding",
            status: "READY"
          }),
          expect.objectContaining({
            key: "deposit-wallet",
            status: "PENDING"
          })
        ])
      },
      submitDisabled: true
    });
    expect(walletReadinessService.getReadiness).toHaveBeenCalledWith(
      { userId: "user_1" },
      { minimumOrderSize: 5, requiredAmountUsd: 10 }
    );
  });

  it("creates a signing intent from a previewed order without submitting to CLOB", async () => {
    const ordersRepository = createOrdersRepository();
    const auditLogsRepository = createAuditLogsRepository();
    const rawPreview = {
      amount: 10,
      orderType: "FAK",
      signatureType: "POLY_1271",
      tokenID: "token_yes"
    };
    ordersRepository.findOrderForSigningIntent.mockResolvedValue({
      id: "order_1",
      rawPreview,
      status: "PREVIEWED"
    });
    ordersRepository.markSigningRequested.mockResolvedValue({
      id: "order_1",
      rawPreview,
      status: "SIGNING_REQUESTED"
    });
    const service = createService(
      ordersRepository,
      createConfig(),
      createWalletReadinessService(),
      createPaperOrderProvider(),
      auditLogsRepository
    );

    await expect(
      service.createSigningIntent({ orderId: "order_1" }, { userId: "user_1", role: "USER" })
    ).resolves.toEqual({
      id: "order_1",
      signingPayload: rawPreview,
      status: "SIGNING_REQUESTED"
    });
    expect(ordersRepository.findOrderForSigningIntent).toHaveBeenCalledWith({
      orderId: "order_1",
      role: "USER",
      userId: "user_1"
    });
    expect(ordersRepository.markSigningRequested).toHaveBeenCalledWith("order_1");
    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      action: "order.signing_requested",
      metadata: {
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("stores a signed paper order payload after a signing intent", async () => {
    const ordersRepository = createOrdersRepository();
    const auditLogsRepository = createAuditLogsRepository();
    ordersRepository.findOrderForSignedPayload.mockResolvedValue({
      id: "order_1",
      status: "SIGNING_REQUESTED"
    });
    ordersRepository.saveSignedOrder.mockResolvedValue({
      id: "order_1",
      rawSignedOrder: {
        signature: "0xsig",
        signedBy: "0x0000000000000000000000000000000000000001"
      },
      status: "SIGNED"
    });
    const service = createService(
      ordersRepository,
      createConfig(),
      createWalletReadinessService(),
      createPaperOrderProvider(),
      auditLogsRepository
    );

    await expect(
      service.saveSignedOrder(
        {
          orderId: "order_1",
          signedPayload: {
            privateKey: "do-not-save",
            signature: "0xsig",
            signedBy: "0x0000000000000000000000000000000000000001"
          }
        },
        { userId: "user_1", role: "USER" }
      )
    ).resolves.toEqual({
      id: "order_1",
      signedPayload: {
        signature: "0xsig",
        signedBy: "0x0000000000000000000000000000000000000001"
      },
      status: "SIGNED"
    });
    expect(JSON.stringify(ordersRepository.saveSignedOrder.mock.calls)).not.toContain("do-not-save");
    expect(ordersRepository.saveSignedOrder).toHaveBeenCalledWith({
      orderId: "order_1",
      signedPayload: {
        signature: "0xsig",
        signedBy: "0x0000000000000000000000000000000000000001"
      }
    });
    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      action: "order.signed",
      metadata: {
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("rejects order submit in preview mode", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.findOrderForSubmit.mockResolvedValue({
      id: "order_1",
      marketSnapshotId: "snapshot_1",
      outcome: "Yes",
      price: { toString: () => "0.5" },
      rawSignedOrder: { signature: "0xsig" },
      side: "BUY",
      size: { toString: () => "20" },
      status: "SIGNED",
      userId: "user_1"
    });
    const provider = createPaperOrderProvider();
    const service = createService(
      ordersRepository,
      createConfig({ ORDER_ROUTER_MODE: "preview" }),
      createWalletReadinessService(),
      provider
    );

    await expect(
      service.submitOrder({ orderId: "order_1" }, { userId: "user_1", role: "USER" })
    ).rejects.toThrow("Order submit is disabled in preview mode");
    expect(provider.submit).not.toHaveBeenCalled();
    expect(ordersRepository.markOrderSubmitted).not.toHaveBeenCalled();
  });

  it("submits a signed order to the paper provider in paper mode", async () => {
    const ordersRepository = createOrdersRepository();
    const auditLogsRepository = createAuditLogsRepository();
    const order = {
      id: "order_1",
      marketSnapshotId: "snapshot_1",
      outcome: "Yes",
      price: { toString: () => "0.5" },
      rawSignedOrder: { signature: "0xsig" },
      side: "BUY" as const,
      size: { toString: () => "20" },
      userId: "user_1",
      status: "SIGNED"
    };
    ordersRepository.findOrderForSubmit.mockResolvedValue(order);
    ordersRepository.markOrderSubmitted.mockResolvedValue(orderItem());
    const provider = createPaperOrderProvider();
    const service = createService(
      ordersRepository,
      createConfig({ ORDER_ROUTER_MODE: "paper" }),
      createWalletReadinessService(),
      provider,
      auditLogsRepository
    );

    await expect(
      service.submitOrder({ orderId: "order_1" }, { userId: "user_1", role: "USER" })
    ).resolves.toMatchObject({
      clobOrderId: "paper_order_1",
      id: "order_1",
      status: "SUBMITTED"
    });
    expect(provider.submit).toHaveBeenCalledWith({
      orderId: "order_1",
      signedPayload: { signature: "0xsig" }
    });
    expect(ordersRepository.markOrderSubmitted).toHaveBeenCalledWith({
      clobOrderId: "paper_order_1",
      clobStatus: "SUBMITTED",
      orderId: "order_1",
      raw: {
        mode: "paper",
        orderId: "order_1"
      },
      submittedAt: expect.any(Date)
    });
    expect(ordersRepository.createPaperFill).toHaveBeenCalledWith({
      clobOrderId: "paper_order_1",
      executedAt: expect.any(Date),
      order,
      raw: {
        mode: "paper",
        orderId: "order_1"
      }
    });
    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      action: "order.submitted",
      metadata: {
        clobOrderId: "paper_order_1",
        mode: "paper",
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("lists user orders without exposing another user's rows", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.listOrders.mockResolvedValue([orderItem()]);
    const service = createService(ordersRepository);

    await expect(service.listOrders({ userId: "user_1", role: "USER" })).resolves.toEqual([
      {
        clobOrderId: "paper_order_1",
        createdAt: new Date("2026-06-30T00:00:00.000Z"),
        failureReason: null,
        id: "order_1",
        market: { marketId: "market_1", question: "Question?" },
        outcome: "Yes",
        price: "0.5",
        size: "20",
        status: "SUBMITTED",
        submittedAt: new Date("2026-06-30T00:01:00.000Z"),
        updatedAt: new Date("2026-06-30T00:01:00.000Z")
      }
    ]);
    expect(ordersRepository.listOrders).toHaveBeenCalledWith({
      role: "USER",
      userId: "user_1"
    });
  });

  it("allows admins to list all orders", async () => {
    const ordersRepository = createOrdersRepository();
    ordersRepository.listOrders.mockResolvedValue([]);
    const service = createService(ordersRepository);

    await expect(service.listOrders({ userId: "admin_1", role: "ADMIN" })).resolves.toEqual([]);
    expect(ordersRepository.listOrders).toHaveBeenCalledWith({
      role: "ADMIN",
      userId: "admin_1"
    });
  });
});
