<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>
        <div class="header-line">
          <span>Markets</span>
          <ElButton type="primary">Sync public markets</ElButton>
        </div>
      </template>
      <ElTable :data="markets" size="large">
        <ElTableColumn prop="question" label="Market" min-width="260" />
        <ElTableColumn prop="source" label="Source" width="140" />
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <ElTag>{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="syncedAt" label="Last sync" width="180" />
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformMarkets' })

  const markets = [
    {
      question: 'Public market sync not connected yet',
      source: 'Gamma/CLOB',
      status: 'Planned',
      syncedAt: '-'
    }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }

  .header-line {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }
</style>
