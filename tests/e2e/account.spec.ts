import { expect, test } from "@playwright/test";

test("shows authenticated account readiness and recent order preview", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("pmx.locale", "en");
    window.localStorage.setItem("pmx.accessToken", "token");
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: {
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") {
            return ["0x0000000000000000000000000000000000000001"];
          }
          if (method === "eth_chainId") {
            return "0x89";
          }
          if (method === "personal_sign") {
            return "0xsig";
          }

          throw new Error(`Unsupported wallet method: ${method}`);
        }
      }
    });
    window.localStorage.setItem(
      "pmx.activity",
      JSON.stringify([
        {
          id: "activity_1",
          type: "order.previewed",
          label: "Spread: Colombia (-5.5)",
          description: "Buy DR Congo 75c / $10.00",
          createdAt: "2026-06-24T00:00:00.000Z"
        }
      ])
    );
  });
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "user_123",
        email: "person@example.com",
        role: "USER"
      })
    });
  });
  let walletVerified = false;
  await page.route("**/wallets/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canPreview: true,
        canSign: false,
        depositWallet: {
          address: null,
          chainId: null,
          status: "NOT_CREATED"
        },
        eoa: walletVerified
          ? {
              address: "0x0000000000000000000000000000000000000001",
              chainId: 137,
              status: "CONNECTED"
            }
          : {
              address: null,
              chainId: null,
              status: "NOT_CONNECTED"
            },
        funding: {
          allowance: null,
          balanceCacheStale: true,
          balanceCacheUpdatedAt: null,
          minimumOrderSize: null,
          minimumOrderSizeMet: null,
          pUsdBalance: null,
          reason: "Deposit Wallet is not ready",
          requiredAllowance: null,
          status: "NO_DEPOSIT_WALLET"
        },
        gates: [
          {
            key: "wallet-binding",
            reason: walletVerified ? "EOA wallet is connected" : "EOA wallet is not connected",
            status: walletVerified ? "READY" : "PENDING"
          },
          {
            key: "deposit-wallet",
            reason: "Deposit Wallet is not created",
            status: "PENDING"
          },
          {
            key: "funding-allowance",
            reason: "pUSD balance and allowance are not checked",
            status: "PENDING"
          },
          {
            key: "region-risk",
            reason: "Region risk check is not complete",
            status: "PENDING"
          }
        ],
        region: {
          status: "NOT_CHECKED"
        }
      })
    });
  });
  await page.route("**/wallets/deposit/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        address: null,
        chainId: null,
        latestOperation: null,
        latestRelayerTransaction: null,
        ownerAddress: null,
        status: "NOT_CREATED",
        updatedAt: null
      })
    });
  });
  await page.route("**/wallets/nonce", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        expiresAt: "2026-06-24T12:10:00.000Z",
        message: "PMX wallet binding\nNonce: nonce_1",
        nonce: "nonce_1"
      })
    });
  });
  await page.route("**/wallets/verify", async (route) => {
    walletVerified = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        address: "0x0000000000000000000000000000000000000001",
        chainId: 137,
        status: "CONNECTED"
      })
    });
  });

  await page.goto("/account");

  const accountPanel = page.locator(".account-panel");

  await expect(page.getByRole("heading", { name: "Account center" })).toBeVisible();
  await expect(accountPanel.getByText("person@example.com")).toBeVisible();
  await expect(accountPanel.getByText("USER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wallet status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deposit Wallet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Funding and approvals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Risk status" })).toBeVisible();
  await expect(accountPanel.getByText("EOA wallet is not connected")).toBeVisible();
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(accountPanel.getByText("0x0000000000000000000000000000000000000001")).toBeVisible();
  await expect(accountPanel.getByText("Spread: Colombia (-5.5)")).toBeVisible();
  await expect(accountPanel.getByText("Buy DR Congo 75c / $10.00")).toBeVisible();
});

