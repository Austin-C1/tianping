<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>Orders</template>
      <ElAlert
        title="Real order submission is disabled until manual Gate G4 is approved."
        type="warning"
        :closable="false"
        show-icon
      />
      <ElTable :data="orders" size="large" class="table-gap">
        <ElTableColumn prop="orderId" label="Order" width="160" />
        <ElTableColumn prop="market" label="Market" min-width="260" />
        <ElTableColumn prop="status" label="Status" width="160" />
        <ElTableColumn prop="submittedAt" label="Submitted" width="180" />
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformOrders' })

  const orders = [
    {
      orderId: '-',
      market: 'No CLOB orders routed yet',
      status: 'Disabled',
      submittedAt: '-'
    }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }

  .table-gap {
    margin-top: 16px;
  }
</style>
