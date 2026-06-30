import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSyncJob: vi.fn(),
  listSyncJobs: vi.fn(),
  runAdminApiRequest: vi.fn((operation: () => Promise<unknown>) => operation())
}));

vi.mock("./http", () => ({
  createAdminApiClient: () => ({
    admin: {
      getSyncJob: mocks.getSyncJob,
      listSyncJobs: mocks.listSyncJobs
    }
  }),
  runAdminApiRequest: mocks.runAdminApiRequest
}));

describe("admin sync job API wrappers", () => {
  beforeEach(() => {
    mocks.getSyncJob.mockReset();
    mocks.listSyncJobs.mockReset();
    mocks.runAdminApiRequest.mockClear();
  });

  it("loads recent sync jobs through the generated API client", async () => {
    mocks.listSyncJobs.mockResolvedValue([{ id: "sync_run_1" }]);

    const { fetchSyncJobs } = await import("./admin");

    await expect(fetchSyncJobs()).resolves.toEqual([{ id: "sync_run_1" }]);
    expect(mocks.listSyncJobs).toHaveBeenCalledWith();
    expect(mocks.runAdminApiRequest).toHaveBeenCalledTimes(1);
  });

  it("loads a sync job by id through the generated API client", async () => {
    mocks.getSyncJob.mockResolvedValue({ id: "sync_run_1" });

    const { fetchSyncJob } = await import("./admin");

    await expect(fetchSyncJob("sync_run_1")).resolves.toEqual({ id: "sync_run_1" });
    expect(mocks.getSyncJob).toHaveBeenCalledWith("sync_run_1");
    expect(mocks.runAdminApiRequest).toHaveBeenCalledTimes(1);
  });
});
