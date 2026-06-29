import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendOrderPreviewActivity } from "../activity/activity-store";
import { LanguageProvider } from "../i18n/language-provider";
import { AccountPanel } from "./account-panel";
import * as authActions from "./auth-actions";

vi.mock("../wallet/wallet-panel", () => ({
  WalletPanel: () => (
    <section>
      <div className="account-grid">
        <section>
          <h2>Wallet status</h2>
        </section>
        <section>
          <h2>Deposit Wallet</h2>
        </section>
        <section>
          <h2>Funding and approvals</h2>
        </section>
        <section>
          <h2>Risk status</h2>
        </section>
      </div>
    </section>
  )
}));

describe("AccountPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
  });

  it("shows a login prompt when no token is stored", async () => {
    vi.spyOn(authActions, "hasStoredSession").mockReturnValue(false);

    renderAccountPanel();

    await waitFor(() => {
      expect(screen.getByText("Please sign in first")).toBeInTheDocument();
    });
  });

  it("loads and displays the current user", async () => {
    vi.spyOn(authActions, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authActions, "loadAuthenticatedUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "USER"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("USER")).toBeInTheDocument();
  });

  it("shows account, wallet, deposit wallet, balance, and risk sections", async () => {
    vi.spyOn(authActions, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authActions, "loadAuthenticatedUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Wallet status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deposit Wallet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Funding and approvals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk status" })).toBeInTheDocument();
  });

  it("shows the latest order preview from local activity", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("activity_1");
    appendOrderPreviewActivity({
      amountUsd: 10,
      marketTitle: "Spread: Colombia (-5.5)",
      outcome: "DR Congo",
      price: 0.75
    });
    vi.spyOn(authActions, "hasStoredSession").mockReturnValue(true);
    vi.spyOn(authActions, "loadAuthenticatedUser").mockResolvedValue({
      id: "user_123",
      email: "person@example.com",
      role: "USER"
    });

    renderAccountPanel();

    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("Spread: Colombia (-5.5)")).toBeInTheDocument();
    expect(screen.getByText("Buy DR Congo 75c / $10.00")).toBeInTheDocument();
  });
});

function renderAccountPanel() {
  render(
    <LanguageProvider>
      <AccountPanel />
    </LanguageProvider>
  );
}
