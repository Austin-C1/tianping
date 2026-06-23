import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'pmx-admin.access-token'

const rawHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15_000
})

rawHttp.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function normalizeError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error('请求失败')
  }

  const responseMessage = error.response?.data?.message
  const message = Array.isArray(responseMessage)
    ? responseMessage.join(', ')
    : responseMessage || error.message

  return new Error(localizeErrorMessage(message))
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

export async function get<T>(url: string): Promise<T> {
  try {
    const response = await rawHttp.get<T>(url)
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function post<T, TBody extends object>(
  url: string,
  body: TBody
): Promise<T> {
  try {
    const response = await rawHttp.post<T>(url, body)
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}
