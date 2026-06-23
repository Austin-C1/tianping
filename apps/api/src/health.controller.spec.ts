import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns the service health payload", () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      ok: true,
      service: "pmx-api",
      stage: "engineering-skeleton"
    });
  });
});
