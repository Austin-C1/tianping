<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">实时模块状态</span>
        <h2>{{ route.meta.title }}</h2>
      </div>
      <ASpace>
        <AButton v-if="isMarketsPage" :loading="syncing" type="primary" @click="handleMarketSync">
          同步市场
        </AButton>
        <AButton :loading="loading" @click="loadStatus">刷新</AButton>
      </ASpace>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <ACard :bordered="false">
      <p class="placeholder-copy">{{ route.meta.description }}</p>
      <ADescriptions bordered class="status-descriptions" :column="1" size="small">
        <ADescriptionsItem label="API 连接">
          {{ summary ? '已连接' : '加载中' }}
        </ADescriptionsItem>
        <ADescriptionsItem v-for="item in statusItems" :key="item.label" :label="item.label">
          {{ item.value }}
        </ADescriptionsItem>
      </ADescriptions>
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchAdminGates,
  fetchAdminSummary,
  syncMarkets,
  type AdminGate,
  type AdminSummary
} from '@/api/admin'

const route = useRoute()
const loading = ref(false)
const syncing = ref(false)
const error = ref('')
const syncMessage = ref('')
const summary = ref<AdminSummary | null>(null)
const gates = ref<AdminGate[]>([])
const isMarketsPage = computed(() => route.path.startsWith('/markets'))

const statusItems = computed(() => {
  const currentSummary = summary.value
  const path = route.path

  if (!currentSummary) {
    return [{ label: '状态', value: '加载中' }]
  }

  if (path.startsWith('/markets')) {
    return [
      { label: '市场已同步', value: String(currentSummary.marketsSynced) },
      { label: '行情已同步', value: String(currentSummary.marketQuotesSynced) },
      { label: '最近同步', value: syncMessage.value || '点击“同步市场”刷新' },
      { label: '市场关口', value: gateStatus('market-data-sync') },
      { label: '行情关口', value: gateStatus('market-quote-sync') }
    ]
  }

  if (path.startsWith('/orders')) {
    return [
      { label: '订单已预览', value: String(currentSummary.ordersPreviewed) },
      { label: '真实订单关口', value: gateStatus('real-order-confirmation') },
      { label: 'CLOB 提交', value: '已禁用' }
    ]
  }

  if (path.startsWith('/audit')) {
    return [
      { label: '审计来源', value: 'PostgreSQL 中的认证和后台事件' },
      { label: '待处理风险事件', value: String(currentSummary.openRiskEvents) }
    ]
  }

  if (path.startsWith('/risk')) {
    return [
      { label: '待处理风险事件', value: String(currentSummary.openRiskEvents) },
      { label: '真实订单关口', value: gateStatus('real-order-confirmation') }
    ]
  }

  return [
    { label: '交易模式', value: '仅预览' },
    { label: '真实 CLOB 服务商', value: '已禁用' }
  ]
})

async function loadStatus() {
  loading.value = true
  error.value = ''

  try {
    const [nextSummary, nextGates] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminGates()
    ])
    summary.value = nextSummary
    gates.value = nextGates
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载模块状态失败'
  } finally {
    loading.value = false
  }
}

function gateStatus(key: string) {
  return statusLabel(gates.value.find((gate) => gate.key === key)?.status ?? 'PENDING')
}

async function handleMarketSync() {
  syncing.value = true
  error.value = ''
  syncMessage.value = ''

  try {
    const result = await syncMarkets()
    syncMessage.value = result.error
      ? `市场 ${result.synced}/${result.failed}，行情 ${result.quotesSynced}/${result.quotesFailed}：${result.error}`
      : `市场 ${result.synced}/${result.failed}，行情 ${result.quotesSynced}/${result.quotesFailed}`
    await loadStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '同步市场失败'
  } finally {
    syncing.value = false
  }
}

onMounted(loadStatus)

function statusLabel(status: string) {
  const statuses: Record<string, string> = {
    BLOCKED: '被封锁',
    PENDING: '待处理',
    READY: '就绪'
  }

  return statuses[status] ?? status
}
</script>
