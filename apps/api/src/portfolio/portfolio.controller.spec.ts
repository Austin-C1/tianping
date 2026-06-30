import { PortfolioController } from "./portfolio.controller";

describe("PortfolioController", () => {
  const service = {
    getPortfolio: jest.fn().mockResolvedValue({ positions: [], summary: {}, trades: [] })
  };

  beforeEach(() => {
    service.getPortfolio.mockClear();
  });

  it("routes portfolio reads to the service with the authenticated user", async () => {
    const controller = new PortfolioController(service as never);
    const request = {
      user: {
        role: "USER",
        userId: "user_1"
      }
    };

    await expect(controller.getPortfolio(request as never)).resolves.toEqual({
      positions: [],
      summary: {},
      trades: []
    });
    expect(service.getPortfolio).toHaveBeenCalledWith(request.user);
  });
});