const fundingScenarios = [
  {
    allowance: null,
    balanceCacheStale: true,
    balanceCacheUpdatedAt: null,
    expectedDetail: "Deposit Wallet is not ready",
    expectedStatus: "NO_DEPOSIT_WALLET",
    pUsdBalance: null,
    reason: "Deposit Wallet is not ready",
    requiredAllowance: null,
    status: "NO_DEPOSIT_WALLET"
  },
  {
    allowance: "100",
    balanceCacheStale: false,
    balanceCacheUpdatedAt: "2026-06-25T10:00:00.000Z",
    expectedDetail: "Deposit Wallet has no pUSD",
    expectedStatus: "NO_PUSD",
    pUsdBalance: "0",
    reason: "Deposit Wallet has no pUSD",
    requiredAllowance: "10",
    status: "NO_PUSD"
  },
  {
    allowance: "2",
    balanceCacheStale: false,
    balanceCacheUpdatedAt: "2026-06-25T10:00:00.000Z",
    expectedDetail: "CLOB exchange allowance is insufficient",
    expectedStatus: "ALLOWANCE_MISSING",
    pUsdBalance: "50",
    reason: "CLOB exchange allowance is insufficient",
    requiredAllowance: "10",
    status: "ALLOWANCE_MISSING"
  },
  {
    allowance: "100",
    balanceCacheStale: true,
    balanceCacheUpdatedAt: "2026-06-25T09:50:00.000Z",
    expectedDetail: "CLOB balance allowance cache is stale",
    expectedStatus: "CACHE_STALE",
    pUsdBalance: "50",
    reason: "CLOB balance allowance cache is stale",
    requiredAllowance: "10",
    status: "CACHE_STALE"
  },
  {
    allowance: "100",
    balanceCacheStale: false,
    balanceCacheUpdatedAt: "2026-06-25T10:01:00.000Z",
    expectedDetail: "pUSD balance and allowance are ready",
    expectedStatus: "READY",
    pUsdBalance: "50",
    reason: "pUSD balance and allowance are ready",
    requiredAllowance: "10",
    status: "READY"
  }
] as const;

for (const scenario of fundingScenarios) {
  test(`shows funding state ${scenario.status}`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("pmx.locale", "en");
      window.localStorage.setItem("pmx.accessToken", "token");
    });
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          email: "person@example.com",
          id: "user_123",
          role: "USER"
        })
      });
    });
    await page.route("**/wallets/me", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          canPreview: true,
          canSign: false,
          depositWallet: {
            address:
              scenario.status === "NO_DEPOSIT_WALLET"
                ? null
                : "0x2222222222222222222222222222222222222222",
            chainId: scenario.status === "NO_DEPOSIT_WALLET" ? null : 137,
            status: scenario.status === "NO_DEPOSIT_WALLET" ? "NOT_CREATED" : "READY"
          },
          eoa: {
            address: "0x0000000000000000000000000000000000000001",
            chainId: 137,
            status: "CONNECTED"
          },
          funding: {
            allowance: scenario.allowance,
            balanceCacheStale: scenario.balanceCacheStale,
            balanceCacheUpdatedAt: scenario.balanceCacheUpdatedAt,
            minimumOrderSize: "5",
            minimumOrderSizeMet: true,
            pUsdBalance: scenario.pUsdBalance,
            reason: scenario.reason,
            requiredAllowance: scenario.requiredAllowance,
            status: scenario.status
          },
          gates: [
            {
              key: "wallet-binding",
              reason: "EOA wallet is connected",
              status: "READY"
            },
            {
              key: "deposit-wallet",
              reason:
                scenario.status === "NO_DEPOSIT_WALLET"
                  ? "Deposit Wallet is not created"
                  : "Deposit Wallet is ready",
              status: scenario.status === "NO_DEPOSIT_WALLET" ? "PENDING" : "READY"
            },
            {
              key: "funding-allowance",
              reason: scenario.reason,
              status: scenario.status === "READY" ? "READY" : "PENDING"
            },
            {
              key: "region-risk",
              reason: "Region risk check is not complete",
              status: "PENDING"
            }
          ],
          region: {
            status: "NOT_CHECKED"
          }
        })
      });
    });
    await page.route("**/wallets/deposit/status", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          address:
            scenario.status === "NO_DEPOSIT_WALLET"
              ? null
              : "0x2222222222222222222222222222222222222222",
          chainId: scenario.status === "NO_DEPOSIT_WALLET" ? null : 137,
          latestOperation: null,
          latestRelayerTransaction: null,
          ownerAddress:
            scenario.status === "NO_DEPOSIT_WALLET"
              ? null
              : "0x0000000000000000000000000000000000000001",
          status: scenario.status === "NO_DEPOSIT_WALLET" ? "NOT_CREATED" : "READY",
          updatedAt: null
        })
      });
    });

    await page.goto("/account");

    const accountPanel = page.locator(".account-panel");
    const fundingCard = accountPanel
      .locator(".account-status-card")
      .filter({ has: page.getByRole("heading", { name: "Funding and approvals" }) });
    await expect(fundingCard.locator("span").getByText(scenario.expectedStatus, { exact: true })).toBeVisible();
    await expect(fundingCard.getByText(scenario.expectedDetail)).toBeVisible();
    await expect(
      fundingCard.getByText(
        "Fund or withdraw through your Polymarket Deposit Wallet. PMX does not route funds through a Platform Wallet in this phase."
      )
    ).toBeVisible();

    if (scenario.pUsdBalance) {
      await expect(fundingCard.getByText(`pUSD ${scenario.pUsdBalance}`)).toBeVisible();
    }

    if (scenario.allowance) {
      await expect(fundingCard.getByText(`Allowance ${scenario.allowance}`)).toBeVisible();
    }
  });
}
