import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuditView from '@/views/AuditView.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import OrdersView from '@/views/OrdersView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import RiskView from '@/views/RiskView.vue'
import UsersView from '@/views/UsersView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    alias: '/auth/login',
    component: LoginView,
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { title: '仪表盘' }
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView,
        meta: { title: '用户' }
      },
      {
        path: 'markets',
        name: 'Markets',
        component: PlaceholderView,
        meta: {
          title: '市场',
          description: '只读 Polymarket 市场同步和状态检查。'
        }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: OrdersView,
        meta: { title: '订单' }
      },
      {
        path: 'audit',
        name: 'Audit',
        component: AuditView,
        meta: { title: '审计' }
      },
      {
        path: 'risk',
        name: 'Risk',
        component: RiskView,
        meta: { title: '风险' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: PlaceholderView,
        meta: {
          title: '设置',
          description: '生产控制规则定义前，运营设置保持只读。'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const isPublic = Boolean(to.meta.public)

  if (isPublic) {
    if (auth.isAuthenticated && !auth.user) {
      try {
        await auth.loadCurrentUser()
      } catch {
        auth.clearSession()
      }
    }

    return auth.isAdmin ? { path: '/dashboard' } : true
  }

  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (!auth.user) {
    try {
      await auth.loadCurrentUser()
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  document.title = `${String(to.meta.title || '管理员')} - PMX 管理员`
  return true
})
