import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { getAddress } from "viem";
import {
  DEPOSIT_WALLETS_REPOSITORY,
  WALLETS_REPOSITORY
} from "../infrastructure/repositories/repository.tokens";
import type {
  DepositWalletRecord,
  DepositWalletsRepository,
  RelayerTransactionRecord,
  WalletOperationRecord,
  WalletsRepository
} from "../infrastructure/repositories/repository.types";
import type { CreateDepositWalletIntentDto, SubmitDepositWalletSignedBatchDto } from "./dto/deposit-wallet.dto";
import {
  DEPOSIT_WALLET_RELAYER,
  type DepositWalletRelayer,
  type DepositWalletRelayerResult
} from "./deposit-wallet-relayer";

interface Operator {
  userId: string;
}

type DepositWalletStatus = "NOT_CREATED" | "INTENT_CREATED" | "PENDING" | "READY" | "FAILED";
type WalletOperationStatus = "INTENT_CREATED" | "SUBMITTED" | "FAILED";

export interface DepositWalletIntentResult {
  action: "CREATE_DEPOSIT_WALLET";
  operationId: string;
  ownerAddress: string;
  chainId: number;
  depositWalletAddress: string | null;
  relayerRequest: Record<string, unknown>;
  status: WalletOperationStatus;
  typedData: {
    action: "CREATE_DEPOSIT_WALLET";
    ownerAddress: string;
    chainId: number;
  };
}

export interface DepositWalletSubmitResult {
  operationId: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  relayerTransactionId: string | null;
  depositWalletAddress: string | null;
  failureReason: string | null;
}

export interface DepositWalletStatusResult {
  address: string | null;
  ownerAddress: string | null;
  chainId: number | null;
  status: DepositWalletStatus;
  updatedAt: Date | null;
  latestOperation: WalletOperationRecord | null;
  latestRelayerTransaction: RelayerTransactionRecord | null;
}

const CREATE_DEPOSIT_WALLET = "CREATE_DEPOSIT_WALLET";
const SENSITIVE_KEYS = new Set(["privatekey", "private_key", "mnemonic", "seed", "secret"]);

@Injectable()
export class DepositWalletService {
  constructor(
    @Inject(WALLETS_REPOSITORY)
    private readonly walletsRepository: WalletsRepository,
    @Inject(DEPOSIT_WALLETS_REPOSITORY)
    private readonly depositWalletsRepository: DepositWalletsRepository,
    @Inject(DEPOSIT_WALLET_RELAYER)
    private readonly relayer: DepositWalletRelayer
  ) {}

  async createIntent(
    input: CreateDepositWalletIntentDto,
    operator: Operator
  ): Promise<DepositWalletIntentResult> {
    const ownerAddress = this.normalizeAddress(input.ownerAddress);
    await this.requireConnectedEoa(ownerAddress, input.chainId, operator);

    const typedData = {
      action: "CREATE_DEPOSIT_WALLET" as const,
      chainId: input.chainId,
      ownerAddress
    };
    const preparedBatch = await this.relayer.prepareCreateWalletBatch({
      chainId: input.chainId,
      ownerAddress
    });
    const existingDepositWallet = await this.depositWalletsRepository.findDepositWalletByOwner({
      chainId: input.chainId,
      ownerAddress,
      userId: operator.userId
    });
    const depositWallet = this.isReadyDepositWallet(existingDepositWallet)
      ? existingDepositWallet
      : await this.depositWalletsRepository.upsertDepositWalletIntent({
          address: preparedBatch.depositWalletAddress,
          chainId: input.chainId,
          ownerAddress,
          raw: typedData,
          userId: operator.userId
        });
    const operation = await this.depositWalletsRepository.createWalletOperation({
      depositWalletId: depositWallet.id,
      intentPayload: typedData,
      status: "INTENT_CREATED",
      type: CREATE_DEPOSIT_WALLET,
      userId: operator.userId
    });

    return {
      action: CREATE_DEPOSIT_WALLET,
      chainId: input.chainId,
      depositWalletAddress: depositWallet.address ?? preparedBatch.depositWalletAddress,
      operationId: operation.id,
      ownerAddress,
      relayerRequest: preparedBatch.relayerRequest,
      status: operation.status as WalletOperationStatus,
      typedData
    };
  }

