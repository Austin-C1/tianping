import { expect, test } from "@playwright/test";

test("shows the stage 1 platform skeleton", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Polymarket 三方基础交易平台" })
  ).toBeVisible();
  await expect(page.getByText("Stage 1 / Engineering Skeleton")).toBeVisible();
  await expect(page.getByText("PostgreSQL + Prisma")).toBeVisible();
});

test("shows the stage 2 auth pages", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 1, name: "注册账户" })).toBeVisible();
  await expect(page.getByRole("button", { name: "注册" })).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "登录账户" })).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "账户中心" })).toBeVisible();
  await expect(page.getByText("请先登录")).toBeVisible();
});
