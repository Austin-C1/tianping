<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">订单闭环</span>
        <h2>订单</h2>
      </div>
      <AButton :loading="loading" type="primary" @click="loadOrders">刷新</AButton>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <div class="metric-grid">
      <ACard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </ACard>
    </div>

    <ACard :bordered="false">
      <ATable
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: 1160 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'market'">
            <div class="order-market-cell">
              <strong>{{ record.market?.question || '-' }}</strong>
              <small class="mono">{{ record.market?.marketId || '-' }}</small>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="statusColor(record.status)">
              {{ statusLabel(record.status) }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'price'">
            {{ formatPrice(record.price) }}
          </template>
          <template v-else-if="column.key === 'size'">
            {{ formatSize(record.size) }}
          </template>
          <template v-else-if="column.key === 'clobOrderId'">
            <span class="mono">{{ record.clobOrderId || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'failureReason'">
            {{ record.failureReason || '-' }}
          </template>
          <template v-else-if="column.key === 'submittedAt'">
            {{ formatDate(record.submittedAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDate(record.updatedAt) }}
          </template>
        </template>
      </ATable>
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminOrders, type ManagedOrder } from '@/api/admin'

const loading = ref(false)
const error = ref('')
const orders = ref<ManagedOrder[]>([])

const columns = [
  { title: '市场', dataIndex: 'market', key: 'market', width: 320 },
  { title: '结果', dataIndex: 'outcome', key: 'outcome', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 140 },
  { title: '价格', dataIndex: 'price', key: 'price', width: 100 },
  { title: '数量', dataIndex: 'size', key: 'size', width: 120 },
  { title: 'CLOB/Paper ID', dataIndex: 'clobOrderId', key: 'clobOrderId', width: 220 },
  { title: '失败原因', dataIndex: 'failureReason', key: 'failureReason', width: 220 },
  { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 190 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 190 }
]

const metrics = computed(() => {
  const total = orders.value.length
  const previewed = countStatus('PREVIEWED')
  const signing = countStatus('SIGNING_REQUESTED') + countStatus('SIGNED')
  const submitted = countStatus('SUBMITTED')

  return [
    { label: '总订单', value: total, note: '当前管理员可见订单' },
    { label: '已预览', value: previewed, note: '等待签名 intent' },
    { label: '签名中', value: signing, note: 'SIGNING_REQUESTED / SIGNED' },
    { label: '已提交', value: submitted, note: 'paper 或后续 CLOB 回执' }
  ]
})

async function loadOrders() {
  loading.value = true
  error.value = ''

  try {
    orders.value = await fetchAdminOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载订单失败'
  } finally {
    loading.value = false
  }
}

function countStatus(status: string) {
  return orders.value.filter((order) => order.status === status).length
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    FAILED: '失败',
    PREVIEWED: '已预览',
    SIGNED: '已签名',
    SIGNING_REQUESTED: '待签名',
    SUBMITTED: '已提交',
    SUBMITTING: '提交中'
  }

  return labels[status] ?? status
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    FAILED: 'red',
    PREVIEWED: 'blue',
    SIGNED: 'purple',
    SIGNING_REQUESTED: 'gold',
    SUBMITTED: 'green',
    SUBMITTING: 'cyan'
  }

  return colors[status] ?? 'default'
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formatPrice(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}c` : value
}

function formatSize(value: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2)
}

onMounted(loadOrders)
</script>
