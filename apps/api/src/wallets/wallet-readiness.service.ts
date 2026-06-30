import { Inject, Injectable } from "@nestjs/common";
import {
  DEPOSIT_WALLETS_REPOSITORY,
  WALLETS_REPOSITORY
} from "../infrastructure/repositories/repository.tokens";
import type {
  DepositWalletsRepository,
  WalletsRepository
} from "../infrastructure/repositories/repository.types";
import {
  WalletFundingService,
  type WalletFundingOptions,
  type WalletFundingState
} from "./wallet-funding.service";

interface Operator {
  userId: string;
}

type GateStatus = "PENDING" | "READY";
type DepositWalletStatus = "CREATED" | "FAILED" | "NOT_CREATED" | "PENDING" | "READY";

interface WalletRecord {
  address: string;
  chainId: number;
}

interface DepositWalletRecord {
  address: string | null;
  chainId: number;
  status: string;
}

export interface WalletReadinessGate {
  key: "wallet-binding" | "deposit-wallet" | "funding-allowance" | "region-risk";
  reason: string;
  status: GateStatus;
}

export interface WalletReadiness {
  canPreview: true;
  canSign: boolean;
  depositWallet: {
    address: string | null;
    chainId: number | null;
    status: DepositWalletStatus;
  };
  eoa: {
    address: string | null;
    chainId: number | null;
    status: "CONNECTED" | "NOT_CONNECTED";
  };
  funding: {
    allowance: string | null;
    balanceCacheStale: boolean;
    balanceCacheUpdatedAt: Date | null;
    minimumOrderSize: string | null;
    minimumOrderSizeMet: boolean | null;
    pUsdBalance: string | null;
    reason: string;
    requiredAllowance: string | null;
    status: WalletFundingState["status"];
  };
  gates: WalletReadinessGate[];
  region: {
    status: "NOT_CHECKED";
  };
}

@Injectable()
export class WalletReadinessService {
  constructor(
    @Inject(WALLETS_REPOSITORY)
    private readonly walletsRepository: WalletsRepository,
    @Inject(DEPOSIT_WALLETS_REPOSITORY)
    private readonly depositWalletsRepository: DepositWalletsRepository,
    private readonly walletFundingService: WalletFundingService
  ) {}

  async getReadiness(
    operator: Operator,
    fundingOptions?: WalletFundingOptions
  ): Promise<WalletReadiness> {
    const [eoaWallet, productionDepositWallet, funding] = await Promise.all([
      this.findWallet(operator.userId, "EOA"),
      this.depositWalletsRepository.findLatestDepositWallet(operator.userId),
      this.walletFundingService.getFunding(operator, fundingOptions)
    ]);
    const legacyDepositWallet = productionDepositWallet
      ? null
      : await this.findWallet(operator.userId, "DEPOSIT");
    const depositWallet = productionDepositWallet ?? legacyDepositWallet;
    const depositWalletStatus = this.depositWalletStatus(productionDepositWallet, legacyDepositWallet);

    const eoaConnected = Boolean(eoaWallet);
    const depositReady = depositWalletStatus === "READY" || depositWalletStatus === "CREATED";
    const fundingReady = funding.status === "READY";
    const regionChecked = false;

    return {
      canPreview: true,
      canSign: eoaConnected && depositReady && fundingReady && regionChecked,
      depositWallet: {
        address: depositWallet?.address ?? null,
        chainId: depositWallet?.chainId ?? null,
        status: depositWalletStatus
      },
      eoa: {
        address: eoaWallet?.address ?? null,
        chainId: eoaWallet?.chainId ?? null,
        status: eoaWallet ? "CONNECTED" : "NOT_CONNECTED"
      },
      funding,
      gates: [
        {
          key: "wallet-binding",
          reason: eoaConnected ? "EOA wallet is connected" : "EOA wallet is not connected",
          status: eoaConnected ? "READY" : "PENDING"
        },
        {
          key: "deposit-wallet",
          reason: this.depositWalletGateReason(depositWalletStatus),
          status: depositReady ? "READY" : "PENDING"
        },
        {
          key: "funding-allowance",
          reason: funding.reason,
          status: fundingReady ? "READY" : "PENDING"
        },
        {
          key: "region-risk",
          reason: "Region risk check is not complete",
          status: "PENDING"
        }
      ],
      region: {
        status: "NOT_CHECKED"
      }
    };
  }

  private findWallet(userId: string, type: "EOA" | "DEPOSIT"): Promise<WalletRecord | null> {
    return this.walletsRepository.findLatestWallet({
      type,
      userId
    });
  }

  private depositWalletStatus(
    productionDepositWallet: DepositWalletRecord | null,
    legacyDepositWallet: WalletRecord | null
  ): DepositWalletStatus {
    if (productionDepositWallet) {
      if (productionDepositWallet.status === "READY" && productionDepositWallet.address) {
        return "READY";
      }

      if (productionDepositWallet.status === "FAILED") {
        return "FAILED";
      }

      return "PENDING";
    }

    return legacyDepositWallet ? "CREATED" : "NOT_CREATED";
  }

  private depositWalletGateReason(status: DepositWalletStatus): string {
    if (status === "READY") {
      return "Deposit Wallet is ready";
    }

    if (status === "CREATED") {
      return "Deposit Wallet is created";
    }

    if (status === "FAILED") {
      return "Deposit Wallet creation failed";
    }

    if (status === "PENDING") {
      return "Deposit Wallet is pending";
    }

    return "Deposit Wallet is not created";
  }

}
