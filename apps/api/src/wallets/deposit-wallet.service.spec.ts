import { BadRequestException } from "@nestjs/common";
import {
  DepositWalletService,
  type DepositWalletRelayer
} from "./deposit-wallet.service";

describe("DepositWalletService", () => {
  const operator = { userId: "user_1" };
  const ownerAddress = "0x0000000000000000000000000000000000000001";
  const depositWalletAddress = "0x2222222222222222222222222222222222222222";

  const createWalletsRepository = () => ({
    findConnectedEoaWallet: jest.fn()
  });

  const createDepositWalletsRepository = () => ({
    createRelayerTransaction: jest.fn(),
    createWalletOperation: jest.fn(),
    findDepositWalletById: jest.fn(),
    findDepositWalletByOwner: jest.fn(),
    findLatestDepositWallet: jest.fn(),
    findLatestRelayerTransaction: jest.fn(),
    findLatestWalletOperation: jest.fn(),
    findWalletOperationForUser: jest.fn(),
    markDepositWalletFailed: jest.fn(),
    markWalletOperationFailed: jest.fn(),
    markWalletOperationSubmitted: jest.fn(),
    updateDepositWalletAfterRelayer: jest.fn(),
    upsertDepositWalletIntent: jest.fn()
  });

  const createRelayer = (): jest.Mocked<DepositWalletRelayer> => ({
    prepareCreateWalletBatch: jest.fn(async (_input: { ownerAddress: string; chainId: number }) => ({
      actions: [
        {
          type: "CREATE_DEPOSIT_WALLET" as const
        }
      ],
      depositWalletAddress,
      relayerRequest: {
        from: ownerAddress,
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      }
    })),
    submitSignedBatch: jest.fn()
  });

  const createService = (
    walletsRepository: ReturnType<typeof createWalletsRepository>,
    depositWalletsRepository: ReturnType<typeof createDepositWalletsRepository>,
    relayer: jest.Mocked<DepositWalletRelayer>
  ) => new (DepositWalletService as any)(walletsRepository, depositWalletsRepository, relayer);

  it("creates an idempotent Deposit Wallet signing intent without storing private keys", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    walletsRepository.findConnectedEoaWallet.mockResolvedValue({
      address: ownerAddress,
      chainId: 137
    });
    depositWalletsRepository.findDepositWalletByOwner.mockResolvedValue(null);
    depositWalletsRepository.upsertDepositWalletIntent.mockResolvedValue({
      address: null,
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress,
      status: "INTENT_CREATED",
      updatedAt: new Date("2026-06-24T12:00:00.000Z")
    });
    depositWalletsRepository.createWalletOperation.mockResolvedValue({
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress,
          privateKey: "do-not-save"
        } as never,
        operator
      )
    ).resolves.toEqual({
      action: "CREATE_DEPOSIT_WALLET",
      chainId: 137,
      depositWalletAddress,
      operationId: "wallet_operation_1",
      ownerAddress,
      relayerRequest: {
        from: ownerAddress,
        to: "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07",
        type: "WALLET-CREATE"
      },
      status: "INTENT_CREATED",
      typedData: {
        action: "CREATE_DEPOSIT_WALLET",
        chainId: 137,
        ownerAddress
      }
    });
    expect(walletsRepository.findConnectedEoaWallet).toHaveBeenCalledWith({
      address: ownerAddress,
      chainId: 137,
      userId: "user_1"
    });
    expect(JSON.stringify(depositWalletsRepository.upsertDepositWalletIntent.mock.calls)).not.toContain("do-not-save");
    expect(JSON.stringify(depositWalletsRepository.createWalletOperation.mock.calls)).not.toContain("do-not-save");
  });

  it("does not downgrade a READY Deposit Wallet when creating another intent", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    const updatedAt = new Date("2026-06-24T12:00:00.000Z");
    walletsRepository.findConnectedEoaWallet.mockResolvedValue({
      address: ownerAddress,
      chainId: 137
    });
    depositWalletsRepository.findDepositWalletByOwner.mockResolvedValue({
      address: depositWalletAddress,
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress,
      status: "READY",
      updatedAt
    });
    depositWalletsRepository.createWalletOperation.mockResolvedValue({
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress
        },
        operator
      )
    ).resolves.toMatchObject({
      depositWalletAddress,
      operationId: "wallet_operation_1",
      relayerRequest: {
        type: "WALLET-CREATE"
      },
      status: "INTENT_CREATED"
    });
    expect(depositWalletsRepository.upsertDepositWalletIntent).not.toHaveBeenCalled();
    expect(depositWalletsRepository.createWalletOperation).toHaveBeenCalledWith({
      depositWalletId: "deposit_wallet_1",
      intentPayload: {
        action: "CREATE_DEPOSIT_WALLET",
        chainId: 137,
        ownerAddress
      },
      status: "INTENT_CREATED",
      type: "CREATE_DEPOSIT_WALLET",
      userId: "user_1"
    });
  });

  it("submits a signed wallet batch to relayer and stores relayer transaction state", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    depositWalletsRepository.findWalletOperationForUser.mockResolvedValue({
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    relayer.submitSignedBatch.mockResolvedValue({
      depositWalletAddress,
      raw: { ok: true },
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    depositWalletsRepository.findDepositWalletById.mockResolvedValue(null);
    depositWalletsRepository.markWalletOperationSubmitted.mockResolvedValue({
      id: "wallet_operation_1",
      status: "SUBMITTED"
    });
    depositWalletsRepository.updateDepositWalletAfterRelayer.mockResolvedValue({
      id: "deposit_wallet_1",
      status: "PENDING"
    });
    depositWalletsRepository.createRelayerTransaction.mockResolvedValue({
      failureReason: null,
      id: "relayer_transaction_1",
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

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
      depositWalletAddress,
      failureReason: null,
      operationId: "wallet_operation_1",
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING"
    });
    expect(relayer.submitSignedBatch).toHaveBeenCalledWith({
      signature: "0xsig"
    });
    expect(JSON.stringify(depositWalletsRepository.markWalletOperationSubmitted.mock.calls)).not.toContain("do-not-save");
    expect(depositWalletsRepository.createRelayerTransaction).toHaveBeenCalledWith({
      depositWalletId: "deposit_wallet_1",
      failureReason: null,
      raw: { ok: true },
      relayerTransactionId: "relayer_tx_1",
      status: "PENDING",
      userId: "user_1",
      walletOperationId: "wallet_operation_1"
    });
  });

  it("stores relayer failure reasons so the same operation can be retried", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    depositWalletsRepository.findWalletOperationForUser.mockResolvedValue({
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    relayer.submitSignedBatch.mockRejectedValue(new Error("relayer unavailable"));
    depositWalletsRepository.findDepositWalletById.mockResolvedValue(null);
    depositWalletsRepository.markWalletOperationFailed.mockResolvedValue({
      id: "wallet_operation_1",
      status: "FAILED"
    });
    depositWalletsRepository.markDepositWalletFailed.mockResolvedValue({
      id: "deposit_wallet_1",
      status: "FAILED"
    });
    depositWalletsRepository.createRelayerTransaction.mockResolvedValue({
      failureReason: "relayer unavailable",
      id: "relayer_transaction_1",
      relayerTransactionId: null,
      status: "FAILED"
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

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
    expect(depositWalletsRepository.markWalletOperationFailed).toHaveBeenCalledWith({
      failureReason: "relayer unavailable",
      operationId: "wallet_operation_1",
      signedPayload: { signature: "0xsig" }
    });
  });

  it("does not downgrade a READY Deposit Wallet when a relayer retry fails", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    depositWalletsRepository.findWalletOperationForUser.mockResolvedValue({
      depositWalletId: "deposit_wallet_1",
      id: "wallet_operation_1",
      status: "INTENT_CREATED"
    });
    depositWalletsRepository.findDepositWalletById.mockResolvedValue({
      address: depositWalletAddress,
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress,
      status: "READY",
      updatedAt: new Date("2026-06-24T12:02:00.000Z")
    });
    relayer.submitSignedBatch.mockRejectedValue(new Error("relayer unavailable"));
    depositWalletsRepository.markWalletOperationFailed.mockResolvedValue({
      id: "wallet_operation_1",
      status: "FAILED"
    });
    depositWalletsRepository.createRelayerTransaction.mockResolvedValue({
      failureReason: "relayer unavailable",
      id: "relayer_transaction_1",
      relayerTransactionId: null,
      status: "FAILED"
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

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
    expect(depositWalletsRepository.markDepositWalletFailed).not.toHaveBeenCalled();
  });

  it("returns Deposit Wallet status with latest relayer transaction", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    const updatedAt = new Date("2026-06-24T12:02:00.000Z");
    depositWalletsRepository.findLatestDepositWallet.mockResolvedValue({
      address: depositWalletAddress,
      chainId: 137,
      id: "deposit_wallet_1",
      ownerAddress,
      status: "READY",
      updatedAt
    });
    depositWalletsRepository.findLatestWalletOperation.mockResolvedValue({
      failureReason: null,
      id: "wallet_operation_1",
      status: "SUBMITTED",
      type: "CREATE_DEPOSIT_WALLET",
      updatedAt
    });
    depositWalletsRepository.findLatestRelayerTransaction.mockResolvedValue({
      failureReason: null,
      id: "relayer_transaction_1",
      relayerTransactionId: "relayer_tx_1",
      status: "CONFIRMED",
      updatedAt
    });
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

    await expect(service.getStatus(operator)).resolves.toEqual({
      address: depositWalletAddress,
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
      ownerAddress,
      status: "READY",
      updatedAt
    });
  });

  it("rejects Deposit Wallet intents when the owner EOA is not connected", async () => {
    const walletsRepository = createWalletsRepository();
    const depositWalletsRepository = createDepositWalletsRepository();
    const relayer = createRelayer();
    walletsRepository.findConnectedEoaWallet.mockResolvedValue(null);
    const service = createService(walletsRepository, depositWalletsRepository, relayer);

    await expect(
      service.createIntent(
        {
          chainId: 137,
          ownerAddress
        },
        operator
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
