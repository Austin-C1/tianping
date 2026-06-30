import {
  clearAccessToken,
  getCurrentUser,
  login,
  readAccessToken,
  register,
  saveAccessToken,
  type AuthCredentials,
  type AuthResult,
  type AuthUser
} from "./auth-client";

export async function registerAndStoreSession(credentials: AuthCredentials): Promise<AuthResult> {
  const result = await register(credentials);
  saveAccessToken(result.accessToken);

  return result;
}

export async function loginAndStoreSession(credentials: AuthCredentials): Promise<AuthResult> {
  const result = await login(credentials);
  saveAccessToken(result.accessToken);

  return result;
}

export async function loadAuthenticatedUser(): Promise<AuthUser> {
  return getCurrentUser();
}

export function signOut(): void {
  clearAccessToken();
}

export function hasStoredSession(): boolean {
  return readAccessToken() !== null;
}

export type { AuthCredentials, AuthResult, AuthUser };
