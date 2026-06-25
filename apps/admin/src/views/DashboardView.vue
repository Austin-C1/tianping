<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">当前基线</span>
        <h2>本地控制闭环</h2>
      </div>
      <AButton :loading="loading" @click="loadOperations">刷新</AButton>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <div class="metric-grid">
      <ACard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </ACard>
    </div>

    <ACard title="Order Router 环境" :bordered="false">
      <ADescriptions bordered :column="1" size="small">
        <ADescriptionsItem v-for="item in environmentItems" :key="item.label" :label="item.label">
          {{ item.value }}
        </ADescriptionsItem>
      </ADescriptions>
    </ACard>

    <ACard title="人工关口" :bordered="false">
      <ATable :columns="gateColumns" :data-source="gateRows" :pagination="false" row-key="key" />
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchAdminEnvironment,
  fetchAdminGates,
  fetchAdminSummary,
  type AdminGate,
  type AdminSummary,
  type OrderRouterEnvironment
} from '@/api/admin'

const loading = ref(false)
const error = ref('')
const summary = ref<AdminSummary | null>(null)
const gates = ref<AdminGate[]>([])
const environment = ref<OrderRouterEnvironment | null>(null)

const metrics = computed(() => [
  {
    label: '注册用户',
    value: summary.value?.registeredUsers ?? '-',
    note: '由 PostgreSQL 支持'
  },
  {
    label: '管理员用户',
    value: summary.value?.adminUsers ?? '-',
    note: '需要管理员角色'
  },
  {
    label: '钱包已连接',
    value: summary.value?.walletsConnected ?? '-',
    note: '第五阶段目标'
  },
  {
    label: '市场已同步',
    value: summary.value?.marketsSynced ?? '-',
    note: '只读市场快照'
  },
  {
    label: 'marketQuotesSynced',
    value: summary.value?.marketQuotesSynced ?? '-',
    note: 'CLOB quote snapshots'
  },
  {
    label: '订单已预览',
    value: summary.value?.ordersPreviewed ?? '-',
    note: '不提交 CLOB'
  },
  {
    label: '待处理风险事件',
    value: summary.value?.openRiskEvents ?? '-',
    note: '限流和风险信号'
  },
  {
    label: '交易模式',
    value: routerModeLabel(environment.value?.mode),
    note: environment.value?.liveTradingEnabled ? '真实 CLOB 提交已启用' : '真实 CLOB 提交已禁用'
  }
])

const environmentItems = computed(() => [
  {
    label: 'ORDER_ROUTER_MODE',
    value: routerModeLabel(environment.value?.mode)
  },
  {
    label: 'POLYMARKET_CLOB_HOST',
    value: environment.value?.clobHost ?? '-'
  },
  {
    label: 'POLYMARKET_CHAIN_ID',
    value: environment.value?.chainId ? String(environment.value.chainId) : '未配置'
  },
  {
    label: 'builderCode',
    value: configuredLabel(environment.value?.builderCodeConfigured)
  },
  {
    label: 'relayer',
    value: configuredLabel(environment.value?.relayerConfigured)
  },
  {
    label: 'RPC',
    value: configuredLabel(environment.value?.rpcConfigured)
  },
  {
    label: 'liveTradingEnabled',
    value: environment.value?.liveTradingEnabled ? '是' : '否'
  }
])

const gateColumns = [
  { title: '关口', dataIndex: 'title', key: 'title' },
  { title: '负责人', dataIndex: 'owner', key: 'owner' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '详情', dataIndex: 'detailsLabel', key: 'detailsLabel' },
  { title: '更新时间', dataIndex: 'updatedAtLabel', key: 'updatedAtLabel' }
]

const gateRows = computed(() =>
  gates.value.map((gate) => ({
    ...gate,
    owner: ownerLabel(gate.owner),
    status: statusLabel(gate.status),
    title: gateTitle(gate.key, gate.title),
    detailsLabel: gate.details ?? '-',
    updatedAtLabel: formatDate(gate.updatedAt)
  }))
)

async function loadOperations() {
  loading.value = true
  error.value = ''
  try {
    const [nextSummary, nextGates, nextEnvironment] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminGates(),
      fetchAdminEnvironment()
    ])
    summary.value = nextSummary
    gates.value = nextGates
    environment.value = nextEnvironment
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载管理员概览失败'
  } finally {
    loading.value = false
  }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '暂无'
}

function configuredLabel(value: boolean | undefined) {
  if (value === undefined) {
    return '-'
  }

  return value ? '已配置' : '未配置'
}

function routerModeLabel(value: OrderRouterEnvironment['mode'] | undefined) {
  const labels: Record<OrderRouterEnvironment['mode'], string> = {
    live: 'live',
    paper: 'paper',
    preview: 'preview'
  }

  return value ? labels[value] : '-'
}

function gateTitle(key: string, fallback: string) {
  const titles: Record<string, string> = {
    'deposit-wallet-readiness': 'Deposit Wallet 准备状态',
    'market-data-sync': '市场数据同步',
    'real-order-confirmation': '真实订单确认',
    'wallet-binding-proof': '钱包绑定证明'
  }

  return titles[key] ?? fallback
}

function ownerLabel(owner: string) {
  const owners: Record<string, string> = {
    Compliance: '合规',
    Engineering: '工程',
    Product: '产品',
    Risk: '风险'
  }

  return owners[owner] ?? owner
}

function statusLabel(status: string) {
  const statuses: Record<string, string> = {
    BLOCKED: '被封锁',
    PENDING: '待处理',
    READY: '就绪'
  }

  return statuses[status] ?? status
}

onMounted(loadOperations)
</script>
