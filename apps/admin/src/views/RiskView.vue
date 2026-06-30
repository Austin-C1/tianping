<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">真实交易前置关口</span>
        <h2>风险</h2>
      </div>
      <AButton :loading="loading" type="primary" @click="loadRiskReport">刷新</AButton>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />

    <div class="metric-grid">
      <ACard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </ACard>
    </div>

    <ACard title="手动实盘批准" :bordered="false">
      <div class="approval-panel">
        <div class="approval-main">
          <div class="approval-status-row">
            <ATag :color="liveApproval?.status === 'APPROVED' ? 'green' : 'red'">
              {{ liveApprovalStatusLabel }}
            </ATag>
            <span>这里只记录人工批准状态，不启用真实 CLOB submit。</span>
          </div>

          <div class="approval-detail-grid">
            <span>批准原因</span>
            <strong>{{ latestApproval?.approvalReason || '暂无' }}</strong>
            <span>批准人</span>
            <strong>{{ operatorLabel(latestApproval?.approvedByEmail, latestApproval?.approvedById) }}</strong>
            <span>批准时间</span>
            <strong>{{ formatDate(latestApproval?.approvedAt) }}</strong>
            <span>撤销信息</span>
            <strong>{{ revokeSummary }}</strong>
          </div>
        </div>

        <div class="approval-actions">
          <AInput
            v-model:value="approvalReason"
            :disabled="Boolean(approvalAction)"
            placeholder="填写批准或撤销原因"
          />
          <div class="approval-buttons">
            <AButton
              :disabled="!canApprove"
              :loading="approvalAction === 'approve'"
              type="primary"
              @click="handleApprove"
            >
              批准实盘准备
            </AButton>
            <AButton
              danger
              :disabled="!canRevoke"
              :loading="approvalAction === 'revoke'"
              @click="handleRevoke"
            >
              撤销批准
            </AButton>
          </div>
          <small>批准不会提交订单，也不会打开真实 CLOB submit。撤销后仍不会触发真实 CLOB submit。</small>
        </div>
      </div>
    </ACard>

    <ACard title="风险关口" :bordered="false">
      <ATable
        :columns="columns"
        :data-source="report?.gates || []"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 980 }"
        row-key="key"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <span class="risk-gate-cell">
              <strong>{{ gateTitle(record.key, record.title) }}</strong>
              <small>{{ categoryLabel(record.category) }} · {{ record.description }}</small>
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="statusColor(record.status)">
              {{ statusLabel(record.status) }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'severity'">
            <ATag :color="severityColor(record.severity)">
              {{ severityLabel(record.severity) }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'blocking'">
            {{ record.blocking ? '阻断' : '提示' }}
          </template>
          <template v-else-if="column.key === 'evidence'">
            <span class="risk-evidence">{{ record.evidence }}</span>
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
import {
  approveLiveTrading,
  fetchLiveApproval,
  fetchRiskGateReport,
  revokeLiveTrading,
  type LiveApprovalStatus,
  type RiskGateReport
} from '@/api/admin'

const loading = ref(false)
const error = ref('')
const report = ref<RiskGateReport | null>(null)
const liveApproval = ref<LiveApprovalStatus | null>(null)
const approvalReason = ref('')
const approvalAction = ref<'approve' | 'revoke' | ''>('')

const columns = [
  { title: '关口', dataIndex: 'title', key: 'title', width: 300 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '严重度', dataIndex: 'severity', key: 'severity', width: 120 },
  { title: '类型', dataIndex: 'blocking', key: 'blocking', width: 100 },
  { title: '依据', dataIndex: 'evidence', key: 'evidence' },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 190 }
]

const metrics = computed(() => [
  {
    label: '真实交易状态',
    value: report.value?.canSubmitLiveOrders ? '可提交真实订单' : '不可提交真实订单',
    note: report.value?.liveTradingEnabled ? 'live 环境已配置' : 'live 环境未启用'
  },
  {
    label: '阻断关口',
    value: report.value?.blockingCount ?? '-',
    note: '必须为 0 才能进入真实提交'
  },
  {
    label: '待 review 提示',
    value: report.value?.warningCount ?? '-',
    note: '不直接开放实盘'
  },
  {
    label: 'ORDER_ROUTER_MODE',
    value: report.value?.mode ?? '-',
    note: report.value ? `生成时间 ${formatDate(report.value.generatedAt)}` : '等待 API'
  }
])

const latestApproval = computed(() => liveApproval.value?.latestApproval ?? null)
const liveApprovalStatusLabel = computed(() =>
  liveApproval.value?.status === 'APPROVED' ? '已批准' : '未批准'
)
const reasonReady = computed(() => approvalReason.value.trim().length >= 3)
const canApprove = computed(
  () => liveApproval.value?.status !== 'APPROVED' && reasonReady.value && !approvalAction.value
)
const canRevoke = computed(
  () => liveApproval.value?.status === 'APPROVED' && reasonReady.value && !approvalAction.value
)
const revokeSummary = computed(() => {
  const approval = latestApproval.value
  if (!approval?.revokedAt) {
    return '暂无'
  }

  return `${operatorLabel(approval.revokedByEmail, approval.revokedById)} · ${approval.revokeReason || '未填写原因'} · ${formatDate(approval.revokedAt)}`
})

async function loadRiskReport() {
  loading.value = true
  error.value = ''

  try {
    const [riskReport, approval] = await Promise.all([
      fetchRiskGateReport(),
      fetchLiveApproval()
    ])
    report.value = riskReport
    liveApproval.value = approval
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载风险关口失败'
  } finally {
    loading.value = false
  }
}

async function handleApprove() {
  await mutateLiveApproval('approve', () =>
    approveLiveTrading({ reason: approvalReason.value.trim() })
  )
}

async function handleRevoke() {
  await mutateLiveApproval('revoke', () =>
    revokeLiveTrading({ reason: approvalReason.value.trim() })
  )
}

async function mutateLiveApproval(
  action: 'approve' | 'revoke',
  request: () => Promise<LiveApprovalStatus>
) {
  approvalAction.value = action
  error.value = ''

  try {
    liveApproval.value = await request()
    approvalReason.value = ''
    await loadRiskReport()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新手动实盘批准失败'
  } finally {
    approvalAction.value = ''
  }
}

function gateTitle(key: string, fallback: string) {
  const titles: Record<string, string> = {
    'audit-trail': '审计留痕',
    'deposit-wallet-readiness': 'Deposit Wallet 准备状态',
    'funding-readiness': '资金与授权准备状态',
    'manual-live-approval': '手动实盘批准',
    'market-data-sync': '市场数据同步',
    'market-quote-sync': '市场行情同步',
    'order-router-safe-mode': 'Order Router 安全模式',
    'queue-sync-readiness': '队列同步准备状态',
    'risk-event-review': '风险事件 review',
    'wallet-binding-proof': '钱包绑定证明'
  }

  return titles[key] ?? fallback
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    compliance: '合规',
    environment: '环境',
    market: '市场',
    risk: '风险',
    wallet: '钱包'
  }

  return labels[category] ?? category
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    BLOCKED: '被封锁',
    PENDING: '待处理',
    READY: '就绪'
  }

  return labels[status] ?? status
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    BLOCKED: 'red',
    PENDING: 'gold',
    READY: 'green'
  }

  return colors[status] ?? 'default'
}

function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    CRITICAL: '严重',
    INFO: '信息',
    WARNING: '警告'
  }

  return labels[severity] ?? severity
}

function severityColor(severity: string) {
  const colors: Record<string, string> = {
    CRITICAL: 'red',
    INFO: 'blue',
    WARNING: 'orange'
  }

  return colors[severity] ?? 'default'
}

function operatorLabel(email?: string | null, id?: string | null) {
  return email || id || '暂无'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '暂无'
}

onMounted(loadRiskReport)
</script>
