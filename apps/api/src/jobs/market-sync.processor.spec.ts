import { MarketSyncProcessor } from "./market-sync.processor";

describe("MarketSyncProcessor", () => {
  it("delegates BullMQ market sync jobs to the sync job service", async () => {
    const syncJobsService = {
      processMarketSyncJob: jest.fn().mockResolvedValue({ id: "sync_run_1", status: "SUCCEEDED" })
    };
    const processor = new MarketSyncProcessor(syncJobsService as never);

    await expect(
      processor.process({
        data: { syncJobRunId: "sync_run_1" }
      } as never)
    ).resolves.toEqual({ id: "sync_run_1", status: "SUCCEEDED" });

    expect(syncJobsService.processMarketSyncJob).toHaveBeenCalledWith("sync_run_1");
  });
});
