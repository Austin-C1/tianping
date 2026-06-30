import { AdminController } from "./admin.controller";

describe("AdminController", () => {
  const createService = () => ({
    approveLiveTrading: jest.fn().mockResolvedValue({ status: "APPROVED" }),
    getAuditLogs: jest.fn().mockResolvedValue([]),
    getEnvironment: jest.fn().mockReturnValue({ mode: "paper" }),
    getGates: jest.fn().mockResolvedValue([]),
    getLiveApproval: jest.fn().mockResolvedValue({ status: "NOT_APPROVED" }),
    getRiskGateReport: jest.fn().mockResolvedValue({ gates: [] }),
    getSummary: jest.fn().mockResolvedValue({ registeredUsers: 1 }),
    revokeLiveTrading: jest.fn().mockResolvedValue({ status: "NOT_APPROVED" })
  });
  const request = {
    user: {
      email: "admin@pmx.local",
      role: "ADMIN" as const,
      userId: "admin_1"
    }
  };

  it("routes live approval reads and mutations to the admin service", async () => {
    const service = createService();
    const controller = new AdminController(service as never);

    await expect(controller.getLiveApproval(request as never)).resolves.toEqual({
      status: "NOT_APPROVED"
    });
    await expect(
      controller.approveLiveTrading({ reason: "funding and audit reviewed" }, request as never)
    ).resolves.toEqual({ status: "APPROVED" });
    await expect(
      controller.revokeLiveTrading({ reason: "operator revoked" }, request as never)
    ).resolves.toEqual({ status: "NOT_APPROVED" });

    expect(service.getLiveApproval).toHaveBeenCalledWith(request.user);
    expect(service.approveLiveTrading).toHaveBeenCalledWith(request.user, {
      reason: "funding and audit reviewed"
    });
    expect(service.revokeLiveTrading).toHaveBeenCalledWith(request.user, {
      reason: "operator revoked"
    });
  });
});
