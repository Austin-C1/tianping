import { expect, test } from "@playwright/test";

const ADMIN_URL = "http://127.0.0.1:3001";
const API_URL = "http://127.0.0.1:4000";
const PASSWORD = "change-me-123";
const LOGIN_BUTTON_NAME = /登\s*录/;

test("admin login page uses the stable login route", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/#/login`);

  await expect(page).toHaveURL(`${ADMIN_URL}/#/login`);
  await expect(page.getByRole("heading", { name: "运营控制台" })).toBeVisible();
  await expect(page.getByRole("button", { name: LOGIN_BUTTON_NAME })).toBeVisible();
});

test("admin user can sign in and open the dashboard", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/#/login`);

  await page.locator('input[autocomplete="username"]').fill("admin@pmx.local");
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/#/dashboard`);
  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  await expect(page.getByText("admin@pmx.local")).toBeVisible();
  await expect(page.getByText("市场已同步")).toBeVisible();
  await expect(page.getByText("待处理风险事件")).toBeVisible();
  await expect(page.getByText("市场数据同步")).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "用户" })).toBeVisible();
});

test("regular users cannot sign in to admin", async ({ page, request }) => {
  const email = `admin-e2e-user-${Date.now()}@pmx.local`;
  await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: PASSWORD
    }
  });

  await page.goto(`${ADMIN_URL}/#/login`);
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/#/login`);
  await expect(page.getByText("需要管理员权限")).toBeVisible();
});

test("admin operations pages show live API status", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/#/login`);

  await page.locator('input[autocomplete="username"]').fill("admin@pmx.local");
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await page.goto(`${ADMIN_URL}/#/markets`);

  await expect(page.getByRole("heading", { level: 2, name: "市场" })).toBeVisible();
  await expect(page.getByText("API 连接")).toBeVisible();
  await expect(page.getByText("市场已同步")).toBeVisible();
});
