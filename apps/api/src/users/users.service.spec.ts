import { ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  const createPrisma = () => ({
    user: {
      findMany: jest.fn()
    }
  });

  it("lists users for admin operators", async () => {
    const prisma = createPrisma();
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user_123",
        email: "person@example.com",
        role: "USER",
        createdAt: new Date("2026-06-23T00:00:00.000Z")
      }
    ]);
    const service = new UsersService(prisma as never);

    await expect(service.listUsers({ role: "ADMIN" })).resolves.toEqual([
      {
        id: "user_123",
        email: "person@example.com",
        role: "USER",
        createdAt: new Date("2026-06-23T00:00:00.000Z")
      }
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      },
      take: 100
    });
  });

  it("rejects non-admin operators", async () => {
    const prisma = createPrisma();
    const service = new UsersService(prisma as never);

    await expect(service.listUsers({ role: "USER" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
