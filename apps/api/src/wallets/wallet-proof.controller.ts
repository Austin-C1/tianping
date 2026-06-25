import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { VerifyWalletDto } from "./dto/verify-wallet.dto";
import { WalletProofService } from "./wallet-proof.service";

@Controller("wallets")
@UseGuards(AuthGuard)
export class WalletProofController {
  constructor(private readonly walletProofService: WalletProofService) {}

  @Post("nonce")
  createChallenge(@Req() request: AuthenticatedRequest) {
    return this.walletProofService.createChallenge(request.user);
  }

  @Post("verify")
  verify(@Body() dto: VerifyWalletDto, @Req() request: AuthenticatedRequest) {
    return this.walletProofService.verifyWallet(dto, request.user);
  }
}
