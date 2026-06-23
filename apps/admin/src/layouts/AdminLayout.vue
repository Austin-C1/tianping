<template>
  <ALayout class="admin-shell">
    <ALayoutSider breakpoint="lg" class="admin-sider" collapsible>
      <RouterLink class="brand" to="/dashboard">
        <span class="brand-mark">P</span>
        <span class="brand-copy">
          <strong>PMX 管理员</strong>
          <small>运营</small>
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
          <span class="eyebrow">管理工作区</span>
          <h1>{{ pageTitle }}</h1>
        </div>

        <ASpace :size="16">
          <ATag color="green">管理员</ATag>
          <span class="user-email">{{ auth.user?.email }}</span>
          <AButton @click="handleSignOut">退出</AButton>
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
  { key: '/dashboard', icon: () => h(DashboardOutlined), label: '仪表盘' },
  { key: '/users', icon: () => h(TeamOutlined), label: '用户' },
  { key: '/markets', icon: () => h(LineChartOutlined), label: '市场' },
  { key: '/orders', icon: () => h(ShoppingCartOutlined), label: '订单' },
  { key: '/audit', icon: () => h(AuditOutlined), label: '审计' },
  { key: '/risk', icon: () => h(SafetyCertificateOutlined), label: '风险' },
  { key: '/settings', icon: () => h(SettingOutlined), label: '设置' }
]

const selectedKey = computed(() => {
  const match = menuItems.find((item) => route.path.startsWith(item.key))
  return match?.key || '/dashboard'
})

const pageTitle = computed(() => String(route.meta.title || '仪表盘'))

function handleMenuClick({ key }: { key: string }) {
  router.push(key)
}

function handleSignOut() {
  auth.clearSession()
  router.replace('/login')
}
</script>
