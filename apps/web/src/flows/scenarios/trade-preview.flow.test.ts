import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveAccessToken } from "../../features/auth/auth-client";
import { runTradePreviewScenario } from "./trade-preview.flow";

describe("trade-preview flow scenario", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("picks a tradable market and requests an authenticated order preview", async () => {
    saveAccessToken("token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            active: false,
            category: "Sports",
            closed: true,
            id: "snapshot_closed",
            liquidity: "10",
            marketId: "market_closed",
            outcomePrices: ["0.40", "0.60"],
            outcomes: ["Yes", "No"],
            question: "Closed market",
            slug: "closed-market",
            syncedAt: "2026-06-24T00:00:00.000Z",
            volume: "10"
          },
          {
            active: true,
            category: "Sports",
            closed: false,
            id: "snapshot_1",
            liquidity: "16729",
            marketId: "market_1",
            outcomePrices: ["0.25", "0.75"],
            outcomes: ["Colombia", "DR Congo"],
            question: "Spread: Colombia (-5.5)",
            slug: "spread-colombia-dr-congo",
            syncedAt: "2026-06-24T00:00:00.000Z",
            volume: "746"
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "order_1",
          readiness: {
            canPreview: true,
            canSign: false,
            gates: [
              {
                key: "deposit-wallet",
                reason: "Deposit Wallet is not created",
                status: "PENDING"
              }
            ]
          },
          submitDisabled: true
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runTradePreviewScenario({
        amountUsd: 10,
        outcomeIndex: 0,
        orderType: "FAK"
      })
    ).resolves.toMatchObject({
      market: {
        marketId: "market_1",
        question: "Spread: Colombia (-5.5)"
      },
      preview: {
        id: "order_1",
        submitDisabled: true
      }
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://api.test/markets");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://api.test/orders/preview",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json"
        },
        method: "POST"
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      amountUsd: 10,
      marketId: "market_1",
      outcomeIndex: 0,
      orderType: "FAK"
    });
  });
});
