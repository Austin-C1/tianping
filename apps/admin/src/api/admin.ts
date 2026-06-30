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

export interface ManagedOrder {
  clobOrderId: string | null
  createdAt: string
  failureReason: string | null
  id: string
  market: {
    marketId: string
    question: string
  } | null
  outcome: string | null
  price: string
  size: string
  status: string
  submittedAt: string | null
  updatedAt: string
}

export interface ManagedAuditLog {
  id: string
  action: string
  userId: string | null
  userEmail: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: unknown | null
  createdAt: string
}

export type RiskGateCategory = 'environment' | 'market' | 'wallet' | 'compliance' | 'risk'
export type RiskGateSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface RiskGate {
  key: string
  title: string
  category: RiskGateCategory
  status: AdminGateStatus
  severity: RiskGateSeverity
  blocking: boolean
  description: string
  evidence: string
  updatedAt: string | null
}

export interface RiskGateReport {
  generatedAt: string
  mode: OrderRouterMode
  liveTradingEnabled: boolean
  canSubmitLiveOrders: boolean
  blockingCount: number
  warningCount: number
  gates: RiskGate[]
}

export type LiveApprovalStatusValue = 'APPROVED' | 'NOT_APPROVED'
export type LiveApprovalRecordStatus = 'APPROVED' | 'REVOKED'

export interface LiveApprovalRecord {
  id: string
  status: LiveApprovalRecordStatus
  approvalReason: string
  approvedById: string | null
  approvedByEmail: string | null
  approvedAt: string
  revokeReason: string | null
  revokedById: string | null
  revokedByEmail: string | null
  revokedAt: string | null
}

export interface LiveApprovalStatus {
  status: LiveApprovalStatusValue
  latestApproval: LiveApprovalRecord | null
  safetyNotice: string
}

export interface LiveApprovalReason {
  reason: string
}

export function fetchAdminUsers() {
  return get<ManagedUser[]>('/admin/users')
}

export function fetchAdminOrders() {
  return get<ManagedOrder[]>('/orders')
}

export function fetchAdminAuditLogs() {
  return get<ManagedAuditLog[]>('/admin/audit')
}

export function fetchRiskGateReport() {
  return get<RiskGateReport>('/admin/risk/gates')
}

export function fetchLiveApproval() {
  return get<LiveApprovalStatus>('/admin/live-approval')
}

export function approveLiveTrading(body: LiveApprovalReason) {
  return post<LiveApprovalStatus, LiveApprovalReason>('/admin/live-approval/approve', body)
}

export function revokeLiveTrading(body: LiveApprovalReason) {
  return post<LiveApprovalStatus, LiveApprovalReason>('/admin/live-approval/revoke', body)
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
