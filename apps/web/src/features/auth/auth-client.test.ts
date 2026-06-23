import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccessToken,
  getCurrentUser,
  login,
  readAccessToken,
  register,
  saveAccessToken
} from "./auth-client";

describe("auth-client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("registers a user through the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "token",
          user: { id: "user_123", email: "person@example.com" }
        })
      }))
    );

    await expect(
      register({ email: "person@example.com", password: "long-enough-password" })
    ).resolves.toEqual({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        password: "long-enough-password"
      })
    });
  });

  it("logs in a user through the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "token",
          user: { id: "user_123", email: "person@example.com" }
        })
      }))
    );

    await expect(
      login({ email: "person@example.com", password: "long-enough-password" })
    ).resolves.toEqual({
      accessToken: "token",
      user: { id: "user_123", email: "person@example.com" }
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        password: "long-enough-password"
      })
    });
  });

  it("loads the current user with the stored access token", async () => {
    saveAccessToken("token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: "user_123", email: "person@example.com" })
      }))
    );

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user_123",
      email: "person@example.com"
    });
    expect(fetch).toHaveBeenCalledWith("http://api.test/auth/me", {
      headers: { Authorization: "Bearer token" }
    });
  });

  it("stores and clears the access token", () => {
    saveAccessToken("token");
    expect(readAccessToken()).toBe("token");

    clearAccessToken();
    expect(readAccessToken()).toBeNull();
  });
});
