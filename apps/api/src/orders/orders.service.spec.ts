import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  const validBuilderCode = `0x${"1".repeat(64)}`;

  const createPrisma = () => ({
    marketSnapshot: {
      findFirst: jest.fn()
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    position: {
      upsert: jest.fn()
    },
    trade: {
      create: jest.fn()
    }
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
  const createAuditLogService = () => ({
    record: jest.fn().mockResolvedValue(undefined)
  });

  it("creates a CLOB V2 preview draft with builder attribution and disabled submission", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
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
    prisma.order.create.mockResolvedValue({ id: "order_1" });
    const auditLogService = createAuditLogService();
    const service = new OrdersService(
      prisma as never,
      createConfig({ POLYMARKET_BUILDER_CODE: validBuilderCode }),
      createWalletReadinessService() as never,
      createPaperOrderProvider() as never,
      auditLogService as never
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
    expect(prisma.marketSnapshot.findFirst).toHaveBeenCalledWith({
      include: { quotes: { orderBy: { outcomeIndex: "asc" } } },
      where: {
        OR: [{ id: "market_1" }, { marketId: "market_1" }, { slug: "market_1" }]
      }
    });
    expect(prisma.order.create).toHaveBeenCalledWith({
      data: {
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
      },
      select: { id: true }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
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
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: null,
      question: "Will BTC hit $120k in 2026?",
      active: true,
      closed: false,
      outcomes: ["Yes"],
      quotes: [
        {
          outcome: "Yes",
          outcomeIndex: 0,
          tokenId: "token_yes",
          bestAsk: "0.50",
          midpoint: null,
          minOrderSize: null,
          negRisk: false,
          tickSize: "0.01"
        }
      ]
    });
    prisma.order.create.mockResolvedValue({ id: "order_1" });
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never
    );

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
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: null,
      question: "Will BTC hit $120k in 2026?",
      active: true,
      closed: false,
      outcomes: ["Yes"],
      quotes: [
        {
          outcome: "Yes",
          outcomeIndex: 0,
          tokenId: "token_yes",
          bestAsk: "0.50",
          midpoint: null,
          minOrderSize: "5",
          negRisk: false,
          tickSize: "0.01"
        }
      ]
    });
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never
    );

    await expect(
      service.previewOrder(
        { amountUsd: 4.99, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toThrow("Order amount is below the CLOB minimum order size");
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects previews when the CLOB tick size is unsupported", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: null,
      question: "Will BTC hit $120k in 2026?",
      active: true,
      closed: false,
      outcomes: ["Yes"],
      quotes: [
        {
          outcome: "Yes",
          outcomeIndex: 0,
          tokenId: "token_yes",
          bestAsk: "0.50",
          midpoint: null,
          minOrderSize: null,
          negRisk: false,
          tickSize: "0.005"
        }
      ]
    });
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never
    );

    await expect(
      service.previewOrder(
        { amountUsd: 5, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toThrow("Unsupported CLOB tick size");
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it("rejects previews when the market is closed or the outcome quote is missing", async () => {
    const prisma = createPrisma();
    const service = new OrdersService(
      prisma as never,
      createConfig({ POLYMARKET_BUILDER_CODE: validBuilderCode }),
      createWalletReadinessService() as never
    );

    prisma.marketSnapshot.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "missing", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.marketSnapshot.findFirst.mockResolvedValueOnce({
      id: "snapshot_1",
      marketId: "market_1",
      question: "Closed market",
      active: false,
      closed: true,
      outcomes: ["Yes"],
      quotes: []
    });
    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.marketSnapshot.findFirst.mockResolvedValueOnce({
      id: "snapshot_2",
      marketId: "market_2",
      question: "Open market",
      active: true,
      closed: false,
      outcomes: ["Yes"],
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
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: "condition_1",
      slug: "btc-120k",
      question: "Will BTC hit $120k in 2026?",
      active: true,
      closed: false,
      outcomes: ["Yes"],
      quotes: [
        {
          outcome: "Yes",
          outcomeIndex: 0,
          tokenId: "token_yes",
          bestAsk: "0.50",
          midpoint: null,
          minOrderSize: "5",
          negRisk: false,
          tickSize: "0.01"
        }
      ]
    });
    prisma.order.create.mockResolvedValue({ id: "order_1" });
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
    const service = new OrdersService(prisma as never, createConfig(), walletReadinessService as never);

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

  it("includes balance allowance gate details in order previews", async () => {
    const prisma = createPrisma();
    prisma.marketSnapshot.findFirst.mockResolvedValue({
      id: "snapshot_1",
      marketId: "market_1",
      conditionId: "condition_1",
      slug: "btc-120k",
      question: "Will BTC hit $120k in 2026?",
      active: true,
      closed: false,
      outcomes: ["Yes"],
      quotes: [
        {
          outcome: "Yes",
          outcomeIndex: 0,
          tokenId: "token_yes",
          bestAsk: "0.50",
          midpoint: null,
          minOrderSize: "5",
          negRisk: false,
          tickSize: "0.01"
        }
      ]
    });
    prisma.order.create.mockResolvedValue({ id: "order_1" });
    const readiness = {
      ...previewOnlyReadiness,
      depositWallet: {
        address: "0x2222222222222222222222222222222222222222",
        chainId: 137,
        status: "READY" as const
      },
      funding: {
        allowance: "2",
        balanceCacheStale: false,
        balanceCacheUpdatedAt: new Date("2026-06-25T10:00:00.000Z"),
        minimumOrderSize: "5",
        minimumOrderSizeMet: true,
        pUsdBalance: "50",
        reason: "CLOB exchange allowance is insufficient",
        requiredAllowance: "10",
        status: "ALLOWANCE_MISSING" as const
      },
      gates: [
        previewOnlyReadiness.gates[0],
        {
          key: "deposit-wallet" as const,
          reason: "Deposit Wallet is ready",
          status: "READY" as const
        },
        {
          key: "funding-allowance" as const,
          reason: "CLOB exchange allowance is insufficient",
          status: "PENDING" as const
        },
        previewOnlyReadiness.gates[3]
      ]
    };
    const walletReadinessService = createWalletReadinessService(readiness);
    const service = new OrdersService(prisma as never, createConfig(), walletReadinessService as never);

    await expect(
      service.previewOrder(
        { amountUsd: 10, marketId: "market_1", outcomeIndex: 0 },
        { userId: "user_1" }
      )
    ).resolves.toMatchObject({
      readiness: {
        funding: {
          allowance: "2",
          minimumOrderSize: "5",
          pUsdBalance: "50",
          requiredAllowance: "10",
          status: "ALLOWANCE_MISSING"
        },
        gates: expect.arrayContaining([
          {
            key: "funding-allowance",
            reason: "CLOB exchange allowance is insufficient",
            status: "PENDING"
          }
        ])
      }
    });
    expect(walletReadinessService.getReadiness).toHaveBeenCalledWith(
      { userId: "user_1" },
      { minimumOrderSize: 5, requiredAmountUsd: 10 }
    );
  });

  it("creates a signing intent from a previewed order without submitting to CLOB", async () => {
    const prisma = createPrisma();
    prisma.order.findFirst.mockResolvedValue({
      id: "order_1",
      rawPreview: {
        amount: 10,
        orderType: "FAK",
        signatureType: "POLY_1271",
        tokenID: "token_yes"
      },
      status: "PREVIEWED"
    });
    prisma.order.update.mockResolvedValue({
      id: "order_1",
      rawPreview: {
        amount: 10,
        orderType: "FAK",
        signatureType: "POLY_1271",
        tokenID: "token_yes"
      },
      status: "SIGNING_REQUESTED"
    });
    const auditLogService = createAuditLogService();
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never,
      createPaperOrderProvider() as never,
      auditLogService as never
    );

    await expect(
      service.createSigningIntent({ orderId: "order_1" }, { userId: "user_1", role: "USER" })
    ).resolves.toEqual({
      id: "order_1",
      signingPayload: {
        amount: 10,
        orderType: "FAK",
        signatureType: "POLY_1271",
        tokenID: "token_yes"
      },
      status: "SIGNING_REQUESTED"
    });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      select: { id: true, rawPreview: true, status: true },
      where: {
        id: "order_1",
        userId: "user_1"
      }
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      data: {
        clobStatus: "SIGNING_REQUESTED",
        failureReason: null,
        status: "SIGNING_REQUESTED"
      },
      select: { id: true, rawPreview: true, status: true },
      where: { id: "order_1" }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "order.signing_requested",
      metadata: {
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("stores a signed paper order payload after a signing intent", async () => {
    const prisma = createPrisma();
    prisma.order.findFirst.mockResolvedValue({
      id: "order_1",
      status: "SIGNING_REQUESTED"
    });
    prisma.order.update.mockResolvedValue({
      id: "order_1",
      rawSignedOrder: {
        signature: "0xsig",
        signedBy: "0x0000000000000000000000000000000000000001"
      },
      status: "SIGNED"
    });
    const auditLogService = createAuditLogService();
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never,
      createPaperOrderProvider() as never,
      auditLogService as never
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
    expect(JSON.stringify(prisma.order.update.mock.calls)).not.toContain("do-not-save");
    expect(prisma.order.update).toHaveBeenCalledWith({
      data: {
        clobStatus: "SIGNED",
        failureReason: null,
        rawSignedOrder: {
          signature: "0xsig",
          signedBy: "0x0000000000000000000000000000000000000001"
        },
        signedPayload: {
          signature: "0xsig",
          signedBy: "0x0000000000000000000000000000000000000001"
        },
        status: "SIGNED"
      },
      select: { id: true, rawSignedOrder: true, status: true },
      where: { id: "order_1" }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "order.signed",
      metadata: {
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("rejects order submit in preview mode", async () => {
    const prisma = createPrisma();
    prisma.order.findFirst.mockResolvedValue({
      id: "order_1",
      rawSignedOrder: { signature: "0xsig" },
      status: "SIGNED"
    });
    const provider = createPaperOrderProvider();
    const service = new OrdersService(
      prisma as never,
      createConfig({ ORDER_ROUTER_MODE: "preview" }),
      createWalletReadinessService() as never,
      provider as never
    );

    await expect(
      service.submitOrder({ orderId: "order_1" }, { userId: "user_1", role: "USER" })
    ).rejects.toThrow("Order submit is disabled in preview mode");
    expect(provider.submit).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("submits a signed order to the paper provider in paper mode", async () => {
    const prisma = createPrisma();
    prisma.order.findFirst.mockResolvedValue({
      id: "order_1",
      marketSnapshotId: "snapshot_1",
      outcome: "Yes",
      price: { toString: () => "0.5" },
      rawSignedOrder: { signature: "0xsig" },
      side: "BUY",
      size: { toString: () => "20" },
      userId: "user_1",
      status: "SIGNED"
    });
    prisma.order.update.mockResolvedValue({
      clobOrderId: "paper_order_1",
      clobStatus: "SUBMITTED",
      createdAt: new Date("2026-06-30T00:00:00.000Z"),
      failureReason: null,
      id: "order_1",
      marketSnapshot: { marketId: "market_1", question: "Question?" },
      outcome: "Yes",
      price: { toString: () => "0.5" },
      size: { toString: () => "20" },
      status: "SUBMITTED",
      submittedAt: new Date("2026-06-30T00:00:00.000Z"),
      updatedAt: new Date("2026-06-30T00:00:00.000Z")
    });
    const provider = createPaperOrderProvider();
    const auditLogService = createAuditLogService();
    const service = new OrdersService(
      prisma as never,
      createConfig({ ORDER_ROUTER_MODE: "paper" }),
      createWalletReadinessService() as never,
      provider as never,
      auditLogService as never
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
    expect(prisma.order.update).toHaveBeenCalledWith({
      data: {
        clobOrderId: "paper_order_1",
        clobStatus: "SUBMITTED",
        failureReason: null,
        signedPayload: {
          mode: "paper",
          orderId: "order_1"
        },
        status: "SUBMITTED",
        submittedAt: expect.any(Date)
      },
      select: expect.any(Object),
      where: { id: "order_1" }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "order.submitted",
      metadata: {
        clobOrderId: "paper_order_1",
        mode: "paper",
        orderId: "order_1"
      },
      userId: "user_1"
    });
  });

  it("creates a paper trade and position when a paper order is submitted", async () => {
    const prisma = createPrisma();
    prisma.order.findFirst.mockResolvedValue({
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
    prisma.order.update.mockResolvedValue({
      clobOrderId: "paper_order_1",
      clobStatus: "SUBMITTED",
      createdAt: new Date("2026-06-30T00:00:00.000Z"),
      failureReason: null,
      id: "order_1",
      marketSnapshot: { marketId: "market_1", question: "Question?" },
      outcome: "Yes",
      price: { toString: () => "0.5" },
      size: { toString: () => "20" },
      status: "SUBMITTED",
      submittedAt: new Date("2026-06-30T00:00:00.000Z"),
      updatedAt: new Date("2026-06-30T00:00:00.000Z")
    });
    const provider = createPaperOrderProvider();
    const service = new OrdersService(
      prisma as never,
      createConfig({ ORDER_ROUTER_MODE: "paper" }),
      createWalletReadinessService() as never,
      provider as never
    );

    await service.submitOrder({ orderId: "order_1" }, { userId: "user_1", role: "USER" });

    expect(prisma.trade.create).toHaveBeenCalledWith({
      data: {
        clobTradeId: "paper_order_1:fill",
        executedAt: expect.any(Date),
        marketSnapshotId: "snapshot_1",
        orderId: "order_1",
        price: "0.5",
        raw: {
          mode: "paper",
          orderId: "order_1"
        },
        side: "BUY",
        size: "20",
        userId: "user_1"
      }
    });
    expect(prisma.position.upsert).toHaveBeenCalledWith({
      create: {
        averagePrice: "0.5",
        marketSnapshotId: "snapshot_1",
        outcome: "Yes",
        size: "20",
        userId: "user_1"
      },
      update: {
        averagePrice: "0.5",
        size: {
          increment: "20"
        }
      },
      where: {
        userId_marketSnapshotId_outcome: {
          marketSnapshotId: "snapshot_1",
          outcome: "Yes",
          userId: "user_1"
        }
      }
    });
  });

  it("lists user orders without exposing another user's rows", async () => {
    const prisma = createPrisma();
    prisma.order.findMany.mockResolvedValue([
      {
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
      }
    ]);
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never,
      createPaperOrderProvider() as never
    );

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
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user_1" }
    }));
  });

  it("allows admins to list all orders", async () => {
    const prisma = createPrisma();
    prisma.order.findMany.mockResolvedValue([]);
    const service = new OrdersService(
      prisma as never,
      createConfig(),
      createWalletReadinessService() as never,
      createPaperOrderProvider() as never
    );

    await expect(service.listOrders({ userId: "admin_1", role: "ADMIN" })).resolves.toEqual([]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {}
    }));
  });
});
