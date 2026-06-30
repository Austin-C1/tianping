import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, saveAccessToken } from "../auth/auth-client";
import { emptyPortfolio, fetchPortfolio } from "./portfolio-client";

describe("portfolio-client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("loads authenticated paper portfolio data from the API", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          positions: [
            {
              averagePrice: "0.5",
              id: "position_1",
              market: { marketId: "market_1", question: "Question?" },
              outcome: "Yes",
              size: "20",
              updatedAt: "2026-06-30T00:00:00.000Z"
            }
          ],
          summary: { positionCount: 1, tradeCount: 1 },
          trades: [
            {
              clobTradeId: "paper_order_1:fill",
              executedAt: "2026-06-30T00:01:00.000Z",
              id: "trade_1",
              market: { marketId: "market_1", question: "Question?" },
              orderId: "order_1",
              price: "0.5",
              side: "BUY",
              size: "20"
            }
          ]
        })
      }))
    );

    await expect(fetchPortfolio()).resolves.toMatchObject({
      positions: [{ id: "position_1", outcome: "Yes", size: "20" }],
      summary: { positionCount: 1, tradeCount: 1 },
      trades: [{ id: "trade_1", orderId: "order_1" }]
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/portfolio", {
      headers: { Authorization: "Bearer token" }
    });
  });

  it("returns an empty portfolio without calling the API when anonymous", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPortfolio()).resolves.toEqual(emptyPortfolio);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
