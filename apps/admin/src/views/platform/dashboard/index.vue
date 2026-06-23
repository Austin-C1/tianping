<template>
  <div class="pmx-page">
    <section class="pmx-hero">
      <div>
        <p class="eyebrow">PMX Admin</p>
        <h1>Polymarket operations control center</h1>
        <p class="summary">
          Monitor account readiness, market sync, order routing, audit coverage, and the
          manual gates that must be approved before real trading.
        </p>
      </div>
      <ElTag type="warning" effect="dark">Stage 3 planning</ElTag>
    </section>

    <ElRow :gutter="16">
      <ElCol v-for="metric in metrics" :key="metric.label" :xs="24" :sm="12" :lg="6">
        <ElCard shadow="never" class="metric-card">
          <p>{{ metric.label }}</p>
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.note }}</span>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :xs="24" :lg="14">
        <ElCard shadow="never">
          <template #header>Manual gates</template>
          <ElTable :data="gates" size="large">
            <ElTableColumn prop="gate" label="Gate" min-width="180" />
            <ElTableColumn prop="owner" label="Owner" width="160" />
            <ElTableColumn prop="status" label="Status" width="140">
              <template #default="{ row }">
                <ElTag :type="row.status === 'Approved' ? 'success' : 'warning'">
                  {{ row.status }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard shadow="never">
          <template #header>Queue status</template>
          <div class="queue-list">
            <div v-for="queue in queues" :key="queue.name">
              <span>{{ queue.name }}</span>
              <ElProgress :percentage="queue.health" :stroke-width="10" />
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformDashboard' })

  const metrics = [
    { label: 'Registered users', value: '0', note: 'Real data after API integration' },
    { label: 'Tracked markets', value: '0', note: 'Stage 3 connects Gamma/CLOB reads' },
    { label: 'Open orders', value: '0', note: 'Trading disabled before Gate G4' },
    { label: 'Audit events', value: '2+', note: 'Register and login events enabled' }
  ]

  const gates = [
    { gate: 'Relayer / CLOB / Builder permissions', owner: 'Founder', status: 'Pending' },
    { gate: 'Deposit Wallet creation copy', owner: 'Compliance', status: 'Pending' },
    { gate: 'Real order confirmation modal', owner: 'Product', status: 'Pending' },
    { gate: 'Small real trade test scope', owner: 'Ops', status: 'Pending' }
  ]

  const queues = [
    { name: 'market-sync', health: 0 },
    { name: 'order-status-sync', health: 0 },
    { name: 'trade-sync', health: 0 },
    { name: 'audit-log', health: 0 }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }

  .pmx-hero {
    align-items: flex-start;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 14px;
    display: flex;
    justify-content: space-between;
    padding: 24px;
  }

  .eyebrow {
    color: var(--el-color-primary);
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  h1 {
    font-size: 28px;
    line-height: 1.2;
    margin: 0;
  }

  .summary {
    color: var(--el-text-color-secondary);
    margin: 12px 0 0;
    max-width: 760px;
  }

  .metric-card p,
  .metric-card span {
    color: var(--el-text-color-secondary);
    margin: 0;
  }

  .metric-card strong {
    display: block;
    font-size: 30px;
    margin: 10px 0;
  }

  .section-row {
    row-gap: 16px;
  }

  .queue-list {
    display: grid;
    gap: 18px;
  }

  .queue-list span {
    display: block;
    font-weight: 700;
    margin-bottom: 8px;
  }
</style>
