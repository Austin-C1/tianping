import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, saveAccessToken } from "../auth/auth-client";
import {
  createSigningIntent,
  listOrders,
  previewOrder,
  saveSignedOrder,
  submitOrder
} from "./order-preview-client";

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

  it("creates a signing intent for an authenticated previewed order", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: "order_1",
          signingPayload: { amount: 10, tokenID: "token_yes" },
          status: "SIGNING_REQUESTED"
        })
      }))
    );

    await expect(createSigningIntent({ orderId: "order_1" })).resolves.toEqual({
      id: "order_1",
      signingPayload: { amount: 10, tokenID: "token_yes" },
      status: "SIGNING_REQUESTED"
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/orders/signing-intent", {
      body: JSON.stringify({ orderId: "order_1" }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("stores and submits an authenticated signed order", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "order_1",
            signedPayload: { signature: "0xsig" },
            status: "SIGNED"
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            clobOrderId: "paper_order_1",
            id: "order_1",
            status: "SUBMITTED"
          })
        })
    );

    await expect(
      saveSignedOrder({
        orderId: "order_1",
        signedPayload: { signature: "0xsig" }
      })
    ).resolves.toEqual({
      id: "order_1",
      signedPayload: { signature: "0xsig" },
      status: "SIGNED"
    });
    await expect(submitOrder({ orderId: "order_1" })).resolves.toMatchObject({
      clobOrderId: "paper_order_1",
      id: "order_1",
      status: "SUBMITTED"
    });
    expect(fetch).toHaveBeenNthCalledWith(1, "http://api.test/orders/signed", {
      body: JSON.stringify({
        orderId: "order_1",
        signedPayload: { signature: "0xsig" }
      }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://api.test/orders/submit", {
      body: JSON.stringify({ orderId: "order_1" }),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  });

  it("loads authenticated order history and skips anonymous requests", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          {
            id: "order_1",
            market: { marketId: "market_1", question: "Question?" },
            status: "SUBMITTED"
          }
        ]
      }))
    );

    await expect(listOrders()).resolves.toEqual([
      {
        id: "order_1",
        market: { marketId: "market_1", question: "Question?" },
        status: "SUBMITTED"
      }
    ]);
    expect(fetch).toHaveBeenCalledWith("http://api.test/orders", {
      headers: { Authorization: "Bearer token" }
    });

    clearAccessToken();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(listOrders()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
