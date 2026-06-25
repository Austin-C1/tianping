import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_POLYMARKET_CLOB_HOST } from "../order-router/order-router.config";
import { PrismaService } from "../prisma/prisma.service";
import { createLiveClobAdapter } from "../polymarket/clob-adapter";
import type { ClobApiCredentials } from "../polymarket/clob-types";

interface Operator {
  userId: string;
}

export type WalletFundingStatus =
  | "ALLOWANCE_MISSING"
  | "CACHE_STALE"
  | "NO_DEPOSIT_WALLET"
  | "NO_PUSD"
  | "READY";

export interface WalletFundingOptions {
  minimumOrderSize?: number;
  requiredAmountUsd?: number;
}

export interface WalletFundingState {
  allowance: string | null;
  balanceCacheStale: boolean;
  balanceCacheUpdatedAt: Date | null;
  minimumOrderSize: string | null;
  minimumOrderSizeMet: boolean | null;
  pUsdBalance: string | null;
  reason: string;
  requiredAllowance: string | null;
  status: WalletFundingStatus;
}

export interface WalletFundingProvider {
  getBalanceAllowance(input: {
    chainId: number;
    depositWalletAddress: string;
  }): Promise<{
    allowance: string;
    pUsdBalance: string;
    raw: unknown;
  }>;
}

interface DepositWalletFundingRecord {
  address: string | null;
  balanceAllowanceUpdatedAt: Date | null;
  chainId: number;
  exchangeAllowance: DecimalLike | null;
  id: string;
  pUsdBalance: DecimalLike | null;
  status: string;
}

type DecimalLike = string | number | { toString(): string };

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export const WALLET_FUNDING_PROVIDER = Symbol("WALLET_FUNDING_PROVIDER");

