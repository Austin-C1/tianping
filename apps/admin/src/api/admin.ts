import { get } from './http'

export interface ManagedUser {
  id: string
  email: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  walletCount: number
  walletStatus: 'CONNECTED' | 'NOT_CONNECTED'
  primaryWalletAddress: string | null
}

export function fetchAdminUsers() {
  return get<ManagedUser[]>('/admin/users')
}
