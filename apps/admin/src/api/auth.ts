import type { AuthCredentials, AuthResult, AuthUser } from '@pmx/api-client'
import { createAdminApiClient, runAdminApiRequest } from './http'

export interface AdminUser extends AuthUser {
  role: 'ADMIN' | 'USER'
}

export type LoginPayload = AuthCredentials

export interface LoginResult extends Omit<AuthResult, 'user'> {
  user: AdminUser
}

export function login(payload: LoginPayload): Promise<LoginResult> {
  return runAdminApiRequest(async () => {
    const result = await createAdminApiClient().auth.login(payload)

    return result as LoginResult
  })
}

export function getCurrentUser(): Promise<AdminUser> {
  return runAdminApiRequest(async () => {
    const user = await createAdminApiClient().auth.getCurrentUser()

    return user as AdminUser
  })
}
