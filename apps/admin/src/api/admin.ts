import { get } from './http'
import { post } from './http'

export interface AdminSummary {
  registeredUsers: number
  adminUsers: number
  walletsConnected: number
  marketsSynced: number
  marketQuotesSynced: number
  ordersPreviewed: number
  openRiskEvents: number
}

export type AdminGateStatus = 'READY' | 'PENDING' | 'BLOCKED'

export interface AdminGate {
  key: string
  title: string
  owner: string
  status: AdminGateStatus
  updatedAt: string | null
}

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

export function fetchAdminSummary() {
  return get<AdminSummary>('/admin/summary')
}

export function fetchAdminGates() {
  return get<AdminGate[]>('/admin/gates')
}

export interface MarketSyncResult {
  synced: number
  failed: number
  quotesSynced: number
  quotesFailed: number
  error?: string
}

export function syncMarkets() {
  return post<MarketSyncResult, Record<string, never>>('/admin/markets/sync', {})
}
