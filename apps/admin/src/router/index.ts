import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layouts/AdminLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import UsersView from '@/views/UsersView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth/login',
    name: 'Login',
    component: LoginView,
    meta: { public: true, title: 'Login' }
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
        meta: { title: 'Dashboard' }
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView,
        meta: { title: 'Users' }
      },
      {
        path: 'markets',
        name: 'Markets',
        component: PlaceholderView,
        meta: {
          title: 'Markets',
          description: 'Read-only Polymarket market sync and status checks.'
        }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: PlaceholderView,
        meta: {
          title: 'Orders',
          description: 'Order previews, CLOB status, and failure review will appear here.'
        }
      },
      {
        path: 'audit',
        name: 'Audit',
        component: PlaceholderView,
        meta: {
          title: 'Audit',
          description: 'Critical auth, wallet, and order actions are tracked before trading opens.'
        }
      },
      {
        path: 'risk',
        name: 'Risk',
        component: PlaceholderView,
        meta: {
          title: 'Risk',
          description: 'Manual gates, region limits, and rate-limit events will be reviewed here.'
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: PlaceholderView,
        meta: {
          title: 'Settings',
          description: 'Operational settings stay read-only until production controls are defined.'
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
    return { path: '/auth/login', query: { redirect: to.fullPath } }
  }

  if (!auth.user) {
    try {
      await auth.loadCurrentUser()
    } catch {
      return { path: '/auth/login', query: { redirect: to.fullPath } }
    }
  }

  document.title = `${String(to.meta.title || 'Admin')} - PMX Admin`
  return true
})
