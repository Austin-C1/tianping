import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DepositWalletService } from "./deposit-wallet.service";
import {
  ConfiguredDepositWalletRelayer,
  DEPOSIT_WALLET_RELAYER
} from "./deposit-wallet-relayer";
import { WalletProofController } from "./wallet-proof.controller";
import { WalletProofService } from "./wallet-proof.service";
import {
  ConfiguredWalletFundingProvider,
  WALLET_FUNDING_PROVIDER,
  WalletFundingService
} from "./wallet-funding.service";
import { WalletReadinessService } from "./wallet-readiness.service";
import { WalletsController } from "./wallets.controller";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WalletProofController, WalletsController],
  providers: [
    ConfiguredDepositWalletRelayer,
    ConfiguredWalletFundingProvider,
    DepositWalletService,
    WalletFundingService,
    WalletProofService,
    WalletReadinessService,
    {
      provide: DEPOSIT_WALLET_RELAYER,
      useExisting: ConfiguredDepositWalletRelayer
    },
    {
      provide: WALLET_FUNDING_PROVIDER,
      useExisting: ConfiguredWalletFundingProvider
    }
  ],
  exports: [WalletFundingService, WalletReadinessService]
})
export class WalletsModule {}
