<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">后台同步任务</span>
        <h2>运维</h2>
      </div>
      <ASpace>
        <AButton :loading="syncing" type="primary" @click="handleMarketSync">
          排队同步市场
        </AButton>
        <AButton :loading="loading" @click="loadOperations">刷新</AButton>
      </ASpace>
    </div>

    <AAlert v-if="error" :message="error" show-icon type="error" />
    <AAlert
      message="这里只显示后台同步任务记录，不启用真实 CLOB submit，不提交订单，也不移动用户资金。"
      show-icon
      type="warning"
    />

    <div class="metric-grid">
      <ACard v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </ACard>
    </div>

    <ACard title="同步任务" :bordered="false">
      <ATable
        :columns="columns"
        :data-source="jobs"
        :loading="loading"
        :pagination="{ pageSize: 8 }"
        :scroll="{ x: 1120 }"
        row-key="id"
      >
        <template #emptyText>
          暂无同步任务。点击“排队同步市场”创建第一条后台同步记录。
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'id'">
            <span class="mono">{{ record.id }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="statusColor(record.status)">
              {{ statusLabel(record.status) }}
            </ATag>
          </template>
          <template v-else-if="column.key === 'queueJobId'">
            <span class="mono">{{ record.queueJobId || 'none' }}</span>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'startedAt'">
            {{ formatDate(record.startedAt) }}
          </template>
          <template v-else-if="column.key === 'completedAt'">
            {{ formatDate(record.completedAt) }}
          </template>
          <template v-else-if="column.key === 'failureReason'">
            <span :class="{ 'operations-failure': Boolean(record.failureReason) }">
              {{ record.failureReason || 'none' }}
            </span>
          </template>
          <template v-else-if="column.key === 'result'">
            <span class="operations-result-cell">{{ formatJson(record.result) }}</span>
          </template>
        </template>
      </ATable>
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  enqueueMarketSync,
  fetchAdminGates,
  fetchSyncJobs,
  type AdminGate,
  type SyncJobRun
} from '@/api/admin'

const loading = ref(false)
const syncing = ref(false)
const error = ref('')
const jobs = ref<SyncJobRun[]>([])
const gates = ref<AdminGate[]>([])

const columns = [
  { title: '任务 ID', dataIndex: 'id', key: 'id', width: 180 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '队列 Job', dataIndex: 'queueJobId', key: 'queueJobId', width: 160 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 180 },
  { title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', width: 180 },
  { title: '失败原因', dataIndex: 'failureReason', key: 'failureReason', width: 220 },
  { title: '结果', dataIndex: 'result', key: 'result', width: 220 }
]

const latestJob = computed(() => jobs.value[0] ?? null)
const activeJobs = computed(
  () => jobs.value.filter((job) => job.status === 'QUEUED' || job.status === 'RUNNING').length
)
const queueGate = computed(() => gates.value.find((gate) => gate.key === 'queue-sync-readiness'))
const metrics = computed(() => [
  {
    label: '最近任务',
    value: latestJob.value ? statusLabel(latestJob.value.status) : '暂无',
    note: latestJob.value ? `${latestJob.value.type} · ${formatDate(latestJob.value.updatedAt)}` : '等待后台同步记录'
  },
  {
    label: '活跃任务',
    value: activeJobs.value,
    note: 'QUEUED 或 RUNNING'
  },
  {
    label: '队列关口',
    value: queueGate.value ? gateStatusLabel(queueGate.value.status) : '未知',
    note: queueGate.value?.details ?? '来自 Admin gates'
  },
  {
    label: '真实 CLOB submit',
    value: '禁用',
    note: '本页只记录同步状态'
  }
])

async function loadOperations() {
  loading.value = true
  error.value = ''

  try {
    const [nextJobs, nextGates] = await Promise.all([
      fetchSyncJobs(),
      fetchAdminGates()
    ])
    jobs.value = nextJobs
    gates.value = nextGates
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载运维任务失败'
  } finally {
    loading.value = false
  }
}

async function handleMarketSync() {
  syncing.value = true
  error.value = ''

  try {
    const job = await enqueueMarketSync()
    jobs.value = [job, ...jobs.value.filter((existing) => existing.id !== job.id)]
    await loadOperations()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '排队同步市场失败'
  } finally {
    syncing.value = false
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    FAILED: '失败',
    QUEUED: '待处理',
    RUNNING: '运行中',
    SUCCEEDED: '成功'
  }

  return labels[status] ?? status
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    FAILED: 'red',
    QUEUED: 'gold',
    RUNNING: 'blue',
    SUCCEEDED: 'green'
  }

  return colors[status] ?? 'default'
}

function gateStatusLabel(status: string) {
  const labels: Record<string, string> = {
    BLOCKED: '被封锁',
    PENDING: '待处理',
    READY: '就绪'
  }

  return labels[status] ?? status
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '暂无'
}

function formatJson(value: unknown) {
  if (!value) {
    return 'none'
  }

  return JSON.stringify(value)
}

onMounted(loadOperations)
</script>
