import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { TokenService } from "./token.service";
import type { AccessTokenPayload } from "./auth.types";

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token is required");
    }

    request.user = this.tokenService.requireAccessToken(authorization.slice("Bearer ".length));

    return true;
  }
}
