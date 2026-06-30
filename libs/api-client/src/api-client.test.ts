import { describe, expect, it, vi } from "vitest";
import { ApiClientError, createApiClient } from "./index";

describe("createApiClient", () => {
  it("sends JSON requests with the configured base URL and bearer token", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "order-1",
          submitDisabled: true
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 201
        }
      )
    );
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetch: fetchMock,
      getAccessToken: () => "access-token"
    });

    const result = await client.orders.preview({
      amountUsd: 10,
      marketId: "market-1",
      outcomeIndex: 0,
      orderType: "FAK"
    });

    expect(result.id).toBe("order-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/orders/preview",
      expect.objectContaining({
        body: JSON.stringify({
          amountUsd: 10,
          marketId: "market-1",
          outcomeIndex: 0,
          orderType: "FAK"
        }),
        method: "POST"
      })
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json"
    });
  });

  it("normalizes failed responses", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Invalid email or password" }), {
        headers: { "Content-Type": "application/json" },
        status: 401
      })
    );
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetch: fetchMock
    });

    await expect(
      client.auth.login({ email: "user@example.com", password: "wrong-password" })
    ).rejects.toMatchObject({
      message: "Invalid email or password",
      status: 401
    });
    await expect(
      client.auth.login({ email: "user@example.com", password: "wrong-password" })
    ).rejects.toBeInstanceOf(ApiClientError);
  });

  it("calls authenticated queue sync admin endpoints", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          completedAt: null,
          createdAt: "2026-06-30T12:00:00.000Z",
          failureReason: null,
          id: "sync_run_1",
          queueJobId: "bull_job_1",
          requestedById: "admin_1",
          startedAt: null,
          status: "QUEUED",
          type: "MARKET_SYNC",
          updatedAt: "2026-06-30T12:00:00.000Z"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 201
        }
      )
    );
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetch: fetchMock,
      getAccessToken: () => "access-token"
    });

    await client.admin.enqueueMarketSync();
    await client.admin.listSyncJobs();
    await client.admin.getSyncJob("sync run/1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://api.test/admin/sync/market",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://api.test/admin/sync/jobs",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://api.test/admin/sync/jobs/sync%20run%2F1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token"
        })
      })
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json"
    });
  });
});
