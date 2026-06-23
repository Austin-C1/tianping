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
    return error instanceof Error ? error : new Error('Request failed')
  }

  const responseMessage = error.response?.data?.message
  const message = Array.isArray(responseMessage)
    ? responseMessage.join(', ')
    : responseMessage || error.message

  return new Error(message)
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
