import { get, post } from './http'

export interface AdminUser {
  id: string
  email: string
  role: 'ADMIN' | 'USER'
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  user: AdminUser
}

export function login(payload: LoginPayload) {
  return post<LoginResult, LoginPayload>('/auth/login', payload)
}

export function getCurrentUser() {
  return get<AdminUser>('/auth/me')
}
