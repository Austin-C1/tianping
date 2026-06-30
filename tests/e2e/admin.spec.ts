import { expect, test } from "@playwright/test";

const ADMIN_URL = "http://127.0.0.1:3001";
const API_URL = "http://127.0.0.1:4000";
const PASSWORD = "change-me-123";
test.describe.configure({ mode: "serial" });
const LOGIN_BUTTON_NAME = /登\s*录/;
const REFRESH_BUTTON_NAME = /刷\s*新/;

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

  await expect(page).toHaveURL(`${ADMIN_URL}/#/dashboard`, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  await expect(page.getByText("admin@pmx.local")).toBeVisible();
  await expect(page.getByText("市场已同步")).toBeVisible();
  await expect(page.getByText("marketQuotesSynced")).toBeVisible();
  await expect(page.getByText("待处理风险事件")).toBeVisible();
  await expect(page.getByText("市场数据同步")).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "用户" })).toBeVisible();
});

test("regular users cannot sign in to admin", async ({ page, request }) => {
  const email = `admin-e2e-user-${Date.now()}@pmx.local`;
  const registerResponse = await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: PASSWORD
    }
  });
  const registered = await registerResponse.json();

  await page.goto(`${ADMIN_URL}/#/login`);
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/#/login`);
  await expect(page.getByText("需要管理员权限")).toBeVisible();

  const summaryResponse = await request.get(`${API_URL}/admin/summary`, {
    headers: {
      Authorization: `Bearer ${registered.accessToken}`
    }
  });
  expect(summaryResponse.status()).toBe(403);
});

test("admin audit page shows latest audit records", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/#/login`);

  await page.locator('input[autocomplete="username"]').fill("admin@pmx.local");
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/#/dashboard`, { timeout: 15_000 });

  await page.goto(`${ADMIN_URL}/#/audit`);

  await expect(page.getByRole("heading", { level: 2, name: "审计" })).toBeVisible();
  await expect(page.getByRole("button", { name: REFRESH_BUTTON_NAME })).toBeVisible();
  await expect(page.getByText("auth.login").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("admin@pmx.local").first()).toBeVisible();
});

test("admin risk page shows real trading blockers", async ({ page }) => {
  const safetyNotice = "这里只记录人工批准状态，不启用真实 CLOB submit。";
  let approvalState: {
    latestApproval: unknown;
    safetyNotice: string;
    status: string;
  } = {
    latestApproval: null,
    safetyNotice: "Manual approval records readiness only. It does not enable real CLOB submit.",
    status: "NOT_APPROVED"
  };
  let approveRequests = 0;
  let revokeRequests = 0;

  await page.goto(`${ADMIN_URL}/#/login`);

  await page.locator('input[autocomplete="username"]').fill("admin@pmx.local");
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await expect(page).toHaveURL(`${ADMIN_URL}/#/dashboard`, { timeout: 15_000 });

  await page.route("**/admin/live-approval", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(approvalState)
    });
  });
  await page.route("**/admin/live-approval/approve", async (route) => {
    approveRequests += 1;
    approvalState = {
      latestApproval: {
        approvalReason: "funding and audit reviewed",
        approvedAt: "2026-06-30T12:00:00.000Z",
        approvedByEmail: "admin@pmx.local",
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: null,
        revokedAt: null,
        revokedByEmail: null,
        revokedById: null,
        status: "APPROVED"
      },
      safetyNotice: approvalState.safetyNotice,
      status: "APPROVED"
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(approvalState)
    });
  });
  await page.route("**/admin/live-approval/revoke", async (route) => {
    revokeRequests += 1;
    approvalState = {
      latestApproval: {
        approvalReason: "funding and audit reviewed",
        approvedAt: "2026-06-30T12:00:00.000Z",
        approvedByEmail: "admin@pmx.local",
        approvedById: "admin_1",
        id: "approval_1",
        revokeReason: "operator revoked",
        revokedAt: "2026-06-30T12:15:00.000Z",
        revokedByEmail: "admin@pmx.local",
        revokedById: "admin_1",
        status: "REVOKED"
      },
      safetyNotice: approvalState.safetyNotice,
      status: "NOT_APPROVED"
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(approvalState)
    });
  });

  await page.goto(`${ADMIN_URL}/#/risk`);

  await expect(page.getByRole("heading", { level: 2, name: "风险" })).toBeVisible();
  await expect(page.getByText("真实交易状态")).toBeVisible();
  await expect(page.getByText("不可提交真实订单")).toBeVisible();
  await expect(page.getByText("资金与授权准备状态")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("手动实盘批准").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("批准原因")).toBeVisible();
  await expect(page.getByText("批准人")).toBeVisible();
  await expect(page.getByText("批准时间")).toBeVisible();
  await expect(page.getByText("撤销信息")).toBeVisible();
  await expect(page.getByText(safetyNotice)).toBeVisible();
  await expect(page.getByRole("button", { name: "批准实盘准备" })).toBeVisible();
  await expect(page.getByRole("button", { name: "撤销批准" })).toBeVisible();
  await expect(page.getByText("Order Router 安全模式")).toBeVisible();

  await page.getByPlaceholder("填写批准或撤销原因").fill("funding and audit reviewed");
  await page.getByRole("button", { name: "批准实盘准备" }).click();
  await expect(page.getByText("已批准")).toBeVisible();
  await expect(page.getByText("funding and audit reviewed").first()).toBeVisible();
  expect(approveRequests).toBe(1);

  await page.getByPlaceholder("填写批准或撤销原因").fill("operator revoked");
  await page.getByRole("button", { name: "撤销批准" }).click();
  await expect(page.getByText("operator revoked")).toBeVisible();
  await expect(page.getByText("未批准")).toBeVisible();
  expect(revokeRequests).toBe(1);
});

test("admin operations pages show live API status", async ({ page }) => {
  await page.goto(`${ADMIN_URL}/#/login`);

  await page.locator('input[autocomplete="username"]').fill("admin@pmx.local");
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

  await page.goto(`${ADMIN_URL}/#/markets`);

  await expect(page.getByRole("heading", { level: 2, name: "市场" })).toBeVisible();
  await expect(page.getByText("API 连接")).toBeVisible();
  await expect(page.getByText("marketsSynced")).toBeVisible();
  await expect(page.getByText("marketQuotesSynced")).toBeVisible();
  await expect(page.getByText("latestMarketSyncedAt")).toBeVisible();
  await expect(page.getByText("latestMarketQuoteSyncedAt")).toBeVisible();

  await page.route("**/admin/markets/sync", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        error: null,
        failed: 0,
        quotesFailed: 0,
        quotesSynced: 4,
        synced: 12
      })
    });
  });

  await page.getByRole("button", { name: "同步市场" }).click();
  await expect(page.getByText(/市场成功 \d+ \/ 失败 \d+，行情成功 \d+ \/ 失败 \d+/)).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByText("lastFailureReason")).toBeVisible();
});
