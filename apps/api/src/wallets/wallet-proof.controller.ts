import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { VerifyWalletResultDto, WalletChallengeDto } from "../openapi/api-contract.dto";
import { VerifyWalletDto } from "./dto/verify-wallet.dto";
import { WalletProofService } from "./wallet-proof.service";

@Controller("wallets")
@UseGuards(AuthGuard)
@ApiTags("wallets")
@ApiBearerAuth("bearer")
export class WalletProofController {
  constructor(private readonly walletProofService: WalletProofService) {}

  @Post("nonce")
  @ApiCreatedResponse({ type: WalletChallengeDto })
  createChallenge(@Req() request: AuthenticatedRequest) {
    return this.walletProofService.createChallenge(request.user);
  }

  @Post("verify")
  @ApiCreatedResponse({ type: VerifyWalletResultDto })
  verify(@Body() dto: VerifyWalletDto, @Req() request: AuthenticatedRequest) {
    return this.walletProofService.verifyWallet(dto, request.user);
  }
}
