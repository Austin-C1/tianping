import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import {
  CreateDepositWalletIntentResultDto,
  DepositWalletStatusDto,
  SubmitDepositWalletSignedBatchResultDto,
  WalletFundingStateDto,
  WalletReadinessDto
} from "../openapi/api-contract.dto";
import { DepositWalletService } from "./deposit-wallet.service";
import {
  CreateDepositWalletIntentDto,
  SubmitDepositWalletSignedBatchDto
} from "./dto/deposit-wallet.dto";
import { WalletFundingService } from "./wallet-funding.service";
import { WalletReadinessService } from "./wallet-readiness.service";

@Controller("wallets")
@UseGuards(AuthGuard)
@ApiTags("wallets")
@ApiBearerAuth("bearer")
export class WalletsController {
  constructor(
    private readonly walletReadinessService: WalletReadinessService,
    private readonly depositWalletService: DepositWalletService,
    private readonly walletFundingService: WalletFundingService
  ) {}

  @Get("me")
  @ApiOkResponse({ type: WalletReadinessDto })
  getMe(@Req() request: AuthenticatedRequest) {
    return this.walletReadinessService.getReadiness(request.user);
  }

  @Get("deposit")
  @ApiOkResponse({ type: DepositWalletStatusDto })
  getDeposit(@Req() request: AuthenticatedRequest) {
    return this.getDepositWalletStatus(request);
  }

  @Post("deposit/create-intent")
  @ApiCreatedResponse({ type: CreateDepositWalletIntentResultDto })
  createDepositWalletIntent(
    @Body() dto: CreateDepositWalletIntentDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.depositWalletService.createIntent(dto, request.user);
  }

  @Post("deposit/submit-signed-batch")
  @ApiCreatedResponse({ type: SubmitDepositWalletSignedBatchResultDto })
  submitDepositWalletSignedBatch(
    @Body() dto: SubmitDepositWalletSignedBatchDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.depositWalletService.submitSignedBatch(dto, request.user);
  }

  @Get("deposit/status")
  @ApiOkResponse({ type: DepositWalletStatusDto })
  getDepositWalletStatus(@Req() request: AuthenticatedRequest) {
    return this.depositWalletService.getStatus(request.user);
  }

  @Get("balance-allowance")
  @ApiOkResponse({ type: WalletFundingStateDto })
  async getBalanceAllowance(@Req() request: AuthenticatedRequest) {
    const readiness = await this.walletReadinessService.getReadiness(request.user);

    return readiness.funding;
  }

  @Post("balance-allowance/refresh")
  @ApiCreatedResponse({ type: WalletFundingStateDto })
  refreshBalanceAllowance(@Req() request: AuthenticatedRequest) {
    return this.walletFundingService.refreshFunding(request.user);
  }
}
