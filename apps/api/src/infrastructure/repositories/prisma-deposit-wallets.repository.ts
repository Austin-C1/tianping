import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateRelayerTransactionInput,
  CreateWalletOperationInput,
  DepositWalletRecord,
  DepositWalletsRepository,
  FindDepositWalletByOwnerInput,
  FindWalletOperationForUserInput,
  LatestDepositWalletChildInput,
  MarkDepositWalletFailedInput,
  RelayerTransactionRecord,
  UpdateDepositWalletAfterRelayerInput,
  UpsertDepositWalletIntentInput,
  WalletOperationFailureInput,
  WalletOperationLookupRecord,
  WalletOperationRecord,
  WalletOperationSignedPayloadInput
} from "./repository.types";

@Injectable()
export class PrismaDepositWalletsRepository implements DepositWalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLatestDepositWallet(userId: string): Promise<DepositWalletRecord | null> {
    return this.prisma.depositWallet.findFirst({
      orderBy: { updatedAt: "desc" },
      select: this.depositWalletSelect(),
      where: { userId }
    });
  }

  findDepositWalletByOwner(input: FindDepositWalletByOwnerInput): Promise<DepositWalletRecord | null> {
    return this.prisma.depositWallet.findFirst({
      select: this.depositWalletSelect(),
      where: {
        chainId: input.chainId,
        ownerAddress: input.ownerAddress,
        userId: input.userId
      }
    });
  }

  findDepositWalletById(depositWalletId: string): Promise<DepositWalletRecord | null> {
    return this.prisma.depositWallet.findFirst({
      select: this.depositWalletSelect(),
      where: { id: depositWalletId }
    });
  }

  upsertDepositWalletIntent(input: UpsertDepositWalletIntentInput): Promise<DepositWalletRecord> {
    return this.prisma.depositWallet.upsert({
      create: {
        address: input.address,
        chainId: input.chainId,
        ownerAddress: input.ownerAddress,
        raw: this.inputJson(input.raw),
        status: "INTENT_CREATED",
        userId: input.userId
      },
      update: {
        address: input.address,
        failureReason: null,
        raw: this.inputJson(input.raw),
        status: "INTENT_CREATED"
      },
      where: {
        userId_ownerAddress_chainId: {
          chainId: input.chainId,
          ownerAddress: input.ownerAddress,
          userId: input.userId
        }
      }
    });
  }

  createWalletOperation(input: CreateWalletOperationInput): Promise<{ id: string; status: string }> {
    return this.prisma.walletOperation.create({
      data: {
        depositWalletId: input.depositWalletId,
        intentPayload: this.inputJson(input.intentPayload),
        status: input.status,
        type: input.type,
        userId: input.userId
      },
      select: {
        id: true,
        status: true
      }
    });
  }

  findWalletOperationForUser(input: FindWalletOperationForUserInput): Promise<WalletOperationLookupRecord | null> {
    return this.prisma.walletOperation.findFirst({
      select: {
        depositWalletId: true,
        id: true,
        status: true
      },
      where: {
        id: input.operationId,
        type: input.type,
        userId: input.userId
      }
    });
  }

  markWalletOperationSubmitted(input: WalletOperationSignedPayloadInput): Promise<unknown> {
    return this.prisma.walletOperation.update({
      data: {
        failureReason: null,
        signedPayload: this.inputJson(input.signedPayload),
        status: "SUBMITTED"
      },
      where: { id: input.operationId }
    });
  }

  markWalletOperationFailed(input: WalletOperationFailureInput): Promise<unknown> {
    return this.prisma.walletOperation.update({
      data: {
        failureReason: input.failureReason,
        signedPayload: this.inputJson(input.signedPayload),
        status: "FAILED"
      },
      where: { id: input.operationId }
    });
  }

  updateDepositWalletAfterRelayer(input: UpdateDepositWalletAfterRelayerInput): Promise<unknown> {
    return this.prisma.depositWallet.update({
      data: {
        address: input.depositWalletAddress ?? undefined,
        failureReason: input.failureReason,
        raw: this.inputJsonObject(input.raw),
        status: input.status
      },
      where: { id: input.depositWalletId }
    });
  }

  markDepositWalletFailed(input: MarkDepositWalletFailedInput): Promise<unknown> {
    return this.prisma.depositWallet.update({
      data: {
        failureReason: input.failureReason,
        status: "FAILED"
      },
      where: { id: input.depositWalletId }
    });
  }

  createRelayerTransaction(input: CreateRelayerTransactionInput): Promise<RelayerTransactionRecord> {
    return this.prisma.relayerTransaction.create({
      data: {
        depositWalletId: input.depositWalletId,
        failureReason: input.failureReason,
        raw: this.inputJsonObject(input.raw),
        relayerTransactionId: input.relayerTransactionId,
        status: input.status,
        userId: input.userId,
        walletOperationId: input.walletOperationId
      },
      select: {
        failureReason: true,
        id: true,
        relayerTransactionId: true,
        status: true,
        updatedAt: true
      }
    });
  }

  findLatestWalletOperation(input: LatestDepositWalletChildInput): Promise<WalletOperationRecord | null> {
    return this.prisma.walletOperation.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        failureReason: true,
        id: true,
        status: true,
        type: true,
        updatedAt: true
      },
      where: {
        depositWalletId: input.depositWalletId,
        userId: input.userId
      }
    });
  }

  findLatestRelayerTransaction(input: LatestDepositWalletChildInput): Promise<RelayerTransactionRecord | null> {
    return this.prisma.relayerTransaction.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        failureReason: true,
        id: true,
        relayerTransactionId: true,
        status: true,
        updatedAt: true
      },
      where: {
        depositWalletId: input.depositWalletId,
        userId: input.userId
      }
    });
  }

  private depositWalletSelect() {
    return {
      address: true,
      chainId: true,
      id: true,
      ownerAddress: true,
      status: true,
      updatedAt: true
    } as const;
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
}
