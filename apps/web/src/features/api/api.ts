import { createApiClient } from "@pmx/api-client";

const ACCESS_TOKEN_KEY = "pmx.accessToken";

export function createWebApiClient() {
  return createApiClient({
    baseUrl: getApiBaseUrl(),
    getAccessToken: readAccessToken
  });
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function readAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
