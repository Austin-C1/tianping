import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import type { AuthResult, AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        role: "USER",
        passwordHash
      },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    await this.writeAuditLog(user.id, "auth.register", email);

    return this.createAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await this.passwordService.verify(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.writeAuditLog(user.id, "auth.login", email);

    return this.createAuthResult(user);
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    return user;
  }

  private createAuthResult(user: AuthUser): AuthResult {
    return {
      accessToken: this.tokenService.signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async writeAuditLog(
    userId: string,
    action: "auth.register" | "auth.login",
    email: string
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata: {
          email
        }
      }
    });
  }
}