  async submitSignedBatch(
    input: SubmitDepositWalletSignedBatchDto,
    operator: Operator
  ): Promise<DepositWalletSubmitResult> {
    const operation = await this.depositWalletsRepository.findWalletOperationForUser({
      operationId: input.operationId,
      type: CREATE_DEPOSIT_WALLET,
      userId: operator.userId
    });

    if (!operation?.depositWalletId) {
      throw new BadRequestException("Deposit Wallet operation is not valid");
    }

    const signedBatch = this.sanitizePayload(input.signedBatch);

    try {
      const relayerResult = await this.relayer.submitSignedBatch(signedBatch);

      await this.depositWalletsRepository.markWalletOperationSubmitted({
        operationId: operation.id,
        signedPayload: signedBatch
      });
      await this.updateDepositWalletAfterRelayer(operation.depositWalletId, relayerResult, null);
      await this.depositWalletsRepository.createRelayerTransaction({
        depositWalletId: operation.depositWalletId,
        failureReason: null,
        raw: relayerResult.raw,
        relayerTransactionId: relayerResult.relayerTransactionId,
        status: relayerResult.status,
        userId: operator.userId,
        walletOperationId: operation.id
      });

      return {
        depositWalletAddress: relayerResult.depositWalletAddress,
        failureReason: null,
        operationId: operation.id,
        relayerTransactionId: relayerResult.relayerTransactionId,
        status: relayerResult.status
      };
    } catch (error) {
      const failureReason = this.errorMessage(error);

      await this.depositWalletsRepository.markWalletOperationFailed({
        failureReason,
        operationId: operation.id,
        signedPayload: signedBatch
      });
      await this.markDepositWalletFailed(operation.depositWalletId, failureReason);
      await this.depositWalletsRepository.createRelayerTransaction({
        depositWalletId: operation.depositWalletId,
        failureReason,
        raw: { error: failureReason },
        relayerTransactionId: null,
        status: "FAILED",
        userId: operator.userId,
        walletOperationId: operation.id
      });

      return {
        depositWalletAddress: null,
        failureReason,
        operationId: operation.id,
        relayerTransactionId: null,
        status: "FAILED"
      };
    }
  }

  async getStatus(operator: Operator): Promise<DepositWalletStatusResult> {
    const depositWallet = await this.depositWalletsRepository.findLatestDepositWallet(operator.userId);

    if (!depositWallet) {
      return {
        address: null,
        chainId: null,
        latestOperation: null,
        latestRelayerTransaction: null,
        ownerAddress: null,
        status: "NOT_CREATED",
        updatedAt: null
      };
    }

    const [latestOperation, latestRelayerTransaction] = await Promise.all([
      this.depositWalletsRepository.findLatestWalletOperation({
        depositWalletId: depositWallet.id,
        userId: operator.userId
      }),
      this.depositWalletsRepository.findLatestRelayerTransaction({
        depositWalletId: depositWallet.id,
        userId: operator.userId
      })
    ]);

    return {
      address: depositWallet.address,
      chainId: depositWallet.chainId,
      latestOperation,
      latestRelayerTransaction,
      ownerAddress: depositWallet.ownerAddress,
      status: this.depositWalletStatus(depositWallet),
      updatedAt: depositWallet.updatedAt
    };
  }

  private async requireConnectedEoa(ownerAddress: string, chainId: number, operator: Operator) {
    const wallet = await this.walletsRepository.findConnectedEoaWallet({
      address: ownerAddress,
      chainId,
      userId: operator.userId
    });

    if (!wallet) {
      throw new BadRequestException("Owner EOA wallet is not connected");
    }
  }

  private async updateDepositWalletAfterRelayer(
    depositWalletId: string,
    relayerResult: DepositWalletRelayerResult,
    failureReason: string | null
  ) {
    const existingDepositWallet = await this.depositWalletsRepository.findDepositWalletById(depositWalletId);
    if (this.isReadyDepositWallet(existingDepositWallet) && relayerResult.status !== "CONFIRMED") {
      return;
    }

    await this.depositWalletsRepository.updateDepositWalletAfterRelayer({
      depositWalletAddress: relayerResult.depositWalletAddress,
      depositWalletId,
      failureReason,
      raw: relayerResult.raw,
      status: relayerResult.status === "CONFIRMED" ? "READY" : relayerResult.status
    });
  }

  private async markDepositWalletFailed(depositWalletId: string, failureReason: string) {
    const existingDepositWallet = await this.depositWalletsRepository.findDepositWalletById(depositWalletId);
    if (this.isReadyDepositWallet(existingDepositWallet)) {
      return;
    }

    await this.depositWalletsRepository.markDepositWalletFailed({
      depositWalletId,
      failureReason
    });
  }

  private isReadyDepositWallet(value: DepositWalletRecord | null): value is DepositWalletRecord {
    return value?.status === "READY" && Boolean(value.address);
  }

  private depositWalletStatus(value: DepositWalletRecord): DepositWalletStatus {
    if (value.status === "READY" && value.address) {
      return "READY";
    }

    if (value.status === "FAILED") {
      return "FAILED";
    }

    if (value.status === "PENDING") {
      return "PENDING";
    }

    return "INTENT_CREATED";
  }

  private normalizeAddress(value: string): string {
    try {
      return getAddress(value);
    } catch {
      throw new BadRequestException("Owner address is not valid");
    }
  }

  private sanitizePayload(value: unknown): Record<string, unknown> {
    const sanitized = this.sanitizeValue(value);

    return sanitized !== null && typeof sanitized === "object" && !Array.isArray(sanitized)
      ? (sanitized as Record<string, unknown>)
      : {};
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value === null || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase()))
        .map(([key, item]) => [key, this.sanitizeValue(item)])
    );
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

export type { DepositWalletRelayer };
