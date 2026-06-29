import type { AuthCredentials, AuthResult, AuthUser } from "@pmx/api-client";
import {
  clearAccessToken,
  createWebApiClient,
  readAccessToken,
  saveAccessToken
} from "../api/api";

export type { AuthCredentials, AuthResult, AuthUser } from "@pmx/api-client";

export async function register(credentials: AuthCredentials): Promise<AuthResult> {
  return createWebApiClient().auth.register(credentials);
}

export async function login(credentials: AuthCredentials): Promise<AuthResult> {
  return createWebApiClient().auth.login(credentials);
}

export async function getCurrentUser(): Promise<AuthUser> {
  if (!readAccessToken()) {
    throw new Error("Not authenticated");
  }

  return createWebApiClient().auth.getCurrentUser();
}

export { clearAccessToken, readAccessToken, saveAccessToken };
