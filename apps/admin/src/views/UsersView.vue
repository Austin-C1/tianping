<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">Database users</span>
        <h2>Users</h2>
      </div>
      <AButton :loading="loading" type="primary" @click="loadUsers">Refresh</AButton>
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
            <ATag :color="record.role === 'ADMIN' ? 'red' : 'blue'">{{ record.role }}</ATag>
          </template>
          <template v-else-if="column.key === 'walletStatus'">
            <ATag :color="record.walletStatus === 'CONNECTED' ? 'green' : 'default'">
              {{ record.walletStatus === 'CONNECTED' ? 'Connected' : 'Not connected' }}
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
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', dataIndex: 'role', key: 'role', width: 120 },
  { title: 'Wallet status', dataIndex: 'walletStatus', key: 'walletStatus', width: 160 },
  { title: 'Wallets', dataIndex: 'walletCount', key: 'walletCount', width: 110 },
  { title: 'Primary wallet', dataIndex: 'primaryWalletAddress', key: 'primaryWalletAddress' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 220 }
]

async function loadUsers() {
  loading.value = true
  error.value = ''

  try {
    users.value = await fetchAdminUsers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>
