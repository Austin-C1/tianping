import { AuditLogService } from "./audit-log.service";

describe("AuditLogService", () => {
  const createPrisma = () => ({
    auditLog: {
      create: jest.fn()
    }
  });

  it("records structured audit metadata without sensitive fields", async () => {
    const prisma = createPrisma();
    prisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
    const service = new AuditLogService(prisma as never);

    await service.record({
      action: "order.signed",
      metadata: {
        orderId: "order_1",
        privateKey: "do-not-store",
        nested: {
          mnemonic: "do-not-store",
          signature: "0xsig"
        },
        secret: "do-not-store"
      },
      userId: "user_1"
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "order.signed",
        ipAddress: undefined,
        metadata: {
          orderId: "order_1",
          nested: {
            signature: "0xsig"
          }
        },
        userAgent: undefined,
        userId: "user_1"
      }
    });
    expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain("do-not-store");
  });
});
