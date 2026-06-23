import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActivity, readActivity } from "./activity-store";

describe("activity-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("activity_1");
  });

  it("stores newest activity first", () => {
    const created = appendActivity({
      type: "market.viewed",
      label: "Spread: Colombia (-5.5)"
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: "activity_1",
        type: "market.viewed",
        label: "Spread: Colombia (-5.5)"
      })
    );
    expect(readActivity()).toHaveLength(1);
    expect(readActivity()[0]?.label).toBe("Spread: Colombia (-5.5)");
  });

  it("returns an empty list when stored activity is invalid", () => {
    window.localStorage.setItem("pmx.activity", "{broken");

    expect(readActivity()).toEqual([]);
  });
});
