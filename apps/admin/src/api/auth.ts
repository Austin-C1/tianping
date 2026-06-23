import request from '@/utils/http'

export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/auth/login',
    params: {
      email: params.userName,
      password: params.password
    }
  })
}

export function fetchGetUserInfo() {
  return request.get<{ id: string; email: string; role: 'USER' | 'ADMIN' }>({
    url: '/auth/me'
  }).then((user) => ({
    buttons:
      user.role === 'ADMIN' ? ['market:sync', 'order:read', 'audit:read', 'risk:review'] : [],
    roles: user.role === 'ADMIN' ? ['R_ADMIN'] : ['R_USER'],
    userId: Number.parseInt(user.id.replace(/\D/g, '').slice(0, 8) || '1', 10),
    userName: user.email,
    email: user.email,
    role: user.role
  }))
}
