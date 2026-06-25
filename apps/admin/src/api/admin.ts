import { get } from './http'
import { post } from './http'

export interface AdminSummary {
  registeredUsers: number
  adminUsers: number
  walletsConnected: number
  marketsSynced: number
  latestMarketSyncedAt: string | null
  marketQuotesSynced: number
  latestMarketQuoteSyncedAt: string | null
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
  details?: string | null
}

export type OrderRouterMode = 'preview' | 'paper' | 'live'

export interface OrderRouterEnvironment {
  mode: OrderRouterMode
  clobHost: string
  chainId: number | null
  builderCodeConfigured: boolean
  relayerConfigured: boolean
  rpcConfigured: boolean
  liveTradingEnabled: boolean
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

export function fetchAdminEnvironment() {
  return get<OrderRouterEnvironment>('/admin/environment')
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
