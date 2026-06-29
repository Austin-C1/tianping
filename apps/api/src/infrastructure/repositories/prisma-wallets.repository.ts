import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ConnectEoaWalletInput,
  ConsumeWalletChallengeInput,
  CreateWalletChallengeInput,
  CreateWalletChallengeResult,
  FindConnectedEoaWalletInput,
  FindLatestWalletInput,
  WalletChallengeRecord,
  WalletRecord,
  WalletsRepository
} from "./repository.types";

@Injectable()
export class PrismaWalletsRepository implements WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createChallenge(input: CreateWalletChallengeInput): Promise<CreateWalletChallengeResult> {
    return this.prisma.walletChallenge.create({
      data: input,
      select: {
        expiresAt: true,
        message: true,
        nonce: true
      }
    });
  }

  findChallengeByNonce(nonce: string): Promise<WalletChallengeRecord | null> {
    return this.prisma.walletChallenge.findUnique({
      where: { nonce }
    });
  }

  connectEoaWallet(input: ConnectEoaWalletInput): Promise<unknown> {
    return this.prisma.wallet.upsert({
      create: {
        address: input.address,
        chainId: input.chainId,
        type: "EOA",
        userId: input.userId
      },
      update: {},
      where: {
        userId_type_address_chainId: {
          address: input.address,
          chainId: input.chainId,
          type: "EOA",
          userId: input.userId
        }
      }
    });
  }

  consumeChallenge(input: ConsumeWalletChallengeInput): Promise<unknown> {
    return this.prisma.walletChallenge.update({
      data: {
        address: input.address,
        chainId: input.chainId,
        consumedAt: input.consumedAt
      },
      where: { id: input.challengeId }
    });
  }

  findLatestWallet(input: FindLatestWalletInput): Promise<WalletRecord | null> {
    return this.prisma.wallet.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { address: true, chainId: true },
      where: { type: input.type, userId: input.userId }
    });
  }

  findConnectedEoaWallet(input: FindConnectedEoaWalletInput): Promise<WalletRecord | null> {
    return this.prisma.wallet.findFirst({
      select: { address: true, chainId: true },
      where: {
        address: input.address,
        chainId: input.chainId,
        type: "EOA",
        userId: input.userId
      }
    });
  }
}
