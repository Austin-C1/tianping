import type {
  AdminGate,
  AdminGateStatus,
  AdminSummary,
  LiveApprovalReason,
  LiveApprovalStatus,
  ManagedAuditLog,
  ManagedOrder,
  ManagedUser,
  OrderRouterEnvironment,
  OrderRouterMode,
  RiskGate,
  RiskGateCategory,
  RiskGateReport,
  RiskGateSeverity,
  SyncJobRun
} from '@pmx/api-client'
import { createAdminApiClient, runAdminApiRequest } from './http'

export type {
  AdminGate,
  AdminGateStatus,
  AdminSummary,
  LiveApprovalReason,
  LiveApprovalStatus,
  ManagedAuditLog,
  ManagedOrder,
  ManagedUser,
  OrderRouterEnvironment,
  OrderRouterMode,
  RiskGate,
  RiskGateCategory,
  RiskGateReport,
  RiskGateSeverity,
  SyncJobRun
} from '@pmx/api-client'

export function fetchAdminUsers(): Promise<ManagedUser[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.listUsers())
}

export function fetchAdminOrders(): Promise<ManagedOrder[]> {
  return runAdminApiRequest(() => createAdminApiClient().orders.list())
}

export function fetchAdminAuditLogs(): Promise<ManagedAuditLog[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getAuditLogs())
}

export function fetchRiskGateReport(): Promise<RiskGateReport> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getRiskGateReport())
}

export function fetchLiveApproval(): Promise<LiveApprovalStatus> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getLiveApproval())
}

export function approveLiveTrading(body: LiveApprovalReason): Promise<LiveApprovalStatus> {
  return runAdminApiRequest(() => createAdminApiClient().admin.approveLiveTrading(body))
}

export function revokeLiveTrading(body: LiveApprovalReason): Promise<LiveApprovalStatus> {
  return runAdminApiRequest(() => createAdminApiClient().admin.revokeLiveTrading(body))
}

export function fetchAdminSummary(): Promise<AdminSummary> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getSummary())
}

export function fetchAdminGates(): Promise<AdminGate[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getGates())
}

export function fetchAdminEnvironment(): Promise<OrderRouterEnvironment> {
  return runAdminApiRequest(() => createAdminApiClient().admin.getEnvironment())
}

export function enqueueMarketSync(): Promise<SyncJobRun> {
  return runAdminApiRequest(() => createAdminApiClient().admin.enqueueMarketSync())
}
