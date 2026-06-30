<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">关键行为留痕</span>
        <h2>审计</h2>
      </div>
      <AButton :loading="loading" type="primary" @click="loadAuditLogs">刷新</AButton>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <ACard :bordered="false">
      <ATable
        :columns="columns"
        :data-source="auditLogs"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 960 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <ATag :color="actionColor(record.action)">
              {{ record.action }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'user'">
            <span class="audit-user-cell">
              <strong>{{ record.userEmail || '-' }}</strong>
              <small class="mono">{{ record.userId || '-' }}</small>
            </span>
          </template>
          <template v-else-if="column.key === 'metadata'">
            <span class="metadata-cell mono">{{ formatMetadata(record.metadata) }}</span>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
        </template>
      </ATable>
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminAuditLogs, type ManagedAuditLog } from '@/api/admin'

const loading = ref(false)
const error = ref('')
const auditLogs = ref<ManagedAuditLog[]>([])

const columns = [
  { title: '操作', dataIndex: 'action', key: 'action', width: 220 },
  { title: '用户', dataIndex: 'userEmail', key: 'user', width: 260 },
  { title: 'Metadata', dataIndex: 'metadata', key: 'metadata' },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 210 }
]

async function loadAuditLogs() {
  loading.value = true
  error.value = ''

  try {
    auditLogs.value = await fetchAdminAuditLogs()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载审计日志失败'
  } finally {
    loading.value = false
  }
}

function actionColor(action: string) {
  if (action.startsWith('auth.')) {
    return 'blue'
  }

  if (action.startsWith('order.')) {
    return 'purple'
  }

  if (action.startsWith('portfolio.')) {
    return 'green'
  }

  return 'default'
}

function formatMetadata(value: unknown) {
  if (value === null || value === undefined) {
    return '-'
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(loadAuditLogs)
</script>
