export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}
