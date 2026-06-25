import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, saveAccessToken } from "../auth/auth-client";
import { previewOrder } from "./order-preview-client";

describe("order-preview-client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("posts authenticated order previews to the API", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: "order_1",
          clob: { tokenID: "token_yes", side: "BUY", orderType: "FAK" },
          submitDisabled: true
        })
      }))
    );

    await expect(
      previewOrder({
        amountUsd: 10,
        marketId: "market_1",
        outcomeIndex: 0,
        orderType: "FAK"
      })
    ).resolves.toEqual({
      id: "order_1",
      clob: { tokenID: "token_yes", side: "BUY", orderType: "FAK" },
      submitDisabled: true
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/orders/preview", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amountUsd: 10,
        marketId: "market_1",
        outcomeIndex: 0,
        orderType: "FAK"
      })
    });
  });

  it("skips API previews when the user is anonymous", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      previewOrder({
        amountUsd: 10,
        marketId: "market_1",
        outcomeIndex: 0
      })
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
