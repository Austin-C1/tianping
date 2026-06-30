import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  DepositWalletFundingRecord,
  FundingRepository,
  UpdateFundingSnapshotInput
} from "./repository.types";

@Injectable()
export class PrismaFundingRepository implements FundingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLatestDepositWalletFunding(userId: string): Promise<DepositWalletFundingRecord | null> {
    return this.prisma.depositWallet.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        address: true,
        balanceAllowanceUpdatedAt: true,
        chainId: true,
        exchangeAllowance: true,
        id: true,
        pUsdBalance: true,
        status: true
      },
      where: { userId }
    });
  }

  updateFundingSnapshot(input: UpdateFundingSnapshotInput): Promise<unknown> {
    return this.prisma.depositWallet.update({
      data: {
        balanceAllowanceRaw: this.inputJsonObject(input.balanceAllowanceRaw),
        balanceAllowanceUpdatedAt: input.balanceAllowanceUpdatedAt,
        exchangeAllowance: input.exchangeAllowance,
        pUsdBalance: input.pUsdBalance
      },
      where: { id: input.depositWalletId }
    });
  }

  private inputJsonObject(value: unknown): Prisma.InputJsonObject {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Prisma.InputJsonObject;
    }

    return { value } as Prisma.InputJsonObject;
  }
}
