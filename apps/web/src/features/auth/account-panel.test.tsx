import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendOrderPreviewActivity } from "../activity/activity-store";
import { LanguageProvider } from "../i18n/language-provider";
import { AccountPanel } from "./account-panel";
import * as authClient from "./auth-client";

vi.mock("../wallet/wallet-panel", () => ({
  WalletPanel: () => (
    <section>
      <div className="account-grid">
        <section>
          <h2>钱包状态</h2>
        </section>
        <section>
          <h2>Deposit Wallet</h2>
        </section>
        <section>
          <h2>资金与授权</h2>
        </section>
        <section>
          <h2>风控状态</h2>
        </section>
      </div>
    </section>
  )
}));

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("shows a login prompt when no token is stored", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue(null);

    renderAccountPanel();

    await waitFor(() => {
      expect(screen.getByText("请先登录")).toBeInTheDocument();
    });
  });

  it("loads and displays the current user", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "TRADER"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("TRADER")).toBeInTheDocument();
  });

  it("shows account, wallet, deposit wallet, balance, and risk sections", async () => {
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "钱包状态" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deposit Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "资金与授权" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "风控状态" })).toBeInTheDocument();
  });


  it("uses persisted English account copy", async () => {
    window.localStorage.setItem("pmx.locale", "en");
    vi.spyOn(authClient, "readAccessToken").mockReturnValue(null);

    renderAccountPanel();

    await waitFor(() => {
      expect(screen.getByText("Please sign in first")).toBeInTheDocument();
    });
  });

  it("shows the latest order preview from local activity", async () => {
    window.localStorage.setItem("pmx.locale", "en");
    vi.spyOn(crypto, "randomUUID").mockReturnValue("activity_1");
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "USER"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("Spread: Colombia (-5.5)")).toBeInTheDocument();
    expect(screen.getByText("Buy DR Congo 75c / $10.00")).toBeInTheDocument();
  });

  it("localizes the latest order preview in Chinese mode", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("activity_1");
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });
    vi.spyOn(authClient, "readAccessToken").mockReturnValue("token");
    vi.spyOn(authClient, "getCurrentUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "USER"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("买入 刚果民主共和国 75c / $10.00")).toBeInTheDocument();
  });
});

function renderAccountPanel() {
  render(
    <LanguageProvider>
      <AccountPanel />
    </LanguageProvider>
  );
}
