<template>
  <ALayout class="admin-shell">
    <ALayoutSider breakpoint="lg" class="admin-sider" collapsible>
      <RouterLink class="brand" to="/dashboard">
        <span class="brand-mark">P</span>
        <span class="brand-copy">
          <strong>PMX Admin</strong>
          <small>Operations</small>
        </span>
      </RouterLink>

      <AMenu
        class="admin-menu"
        mode="inline"
        theme="dark"
        :items="menuItems"
        :selected-keys="[selectedKey]"
        @click="handleMenuClick"
      />
    </ALayoutSider>

    <ALayout>
      <ALayoutHeader class="admin-header">
        <div>
          <span class="eyebrow">Admin workspace</span>
          <h1>{{ pageTitle }}</h1>
        </div>

        <ASpace :size="16">
          <ATag color="green">ADMIN</ATag>
          <span class="user-email">{{ auth.user?.email }}</span>
          <AButton @click="handleSignOut">Sign out</AButton>
        </ASpace>
      </ALayoutHeader>

      <ALayoutContent class="admin-content">
        <RouterView />
      </ALayoutContent>
    </ALayout>
  </ALayout>
</template>

<script setup lang="ts">
import {
  AuditOutlined,
  DashboardOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined
} from '@ant-design/icons-vue'
import { computed, h } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const menuItems = [
  { key: '/dashboard', icon: () => h(DashboardOutlined), label: 'Dashboard' },
  { key: '/users', icon: () => h(TeamOutlined), label: 'Users' },
  { key: '/markets', icon: () => h(LineChartOutlined), label: 'Markets' },
  { key: '/orders', icon: () => h(ShoppingCartOutlined), label: 'Orders' },
  { key: '/audit', icon: () => h(AuditOutlined), label: 'Audit' },
  { key: '/risk', icon: () => h(SafetyCertificateOutlined), label: 'Risk' },
  { key: '/settings', icon: () => h(SettingOutlined), label: 'Settings' }
]

const selectedKey = computed(() => {
  const match = menuItems.find((item) => route.path.startsWith(item.key))
  return match?.key || '/dashboard'
})

const pageTitle = computed(() => String(route.meta.title || 'Dashboard'))

function handleMenuClick({ key }: { key: string }) {
  router.push(key)
}

function handleSignOut() {
  auth.clearSession()
  router.replace('/auth/login')
}
</script>
