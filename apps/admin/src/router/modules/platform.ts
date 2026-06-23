import { AppRouteRecord } from '@/types/router'

export const platformRoutes: AppRouteRecord = {
  name: 'Platform',
  path: '/platform',
  component: '/index/index',
  meta: {
    title: 'PMX Admin',
    icon: 'ri:dashboard-3-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'dashboard',
      name: 'PlatformDashboard',
      component: '/platform/dashboard',
      meta: {
        title: 'Overview',
        icon: 'ri:home-smile-2-line',
        keepAlive: false,
        fixedTab: true
      }
    },
    {
      path: 'users',
      name: 'PlatformUsers',
      component: '/platform/users',
      meta: {
        title: 'Users',
        icon: 'ri:user-line',
        keepAlive: true
      }
    },
    {
      path: 'markets',
      name: 'PlatformMarkets',
      component: '/platform/markets',
      meta: {
        title: 'Markets',
        icon: 'ri:line-chart-line',
        keepAlive: true
      }
    },
    {
      path: 'orders',
      name: 'PlatformOrders',
      component: '/platform/orders',
      meta: {
        title: 'Orders',
        icon: 'ri:list-check-3',
        keepAlive: true
      }
    },
    {
      path: 'audit',
      name: 'PlatformAudit',
      component: '/platform/audit',
      meta: {
        title: 'Audit Log',
        icon: 'ri:file-list-3-line',
        keepAlive: true
      }
    },
    {
      path: 'risk',
      name: 'PlatformRisk',
      component: '/platform/risk',
      meta: {
        title: 'Risk Gates',
        icon: 'ri:shield-check-line',
        keepAlive: true
      }
    }
  ]
}
