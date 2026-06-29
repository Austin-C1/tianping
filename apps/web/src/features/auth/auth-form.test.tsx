import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import * as authActions from "./auth-actions";
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem("pmx.locale", "en");
  });

  it("registers through auth actions", async () => {
    const registerAndStoreSession = vi.spyOn(authActions, "registerAndStoreSession").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });

    renderAuthForm(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(registerAndStoreSession).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "long-enough-password"
      })
    );
    expect(screen.getByText("Registered and signed in: person@example.com")).toBeInTheDocument();
  });

  it("logs in through auth actions", async () => {
    const loginAndStoreSession = vi.spyOn(authActions, "loginAndStoreSession").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });

    renderAuthForm(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(loginAndStoreSession).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "long-enough-password"
      })
    );
    expect(screen.getByText("Signed in: person@example.com")).toBeInTheDocument();
  });

  it("uses persisted English labels", async () => {
    renderAuthForm(<AuthForm mode="login" />);

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

function renderAuthForm(children: ReactNode) {
  render(<LanguageProvider>{children}</LanguageProvider>);
}
