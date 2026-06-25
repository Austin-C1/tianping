import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { getAddress, verifyMessage } from "viem";
import { PrismaService } from "../prisma/prisma.service";

interface Operator {
  userId: string;
}

export interface CreateWalletChallengeResult {
  expiresAt: Date;
  message: string;
  nonce: string;
}

export interface VerifyWalletInput {
  address: string;
  chainId: number;
  nonce: string;
  signature: string;
}

export interface VerifyWalletResult {
  address: string;
  chainId: number;
  status: "CONNECTED";
}

const CHALLENGE_TTL_MS = 10 * 60 * 1_000;

@Injectable()
export class WalletProofService {
  constructor(private readonly prisma: PrismaService) {}

  async createChallenge(operator: Operator): Promise<CreateWalletChallengeResult> {
    const nonce = randomUUID();
    const message = this.challengeMessage(nonce);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    return this.prisma.walletChallenge.create({
      data: {
        expiresAt,
        message,
        nonce,
        userId: operator.userId
      },
      select: {
        expiresAt: true,
        message: true,
        nonce: true
      }
    });
  }

  async verifyWallet(input: VerifyWalletInput, operator: Operator): Promise<VerifyWalletResult> {
    const address = this.normalizeAddress(input.address);
    const challenge = await this.prisma.walletChallenge.findUnique({
      where: { nonce: input.nonce }
    });

    if (!challenge || challenge.userId !== operator.userId) {
      throw new BadRequestException("Wallet challenge is not valid");
    }

    if (challenge.consumedAt) {
      throw new BadRequestException("Wallet challenge has already been used");
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Wallet challenge has expired");
    }

    const verified = await verifyMessage({
      address,
      message: challenge.message,
      signature: input.signature as `0x${string}`
    });

    if (!verified) {
      throw new BadRequestException("Wallet signature is not valid");
    }

    await this.prisma.wallet.upsert({
      create: {
        address,
        chainId: input.chainId,
        type: "EOA",
        userId: operator.userId
      },
      update: {},
      where: {
        userId_type_address_chainId: {
          address,
          chainId: input.chainId,
          type: "EOA",
          userId: operator.userId
        }
      }
    });

    await this.prisma.walletChallenge.update({
      data: {
        address,
        chainId: input.chainId,
        consumedAt: new Date()
      },
      where: { id: challenge.id }
    });

    return {
      address,
      chainId: input.chainId,
      status: "CONNECTED"
    };
  }

  private challengeMessage(nonce: string): string {
    return `PMX wallet binding\nNonce: ${nonce}`;
  }

  private normalizeAddress(value: string): `0x${string}` {
    try {
      return getAddress(value);
    } catch {
      throw new BadRequestException("Wallet address is not valid");
    }
  }
}
