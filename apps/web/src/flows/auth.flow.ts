import {
  loadAuthenticatedUser,
  loginAndStoreSession,
  registerAndStoreSession
} from "../features/auth/auth-actions";
import type { AuthCredentials, AuthResult, AuthUser } from "../features/auth/auth-client";

export interface RegisterAndLoginResult {
  currentUser: AuthUser;
  login: AuthResult;
  register: AuthResult;
}

export async function registerAndLogin(credentials: AuthCredentials): Promise<RegisterAndLoginResult> {
  const registerResult = await registerAndStoreSession(credentials);
  const loginResult = await loginAndStoreSession(credentials);
  const currentUser = await loadAuthenticatedUser();

  return {
    currentUser,
    login: loginResult,
    register: registerResult
  };
}
