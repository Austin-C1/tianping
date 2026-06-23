export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

const ACCESS_TOKEN_KEY = "pmx.accessToken";

export async function register(credentials: AuthCredentials): Promise<AuthResult> {
  return postAuth("/auth/register", credentials);
}

export async function login(credentials: AuthCredentials): Promise<AuthResult> {
  return postAuth("/auth/login", credentials);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = readAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to load current user");
  }

  return (await response.json()) as AuthUser;
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

async function postAuth(path: string, credentials: AuthCredentials): Promise<AuthResult> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    throw new Error("Authentication request failed");
  }

  return (await response.json()) as AuthResult;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}
