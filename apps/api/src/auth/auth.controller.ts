import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.guard";
import { AuthGuard } from "./auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthResultDto, AuthUserDto } from "../openapi/api-contract.dto";

@Controller("auth")
@ApiTags("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiCreatedResponse({ type: AuthResultDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @ApiCreatedResponse({ type: AuthResultDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOkResponse({ type: AuthUserDto })
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.userId);
  }
}
