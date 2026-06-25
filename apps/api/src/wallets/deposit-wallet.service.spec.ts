import { BadRequestException } from "@nestjs/common";
import {
  DepositWalletService,
  type DepositWalletRelayer
} from "./deposit-wallet.service";

describe("DepositWalletService", () => {
  const operator = { userId: "user_1" };

  const createPrisma = () => ({
    depositWallet: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn()
    },
    relayerTransaction: {
      create: jest.fn(),
      findFirst: jest.fn()
    },
    wallet: {
      findFirst: jest.fn()
    },
    walletOperation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    }
  });

  const createRelayer = (): jest.Mocked<DepositWalletRelayer> => ({
    prepareCreateWalletBatch: jest.fn(async (_input: { ownerAddress: string; chainId: number }) => ({
      actions: [
        {
          type: "CREATE_DEPOSIT_WALLET" as const
        }
      ],
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      relayerRequest: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      }
    })),
    submitSignedBatch: jest.fn()
  });

  it("creates an idempotent Deposit Wallet signing intent without storing private keys", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    prisma.wallet.findFirst.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 137
    });
    prisma.depositWallet.upsert.mockResolvedValue({
      address: null,
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "INTENT_CREATED",
      updatedAt: new Date("2026-06-24T12:00:00.000Z")
    });
    prisma.walletOperation.create.mockResolvedValue({
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress: "0x0000000000000000000000000000000000000001",
          privateKey: "do-not-save"
        } as never,
        operator
      )
    ).resolves.toEqual({
      action: "CREATE_DEPOSIT_WALLET",
      chainId: 137,
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      operationId: "wallet_operation_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      relayerRequest: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      },
      status: "INTENT_CREATED",
      typedData: {
        action: "CREATE_DEPOSIT_WALLET",
        chainId: 137,
        ownerAddress: "0x0000000000000000000000000000000000000001"
      }
    });
    expect(relayer.prepareCreateWalletBatch).toHaveBeenCalledWith({
      chainId: 137,
      ownerAddress: "0x0000000000000000000000000000000000000001"
    });
    expect(prisma.wallet.findFirst).toHaveBeenCalledWith({
      select: { address: true, chainId: true },
      where: {
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        type: "EOA",
        userId: "user_1"
      }
    });
    expect(JSON.stringify(prisma.depositWallet.upsert.mock.calls)).not.toContain("do-not-save");
    expect(JSON.stringify(prisma.walletOperation.create.mock.calls)).not.toContain("do-not-save");
  });

  it("does not downgrade a READY Deposit Wallet when creating another intent", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    const updatedAt = new Date("2026-06-24T12:00:00.000Z");
    prisma.wallet.findFirst.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 137
    });
    prisma.depositWallet.findFirst.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY",
      updatedAt
    });
    prisma.depositWallet.upsert.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "INTENT_CREATED",
      updatedAt
    });
    prisma.walletOperation.create.mockResolvedValue({
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress: "0x0000000000000000000000000000000000000001"
        },
        operator
      )
    ).resolves.toMatchObject({
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      operationId: "wallet_operation_1",
      relayerRequest: {
        type: "WALLET-CREATE"
      },
      status: "INTENT_CREATED"
    });
    expect(prisma.depositWallet.upsert).not.toHaveBeenCalled();
    expect(prisma.walletOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        depositWalletId: "deposit_wallet_1",
        status: "INTENT_CREATED"
      }),
      select: {
        id: true,
        status: true
      }
    });
  });

  it("submits a signed wallet batch to relayer and stores relayer transaction state", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    const updatedAt = new Date("2026-06-24T12:01:00.000Z");
    prisma.walletOperation.findFirst.mockResolvedValue({
      depositWallet: {
        id: "deposit_wallet_1"
      },
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    relayer.submitSignedBatch.mockResolvedValue({
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      raw: { ok: true },
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    prisma.walletOperation.update.mockResolvedValue({
      id: "wallet_operation_1",
      status: "SUBMITTED"
    });
    prisma.depositWallet.update.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "PENDING",
      updatedAt
    });
    prisma.relayerTransaction.create.mockResolvedValue({
      failureReason: null,
      id: "relayer_transaction_1",
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.submitSignedBatch(
        {
          operationId: "wallet_operation_1",
          signedBatch: {
            privateKey: "do-not-save",
            signature: "0xsig"
          }
        },
        operator
      )
    ).resolves.toEqual({
      depositWalletAddress: "0x2222222222222222222222222222222222222222",
      failureReason: null,
      operationId: "wallet_operation_1",
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    expect(relayer.submitSignedBatch).toHaveBeenCalledWith({
      signature: "0xsig"
    });
    expect(JSON.stringify(prisma.walletOperation.update.mock.calls)).not.toContain("do-not-save");
    expect(prisma.relayerTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        depositWalletId: "deposit_wallet_1",
        failureReason: null,
        relayerTransactionId: "relayer_tx_1",
        status: "PENDING",
        walletOperationId: "wallet_operation_1"
      })
    });
  });

  it("stores relayer failure reasons so the same operation can be retried", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    prisma.walletOperation.findFirst.mockResolvedValue({
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    relayer.submitSignedBatch.mockRejectedValue(new Error("relayer unavailable"));
    prisma.walletOperation.update.mockResolvedValue({
      id: "wallet_operation_1",
      status: "FAILED"
    });
    prisma.depositWallet.update.mockResolvedValue({
      id: "deposit_wallet_1",
      status: "FAILED"
    });
    prisma.relayerTransaction.create.mockResolvedValue({
      failureReason: "relayer unavailable",
      id: "relayer_transaction_1",
      relayerTransactionId: null,
      status: "FAILED"
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.submitSignedBatch(
        {
          operationId: "wallet_operation_1",
          signedBatch: { signature: "0xsig" }
        },
        operator
      )
    ).resolves.toEqual({
      depositWalletAddress: null,
      failureReason: "relayer unavailable",
      operationId: "wallet_operation_1",
      relayerTransactionId: null,
      status: "FAILED"
    });
    expect(prisma.walletOperation.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        failureReason: "relayer unavailable",
        status: "FAILED"
      }),
      where: { id: "wallet_operation_1" }
    });
  });

  it("does not downgrade a READY Deposit Wallet when a relayer retry fails", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    prisma.walletOperation.findFirst.mockResolvedValue({
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    prisma.depositWallet.findFirst.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY",
      updatedAt: new Date("2026-06-24T12:02:00.000Z")
    });
    relayer.submitSignedBatch.mockRejectedValue(new Error("relayer unavailable"));
    prisma.walletOperation.update.mockResolvedValue({
      id: "wallet_operation_1",
      status: "FAILED"
    });
    prisma.relayerTransaction.create.mockResolvedValue({
      failureReason: "relayer unavailable",
      id: "relayer_transaction_1",
      relayerTransactionId: null,
      status: "FAILED"
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.submitSignedBatch(
        {
          operationId: "wallet_operation_1",
          signedBatch: { signature: "0xsig" }
        },
        operator
      )
    ).resolves.toMatchObject({
      failureReason: "relayer unavailable",
      operationId: "wallet_operation_1",
      status: "FAILED"
    });
    expect(prisma.depositWallet.update).not.toHaveBeenCalled();
  });

  it("returns Deposit Wallet status with latest relayer transaction", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    const updatedAt = new Date("2026-06-24T12:02:00.000Z");
    prisma.depositWallet.findFirst.mockResolvedValue({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY",
      updatedAt
    });
    prisma.walletOperation.findFirst.mockResolvedValue({
      failureReason: null,
      id: "wallet_operation_1",
      status: "SUBMITTED",
      type: "CREATE_DEPOSIT_WALLET",
      updatedAt
    });
    prisma.relayerTransaction.findFirst.mockResolvedValue({
      failureReason: null,
      id: "relayer_transaction_1",
      relayerTransactionId: "relayer_tx_1",
      status: "CONFIRMED",
      updatedAt
    });
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(service.getStatus(operator)).resolves.toEqual({
      address: "0x2222222222222222222222222222222222222222",
      chainId: 137,
      latestOperation: {
        failureReason: null,
        id: "wallet_operation_1",
        status: "SUBMITTED",
        type: "CREATE_DEPOSIT_WALLET",
        updatedAt
      },
      latestRelayerTransaction: {
        failureReason: null,
        id: "relayer_transaction_1",
        relayerTransactionId: "relayer_tx_1",
        status: "CONFIRMED",
        updatedAt
      },
      ownerAddress: "0x0000000000000000000000000000000000000001",
      status: "READY",
      updatedAt
    });
  });

  it("rejects Deposit Wallet intents when the owner EOA is not connected", async () => {
    const prisma = createPrisma();
    const relayer = createRelayer();
    prisma.wallet.findFirst.mockResolvedValue(null);
    const service = new DepositWalletService(prisma as never, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress: "0x0000000000000000000000000000000000000001"
        },
        operator
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
