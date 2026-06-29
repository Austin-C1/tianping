import type {
  AdminGate,
  AdminSummary,
  ManagedUser,
  MarketSyncResult,
  OrderRouterEnvironment
} from '@pmx/api-client'
import { createAdminApiClient, runAdminApiRequest } from './http'

export type {
  AdminGate,
  AdminSummary,
  ManagedUser,
  MarketSyncResult,
  OrderRouterEnvironment
} from '@pmx/api-client'

export type AdminGateStatus = AdminGate['status']
export type OrderRouterMode = OrderRouterEnvironment['mode']

export function fetchAdminUsers(): Promise<ManagedUser[]> {
  return runAdminApiRequest(() => createAdminApiClient().admin.listUsers())
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

export function syncMarkets(): Promise<MarketSyncResult> {
  return runAdminApiRequest(() => createAdminApiClient().markets.sync())
}
