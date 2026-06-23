import { expect, test } from "@playwright/test";

test("opens a market detail ticket and keeps portfolio/activity navigable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("pmx.locale", "en");
  });
  await page.route("**/markets", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "snapshot_1",
          marketId: "market_1",
          slug: "spread-colombia-dr-congo",
          question: "Spread: Colombia (-5.5)",
          category: "Sports",
          active: true,
          closed: false,
          outcomes: ["Colombia", "DR Congo"],
          outcomePrices: ["0.25", "0.75"],
          volume: "746",
          liquidity: "16729",
          syncedAt: "2026-06-24T00:00:00.000Z"
        }
      ])
    });
  });

  await page.goto("/");
  await page.locator(".market-card").first().getByRole("link", { name: "Colombia 25c" }).click();

  await expect(page).toHaveURL(/\/markets\/market_1\?side=yes/);
  await expect(page.getByRole("heading", { name: "Spread: Colombia (-5.5)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order ticket" })).toBeVisible();

  await page.getByLabel("Amount").fill("10");
  await expect(page.getByText("40 shares")).toBeVisible();
  await expect(page.getByText("$40.00")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();

  await page.getByRole("link", { name: "Portfolio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Portfolio" })).toBeVisible();
  await expect(page.getByText("No positions yet")).toBeVisible();

  await page.getByRole("link", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
});
