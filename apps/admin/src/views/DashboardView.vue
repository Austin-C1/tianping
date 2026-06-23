<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">Current baseline</span>
        <h2>Local control loop</h2>
      </div>
      <AButton :loading="loading" @click="loadUsers">Refresh</AButton>
    </div>

    <div class="metric-grid">
      <ACard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </ACard>
    </div>

    <ACard title="Manual gates" :bordered="false">
      <ATable :columns="gateColumns" :data-source="gates" :pagination="false" row-key="name" />
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminUsers, type ManagedUser } from '@/api/admin'

const loading = ref(false)
const users = ref<ManagedUser[]>([])

const metrics = computed(() => [
  {
    label: 'Registered users',
    value: users.value.length,
    note: 'Backed by PostgreSQL'
  },
  {
    label: 'Admin users',
    value: users.value.filter((user) => user.role === 'ADMIN').length,
    note: 'ADMIN role required'
  },
  {
    label: 'Wallet connected',
    value: users.value.filter((user) => user.walletStatus === 'CONNECTED').length,
    note: 'Stage 5 target'
  },
  {
    label: 'Trading mode',
    value: 'Preview',
    note: 'CLOB submission disabled'
  }
])

const gateColumns = [
  { title: 'Gate', dataIndex: 'name', key: 'name' },
  { title: 'Owner', dataIndex: 'owner', key: 'owner' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
]

const gates = [
  { name: 'Market data sync', owner: 'Engineering', status: 'Pending' },
  { name: 'Wallet binding proof', owner: 'Product', status: 'Pending' },
  { name: 'Deposit Wallet copy', owner: 'Compliance', status: 'Pending' },
  { name: 'Real order confirmation', owner: 'Risk', status: 'Blocked' }
]

async function loadUsers() {
  loading.value = true
  try {
    users.value = await fetchAdminUsers()
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>
