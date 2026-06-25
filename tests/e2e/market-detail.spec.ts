import { expect, test } from "@playwright/test";

test("opens a market detail ticket and keeps portfolio/activity navigable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("pmx.locale", "en");
    window.localStorage.setItem("pmx.accessToken", "token");
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
  await page.route("**/orders/preview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "order_1",
        readiness: {
          canPreview: true,
          canSign: false,
          gates: [
            {
              key: "wallet-binding",
              reason: "EOA wallet is not connected",
              status: "PENDING"
            },
            {
              key: "deposit-wallet",
              reason: "Deposit Wallet is not created",
              status: "PENDING"
            }
          ]
        },
        submitDisabled: true
      })
    });
  });

  await page.goto("/");
  await page.locator(".market-card").first().getByRole("link", { name: "Colombia 25c" }).click();

  await expect(page).toHaveURL(/\/markets\/market_1\?side=yes/);
  await expect(page.getByRole("heading", { name: "Spread: Colombia (-5.5)" })).toBeVisible();
  await expect(page.getByText("Last sync")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order ticket" })).toBeVisible();

  const ticket = page.locator(".order-ticket-card");

  await page.getByLabel("Amount").fill("$10");
  await expect(page.getByText("40 shares")).toBeVisible();
  await expect(page.getByText("$40.00")).toBeVisible();
  await expect(ticket.getByText("Deposit Wallet is not created")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();

  await page.getByRole("button", { name: "$25" }).click();
  await expect(ticket.getByText("100 shares")).toBeVisible();
  await expect(ticket.getByText("$100.00")).toBeVisible();
  await expect(ticket.getByText("$75.00")).toBeVisible();

  await page.getByRole("button", { name: "$10" }).click();

  await page.getByRole("button", { name: "DR Congo 75c" }).click();
  await expect(page).toHaveURL(/\/markets\/market_1\?side=no/);

  await expect(ticket.locator(".ticket-lines")).toContainText("DR Congo");
  await expect(ticket.locator(".ticket-lines")).toContainText("75c");
  await expect(ticket.getByText("13.33 shares")).toBeVisible();
  await expect(ticket.getByText("$13.33")).toBeVisible();
  await expect(ticket.getByText("$3.33")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();

  await page.reload();
  await expect(ticket.locator(".ticket-lines")).toContainText("DR Congo");
  await expect(ticket.locator(".ticket-lines")).toContainText("75c");

  await page.getByRole("link", { name: "Portfolio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Portfolio" })).toBeVisible();
  await expect(page.getByText("No positions yet")).toBeVisible();

  await page.getByRole("link", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
  const orderPreviewActivity = page
    .locator(".activity-list article")
    .filter({ hasText: "Order previewed" })
    .first();
  await expect(orderPreviewActivity).toContainText("Spread: Colombia (-5.5)");
  await expect(orderPreviewActivity).toContainText("Buy DR Congo 75c / $10.00");
});
