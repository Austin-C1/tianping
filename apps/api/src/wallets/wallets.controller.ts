import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { DepositWalletService } from "./deposit-wallet.service";
import {
  CreateDepositWalletIntentDto,
  SubmitDepositWalletSignedBatchDto
} from "./dto/deposit-wallet.dto";
import { WalletFundingService } from "./wallet-funding.service";
import { WalletReadinessService } from "./wallet-readiness.service";

@Controller("wallets")
@UseGuards(AuthGuard)
export class WalletsController {
  constructor(
    private readonly walletReadinessService: WalletReadinessService,
    private readonly depositWalletService: DepositWalletService,
    private readonly walletFundingService: WalletFundingService
  ) {}

  @Get("me")
  getMe(@Req() request: AuthenticatedRequest) {
    return this.walletReadinessService.getReadiness(request.user);
  }

  @Get("deposit")
  getDeposit(@Req() request: AuthenticatedRequest) {
    return this.getDepositWalletStatus(request);
  }

  @Post("deposit/create-intent")
  createDepositWalletIntent(
    @Body() dto: CreateDepositWalletIntentDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.depositWalletService.createIntent(dto, request.user);
  }

  @Post("deposit/submit-signed-batch")
  submitDepositWalletSignedBatch(
    @Body() dto: SubmitDepositWalletSignedBatchDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.depositWalletService.submitSignedBatch(dto, request.user);
  }

  @Get("deposit/status")
  getDepositWalletStatus(@Req() request: AuthenticatedRequest) {
    return this.depositWalletService.getStatus(request.user);
  }

  @Get("balance-allowance")
  async getBalanceAllowance(@Req() request: AuthenticatedRequest) {
    const readiness = await this.walletReadinessService.getReadiness(request.user);

    return readiness.funding;
  }

  @Post("balance-allowance/refresh")
  refreshBalanceAllowance(@Req() request: AuthenticatedRequest) {
    return this.walletFundingService.refreshFunding(request.user);
  }
}
