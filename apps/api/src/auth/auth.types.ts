export interface AuthUser {
  id: string;
  email: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}
