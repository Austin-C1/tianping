import { expect, test } from "@playwright/test";

test("shows the product trading workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "市场" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "按分类浏览" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "热门市场" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "交易准备" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "订单预览" })).toBeVisible();
  await expect(page.getByText("钱包未连接")).toBeVisible();
  await expect(page.getByText("Deposit Wallet（入金钱包）未创建")).toBeVisible();
  await expect(page.getByRole("button", { name: "人工确认关口" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "刷新市场列表" })).toBeVisible();
  await expect(page.getByText("国旗轮转")).toHaveCount(0);
  await expect(page.getByText("实时投注金额")).toHaveCount(0);
});

test("lets the user switch the web app to English", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("group", { name: "界面语言" })
    .getByRole("button", { name: "EN", exact: true })
    .click();

  await expect(page.getByRole("heading", { name: "Market groups" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top markets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trade readiness" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order preview" })).toBeVisible();
  await expect(page.getByText("Wallet not connected")).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();

  await page.getByRole("link", { name: "Register" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account center" })).toBeVisible();
  await expect(page.getByText("Please sign in first")).toBeVisible();
});

test("shows the stage 2 auth pages", async ({ page }) => {
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { level: 1, name: "注册账户" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "注册" })).toBeVisible();

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "登录账户" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "账户中心" })).toBeVisible();
  await expect(page.getByText("请先登录")).toBeVisible();
});
