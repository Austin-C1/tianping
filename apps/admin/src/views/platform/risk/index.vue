<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>Risk and compliance gates</template>
      <ElTable :data="gates" size="large">
        <ElTableColumn prop="name" label="Gate" min-width="260" />
        <ElTableColumn prop="requiredBefore" label="Required before" min-width="220" />
        <ElTableColumn prop="status" label="Status" width="140">
          <template #default="{ row }">
            <ElTag type="warning">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformRisk' })

  const gates = [
    {
      name: 'Geoblock rules',
      requiredBefore: 'Deposit guide and order preview',
      status: 'Pending'
    },
    {
      name: 'Risk copy review',
      requiredBefore: 'Public trading UI',
      status: 'Pending'
    },
    {
      name: 'Real order confirmation',
      requiredBefore: 'CLOB submission',
      status: 'Pending'
    }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }
</style>
