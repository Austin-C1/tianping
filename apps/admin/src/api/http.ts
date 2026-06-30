import { ApiClientError, createApiClient } from '@pmx/api-client'

export const ACCESS_TOKEN_KEY = 'pmx-admin.access-token'

export function createAdminApiClient() {
  return createApiClient({
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    getAccessToken: () => window.localStorage.getItem(ACCESS_TOKEN_KEY)
  })
}

export async function runAdminApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw normalizeError(error)
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof ApiClientError) {
    return new Error(localizeErrorMessage(error.message))
  }

  return error instanceof Error ? error : new Error('Request failed')
}

function localizeErrorMessage(message: string): string {
  const knownMessages: Record<string, string> = {
    'Admin role is required': '需要管理员权限',
    'Bearer token is required': '需要登录后访问',
    'Email is already registered': '邮箱已注册',
    'Invalid access token': '登录已失效，请重新登录',
    'Invalid email or password': '邮箱或密码错误',
    'Request failed': '请求失败',
    'User no longer exists': '用户不存在'
  }

  return knownMessages[message] ?? message
}
