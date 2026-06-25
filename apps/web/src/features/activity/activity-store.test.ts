import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActivity, appendOrderPreviewActivity, readActivity } from "./activity-store";

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

  it("stores formatted order preview activity", () => {
    const created = appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: "activity_1",
        type: "order.previewed",
        label: "Spread: Colombia (-5.5)",
        description: "Buy DR Congo 75c / $10.00",
        orderPreview: {
          amountUsd: 10,
          outcome: "DR Congo",
          price: 0.75
        }
      })
    );
    expect(readActivity()[0]?.description).toBe("Buy DR Congo 75c / $10.00");
  });

  it("does not duplicate the same latest order preview", () => {
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });

    expect(readActivity()).toHaveLength(1);
  });
});