@Injectable()
export class WalletFundingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WALLET_FUNDING_PROVIDER)
    private readonly provider: WalletFundingProvider
  ) {}

  async getFunding(
    operator: Operator,
    options?: WalletFundingOptions
  ): Promise<WalletFundingState> {
    const depositWallet = await this.findLatestDepositWallet(operator.userId);
    const context = this.context(options);

    if (!depositWallet || depositWallet.status !== "READY" || !depositWallet.address) {
      return this.state({
        ...context,
        allowance: null,
        balanceCacheStale: true,
        balanceCacheUpdatedAt: null,
        pUsdBalance: null,
        reason: "Deposit Wallet is not ready",
        status: "NO_DEPOSIT_WALLET"
      });
    }

    const pUsdBalance = decimalString(depositWallet.pUsdBalance);
    const allowance = decimalString(depositWallet.exchangeAllowance);
    const balanceCacheUpdatedAt = depositWallet.balanceAllowanceUpdatedAt;
    const balanceCacheStale = this.isCacheStale(balanceCacheUpdatedAt);

    if (balanceCacheStale) {
      return this.state({
        ...context,
        allowance,
        balanceCacheStale: true,
        balanceCacheUpdatedAt,
        pUsdBalance,
        reason: "CLOB balance allowance cache is stale",
        status: "CACHE_STALE"
      });
    }

    const balanceAmount = numericAmount(pUsdBalance);
    const allowanceAmount = numericAmount(allowance);
    const requiredAmount = context.requiredAmount ?? 0;

    if (balanceAmount <= 0) {
      return this.state({
        ...context,
        allowance,
        balanceCacheStale: false,
        balanceCacheUpdatedAt,
        pUsdBalance,
        reason: "Deposit Wallet has no pUSD",
        status: "NO_PUSD"
      });
    }

    if (requiredAmount > 0 && balanceAmount < requiredAmount) {
      return this.state({
        ...context,
        allowance,
        balanceCacheStale: false,
        balanceCacheUpdatedAt,
        pUsdBalance,
        reason: "Deposit Wallet pUSD balance is insufficient",
        status: "NO_PUSD"
      });
    }

    if (allowanceAmount <= 0 || (requiredAmount > 0 && allowanceAmount < requiredAmount)) {
      return this.state({
        ...context,
        allowance,
        balanceCacheStale: false,
        balanceCacheUpdatedAt,
        pUsdBalance,
        reason: "CLOB exchange allowance is insufficient",
        status: "ALLOWANCE_MISSING"
      });
    }

    return this.state({
      ...context,
      allowance,
      balanceCacheStale: false,
      balanceCacheUpdatedAt,
      pUsdBalance,
      reason: "pUSD balance and allowance are ready",
      status: "READY"
    });
  }

  async refreshFunding(
    operator: Operator,
    options?: WalletFundingOptions
  ): Promise<WalletFundingState> {
    const depositWallet = await this.findLatestDepositWallet(operator.userId);

    if (!depositWallet || depositWallet.status !== "READY" || !depositWallet.address) {
      throw new BadRequestException("Deposit Wallet is not ready");
    }

    const balanceAllowance = await this.provider.getBalanceAllowance({
      chainId: depositWallet.chainId,
      depositWalletAddress: depositWallet.address
    });
    const now = new Date();

    await this.db.depositWallet.update({
      data: {
        balanceAllowanceRaw: balanceAllowance.raw,
        balanceAllowanceUpdatedAt: now,
        exchangeAllowance: balanceAllowance.allowance,
        pUsdBalance: balanceAllowance.pUsdBalance
      },
      where: { id: depositWallet.id }
    });

    return this.getFunding(operator, options);
  }

  private findLatestDepositWallet(userId: string): Promise<DepositWalletFundingRecord | null> {
    return this.db.depositWallet.findFirst({
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

  private context(options?: WalletFundingOptions) {
    const requiredAmount = positiveNumber(options?.requiredAmountUsd);
    const minimumOrderSize = positiveNumber(options?.minimumOrderSize);

    return {
      minimumOrderSize,
      minimumOrderSizeMet:
        requiredAmount === null || minimumOrderSize === null ? null : requiredAmount >= minimumOrderSize,
      minimumOrderSizeText: formatAmount(minimumOrderSize),
      requiredAllowanceText: formatAmount(requiredAmount),
      requiredAmount
    };
  }

  private state(input: {
    allowance: string | null;
    balanceCacheStale: boolean;
    balanceCacheUpdatedAt: Date | null;
    minimumOrderSize: number | null;
    minimumOrderSizeMet: boolean | null;
    minimumOrderSizeText: string | null;
    pUsdBalance: string | null;
    reason: string;
    requiredAllowanceText: string | null;
    requiredAmount: number | null;
    status: WalletFundingStatus;
  }): WalletFundingState {
    return {
      allowance: input.allowance,
      balanceCacheStale: input.balanceCacheStale,
      balanceCacheUpdatedAt: input.balanceCacheUpdatedAt,
      minimumOrderSize: input.minimumOrderSizeText,
      minimumOrderSizeMet: input.minimumOrderSizeMet,
      pUsdBalance: input.pUsdBalance,
      reason: input.reason,
      requiredAllowance: input.requiredAllowanceText,
      status: input.status
    };
  }

  private isCacheStale(updatedAt: Date | null): boolean {
    if (!updatedAt) {
      return true;
    }

    return Date.now() - updatedAt.getTime() > DEFAULT_CACHE_TTL_MS;
  }

  private get db(): PrismaService & {
    depositWallet: {
      findFirst(args: object): Promise<DepositWalletFundingRecord | null>;
      update(args: object): Promise<unknown>;
    };
  } {
    return this.prisma as PrismaService & {
      depositWallet: {
        findFirst(args: object): Promise<DepositWalletFundingRecord | null>;
        update(args: object): Promise<unknown>;
      };
    };
  }
}

@Injectable()
export class ConfiguredWalletFundingProvider implements WalletFundingProvider {
  constructor(private readonly config: ConfigService) {}

  async getBalanceAllowance(input: {
    chainId: number;
    depositWalletAddress: string;
  }): Promise<{ allowance: string; pUsdBalance: string; raw: unknown }> {
    const clob = createLiveClobAdapter({
      chainId: input.chainId,
      creds: this.credentials(),
      funderAddress: input.depositWalletAddress,
      host: this.config.get<string>("POLYMARKET_CLOB_HOST", DEFAULT_POLYMARKET_CLOB_HOST)
    });
    const response = await clob.getBalanceAllowance({ assetType: "COLLATERAL" });

    return {
      allowance: exchangeAllowance(response.allowances),
      pUsdBalance: response.balance,
      raw: response.rawPolymarketResponse
    };
  }

  private credentials(): ClobApiCredentials | undefined {
    const key = this.config.get<string>("POLYMARKET_CLOB_API_KEY")?.trim();
    const secret = this.config.get<string>("POLYMARKET_CLOB_API_SECRET")?.trim();
    const passphrase = this.config.get<string>("POLYMARKET_CLOB_API_PASSPHRASE")?.trim();

    if (!key || !secret || !passphrase) {
      throw new BadRequestException("Polymarket CLOB API credentials are not configured");
    }

    return { key, passphrase, secret };
  }
}

function exchangeAllowance(allowances: Record<string, string>): string {
  return (
    allowances.exchange ??
    allowances.EXCHANGE ??
    allowances.Exchange ??
    allowances["0"] ??
    Object.values(allowances)[0] ??
    "0"
  );
}

function decimalString(value: DecimalLike | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toString();
}

function numericAmount(value: string | null): number {
  const numeric = Number(value ?? "0");

  return Number.isFinite(numeric) ? numeric : 0;
}

function positiveNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function formatAmount(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value) ? value.toString() : value.toString();
}
