import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getAddress } from "viem";
import { PrismaService } from "../prisma/prisma.service";
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

interface DepositWalletRecord {
  id: string;
  ownerAddress: string;
  address: string | null;
  chainId: number;
  status: string;
  updatedAt: Date;
}

interface WalletOperationRecord {
  id: string;
  type: string;
  status: string;
  failureReason: string | null;
  updatedAt: Date;
}

interface RelayerTransactionRecord {
  id: string;
  relayerTransactionId: string | null;
  status: string;
  failureReason: string | null;
  updatedAt: Date;
}

interface PrismaDelegate {
  create(args: object): Promise<any>;
  findFirst(args: object): Promise<any>;
  update(args: object): Promise<any>;
  upsert(args: object): Promise<any>;
}

interface DepositWalletPrisma {
  depositWallet: PrismaDelegate;
  relayerTransaction: PrismaDelegate;
  wallet: Pick<PrismaDelegate, "findFirst">;
  walletOperation: PrismaDelegate;
}

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
    private readonly prisma: PrismaService,
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
    const existingDepositWallet = await this.findDepositWalletByOwner(ownerAddress, input.chainId, operator);
    const depositWallet = this.isReadyDepositWallet(existingDepositWallet)
      ? existingDepositWallet
      : await this.db.depositWallet.upsert({
          create: {
            address: preparedBatch.depositWalletAddress,
            chainId: input.chainId,
            ownerAddress,
            raw: this.inputJson(typedData),
            status: "INTENT_CREATED",
            userId: operator.userId
          },
          update: {
            address: preparedBatch.depositWalletAddress,
            failureReason: null,
            raw: this.inputJson(typedData),
            status: "INTENT_CREATED"
          },
          where: {
            userId_ownerAddress_chainId: {
              chainId: input.chainId,
              ownerAddress,
              userId: operator.userId
            }
          }
        });
    const operation = await this.db.walletOperation.create({
      data: {
        depositWalletId: depositWallet.id,
        intentPayload: this.inputJson(typedData),
        status: "INTENT_CREATED",
        type: CREATE_DEPOSIT_WALLET,
        userId: operator.userId
      },
      select: {
        id: true,
        status: true
      }
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
    const operation = await this.db.walletOperation.findFirst({
      select: {
        depositWalletId: true,
        id: true,
        status: true
      },
      where: {
        id: input.operationId,
        type: CREATE_DEPOSIT_WALLET,
        userId: operator.userId
      }
    });

    if (!operation?.depositWalletId) {
      throw new BadRequestException("Deposit Wallet operation is not valid");
    }

    const signedBatch = this.sanitizePayload(input.signedBatch);

    try {
      const relayerResult = await this.relayer.submitSignedBatch(signedBatch);

      await this.db.walletOperation.update({
        data: {
          failureReason: null,
          signedPayload: this.inputJson(signedBatch),
          status: "SUBMITTED"
        },
        where: { id: operation.id }
      });
      await this.updateDepositWalletAfterRelayer(operation.depositWalletId, relayerResult, null);
      await this.db.relayerTransaction.create({
        data: {
          depositWalletId: operation.depositWalletId,
          failureReason: null,
          raw: this.inputJsonObject(relayerResult.raw),
          relayerTransactionId: relayerResult.relayerTransactionId,
          status: relayerResult.status,
          userId: operator.userId,
          walletOperationId: operation.id
        }
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

      await this.db.walletOperation.update({
        data: {
          failureReason,
          signedPayload: this.inputJson(signedBatch),
          status: "FAILED"
        },
        where: { id: operation.id }
      });
      await this.markDepositWalletFailed(operation.depositWalletId, failureReason);
      await this.db.relayerTransaction.create({
        data: {
          depositWalletId: operation.depositWalletId,
          failureReason,
          raw: this.inputJsonObject({ error: failureReason }),
          relayerTransactionId: null,
          status: "FAILED",
          userId: operator.userId,
          walletOperationId: operation.id
        }
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
    const depositWallet = await this.db.depositWallet.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        address: true,
        chainId: true,
        id: true,
        ownerAddress: true,
        status: true,
        updatedAt: true
      },
      where: { userId: operator.userId }
    });

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
      this.db.walletOperation.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          failureReason: true,
          id: true,
          status: true,
          type: true,
          updatedAt: true
        },
        where: {
          depositWalletId: depositWallet.id,
          userId: operator.userId
        }
      }),
      this.db.relayerTransaction.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          failureReason: true,
          id: true,
          relayerTransactionId: true,
          status: true,
          updatedAt: true
        },
        where: {
          depositWalletId: depositWallet.id,
          userId: operator.userId
        }
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
    const wallet = await this.db.wallet.findFirst({
      select: { address: true, chainId: true },
      where: {
        address: ownerAddress,
        chainId,
        type: "EOA",
        userId: operator.userId
      }
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
    const existingDepositWallet = await this.findDepositWalletById(depositWalletId);
    if (this.isReadyDepositWallet(existingDepositWallet) && relayerResult.status !== "CONFIRMED") {
      return;
    }

    await this.db.depositWallet.update({
      data: {
        address: relayerResult.depositWalletAddress ?? undefined,
        failureReason,
        raw: this.inputJsonObject(relayerResult.raw),
        status: relayerResult.status === "CONFIRMED" ? "READY" : relayerResult.status
      },
      where: { id: depositWalletId }
    });
  }

  private async markDepositWalletFailed(depositWalletId: string, failureReason: string) {
    const existingDepositWallet = await this.findDepositWalletById(depositWalletId);
    if (this.isReadyDepositWallet(existingDepositWallet)) {
      return;
    }

    await this.db.depositWallet.update({
      data: {
        failureReason,
        status: "FAILED"
      },
      where: { id: depositWalletId }
    });
  }

  private findDepositWalletByOwner(
    ownerAddress: string,
    chainId: number,
    operator: Operator
  ): Promise<DepositWalletRecord | null> {
    return this.db.depositWallet.findFirst({
      select: {
        address: true,
        chainId: true,
        id: true,
        ownerAddress: true,
        status: true,
        updatedAt: true
      },
      where: {
        chainId,
        ownerAddress,
        userId: operator.userId
      }
    });
  }

  private findDepositWalletById(depositWalletId: string): Promise<DepositWalletRecord | null> {
    return this.db.depositWallet.findFirst({
      select: {
        address: true,
        chainId: true,
        id: true,
        ownerAddress: true,
        status: true,
        updatedAt: true
      },
      where: { id: depositWalletId }
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

  private inputJson(value: object): Prisma.InputJsonObject {
    return value as unknown as Prisma.InputJsonObject;
  }

  private inputJsonObject(value: unknown): Prisma.InputJsonObject {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Prisma.InputJsonObject;
    }

    return { value } as Prisma.InputJsonObject;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private get db(): DepositWalletPrisma {
    return this.prisma as unknown as DepositWalletPrisma;
  }
}

export type { DepositWalletRelayer };
