import request from '@/utils/http'

export function fetchAdminUsers() {
  return request.get<Api.Platform.AdminUser[]>({
    url: '/admin/users'
  })
}
