import { SyncJobsController } from "./sync-jobs.controller";

describe("SyncJobsController", () => {
  const createService = () => ({
    enqueueMarketSync: jest.fn().mockResolvedValue({ id: "sync_run_1" }),
    getJob: jest.fn().mockResolvedValue({ id: "sync_run_1" }),
    listJobs: jest.fn().mockResolvedValue([])
  });

  const request = {
    user: {
      email: "admin@pmx.local",
      role: "ADMIN" as const,
      userId: "admin_1"
    }
  };

  it("routes admin sync endpoints to the sync job service", async () => {
    const service = createService();
    const controller = new SyncJobsController(service as never);

    await expect(controller.enqueueMarketSync(request as never)).resolves.toEqual({ id: "sync_run_1" });
    await expect(controller.listJobs(request as never)).resolves.toEqual([]);
    await expect(controller.getJob("sync_run_1", request as never)).resolves.toEqual({ id: "sync_run_1" });

    expect(service.enqueueMarketSync).toHaveBeenCalledWith(request.user);
    expect(service.listJobs).toHaveBeenCalledWith(request.user);
    expect(service.getJob).toHaveBeenCalledWith(request.user, "sync_run_1");
  });
});
