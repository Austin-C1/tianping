import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface Operator {
  role: "USER" | "ADMIN";
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(operator: Operator) {
    if (operator.role !== "ADMIN") {
      throw new ForbiddenException("Admin role is required");
    }

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        wallets: {
          orderBy: { createdAt: "desc" },
          select: {
            address: true,
            chainId: true,
            type: true
          },
          take: 1
        },
        _count: {
          select: {
            wallets: true
          }
        }
      },
      take: 100
    });

    return users.map((user) => {
      const primaryWallet = user.wallets[0];

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        walletCount: user._count.wallets,
        walletStatus: user._count.wallets > 0 ? "CONNECTED" : "NOT_CONNECTED",
        primaryWalletAddress: primaryWallet?.address ?? null
      };
    });
  }
}
