<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">数据库用户</span>
        <h2>用户</h2>
      </div>
      <AButton :loading="loading" type="primary" @click="loadUsers">刷新</AButton>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <ACard :bordered="false">
      <ATable
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <ATag :color="record.role === 'ADMIN' ? 'red' : 'blue'">
              {{ record.role === 'ADMIN' ? '管理员' : '用户' }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'walletStatus'">
            <ATag :color="record.walletStatus === 'CONNECTED' ? 'green' : 'default'">
              {{ record.walletStatus === 'CONNECTED' ? '已连接' : '未连接' }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ new Date(record.createdAt).toLocaleString() }}
          </template>
          <template v-else-if="column.key === 'primaryWalletAddress'">
            <span class="mono">{{ record.primaryWalletAddress || '-' }}</span>
          </template>
        </template>
      </ATable>
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminUsers, type ManagedUser } from '@/api/admin'

const loading = ref(false)
const error = ref('')
const users = ref<ManagedUser[]>([])

const columns = [
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', dataIndex: 'role', key: 'role', width: 120 },
  { title: '钱包状态', dataIndex: 'walletStatus', key: 'walletStatus', width: 160 },
  { title: '钱包数', dataIndex: 'walletCount', key: 'walletCount', width: 110 },
  { title: '主钱包', dataIndex: 'primaryWalletAddress', key: 'primaryWalletAddress' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 220 }
]

async function loadUsers() {
  loading.value = true
  error.value = ''

  try {
    users.value = await fetchAdminUsers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载用户失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>
