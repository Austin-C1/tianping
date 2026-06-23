import { expect, test } from "@playwright/test";

test("shows the stage 1 platform skeleton", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Polymarket 三方基础交易平台" })
  ).toBeVisible();
  await expect(page.getByText("Stage 1 / Engineering Skeleton")).toBeVisible();
  await expect(page.getByText("PostgreSQL + Prisma")).toBeVisible();
});
