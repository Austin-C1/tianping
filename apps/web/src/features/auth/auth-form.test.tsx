import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../i18n/language-provider";
import { AuthForm } from "./auth-form";
import * as authClient from "./auth-client";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("registers and stores the returned access token", async () => {
    vi.spyOn(authClient, "register").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    const saveAccessToken = vi.spyOn(authClient, "saveAccessToken");

    renderAuthForm(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => expect(saveAccessToken).toHaveBeenCalledWith("token"));
    expect(screen.getByText("已注册并登录：person@example.com")).toBeInTheDocument();
  });

  it("logs in and stores the returned access token", async () => {
    vi.spyOn(authClient, "login").mockResolvedValue({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    const saveAccessToken = vi.spyOn(authClient, "saveAccessToken");

    renderAuthForm(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "person@example.com" }
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "long-enough-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => expect(saveAccessToken).toHaveBeenCalledWith("token"));
    expect(screen.getByText("已登录：person@example.com")).toBeInTheDocument();
  });

  it("uses persisted English labels", async () => {
    window.localStorage.setItem("pmx.locale", "en");

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
