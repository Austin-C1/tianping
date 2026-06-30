import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("wallet action boundaries", () => {
  it("splits wallet, Deposit Wallet, and Funding actions into focused files", () => {
    const walletDir = dirname(fileURLToPath(import.meta.url));
    const requiredFiles = [
      "deposit-wallet-actions.ts",
      "funding-actions.ts",
      "wallet-readiness-actions.ts",
      "wallet-signing-actions.ts"
    ];

    expect(requiredFiles.filter((file) => !existsSync(join(walletDir, file)))).toEqual([]);
  });

  it("keeps the compatibility barrel free of direct client calls", () => {
    const walletDir = dirname(fileURLToPath(import.meta.url));
    const barrel = readFileSync(join(walletDir, "wallet-actions.ts"), "utf8");

    expect(barrel).not.toContain("wallet-client");
  });
});
