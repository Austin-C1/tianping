import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

describe("AuthService", () => {
  const passwordService = new PasswordService();
  const tokenService = {
    signAccessToken: jest.fn(() => "access-token")
  } as unknown as TokenService;

  const createPrisma = () => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  });
  const createAuditLogService = () => ({
    record: jest.fn().mockResolvedValue(undefined)
  });

  it("registers a new user with normalized email and hashed password", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "USER"
    });
    const service = new AuthService(
      prisma as never,
      passwordService,
      tokenService,
      auditLogService as never
    );

    const result = await service.register({
      email: " Person@Example.COM ",
      password: "long-enough-password"
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "person@example.com",
        passwordHash: expect.not.stringContaining("long-enough-password"),
        role: "USER"
      },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    expect(result).toEqual({
      accessToken: "access-token",
      user: {
        id: "user_123",
        email: "person@example.com",
        role: "USER"
      }
    });
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "auth.register",
      metadata: {
        email: "person@example.com"
      },
      userId: "user_123"
    });
  });

  it("rejects duplicate registrations without writing audit logs", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "person@example.com"
    });
    const service = new AuthService(
      prisma as never,
      passwordService,
      tokenService,
      auditLogService as never
    );

    await expect(
      service.register({
        email: "person@example.com",
        password: "long-enough-password"
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it("logs in an existing user with a valid password", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    const passwordHash = await passwordService.hash("long-enough-password");
    prisma.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "ADMIN",
      passwordHash
    });
    const service = new AuthService(
      prisma as never,
      passwordService,
      tokenService,
      auditLogService as never
    );

    const result = await service.login({
      email: "person@example.com",
      password: "long-enough-password"
    });

    expect(result.accessToken).toBe("access-token");
    expect(result.user.email).toBe("person@example.com");
    expect(result.user.role).toBe("ADMIN");
    expect(auditLogService.record).toHaveBeenCalledWith({
      action: "auth.login",
      metadata: {
        email: "person@example.com"
      },
      userId: "user_123"
    });
  });

  it("rejects login with an invalid password without writing audit logs", async () => {
    const prisma = createPrisma();
    const auditLogService = createAuditLogService();
    const passwordHash = await passwordService.hash("long-enough-password");
    prisma.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      passwordHash
    });
    const service = new AuthService(
      prisma as never,
      passwordService,
      tokenService,
      auditLogService as never
    );

    await expect(
      service.login({
        email: "person@example.com",
        password: "wrong-password"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it("returns the current user with role", async () => {
    const prisma = createPrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "ADMIN"
    });
    const service = new AuthService(prisma as never, passwordService, tokenService);

    await expect(service.getCurrentUser("user_123")).resolves.toEqual({
      id: "user_123",
      email: "person@example.com",
      role: "ADMIN"
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_123" },
      select: { id: true, email: true, role: true }
    });
  });
});
