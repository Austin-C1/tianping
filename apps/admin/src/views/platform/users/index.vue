<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>Users</template>
      <ElTable :data="users" size="large">
        <ElTableColumn prop="email" label="Email" min-width="220" />
        <ElTableColumn prop="wallet" label="Wallet" min-width="180" />
        <ElTableColumn prop="risk" label="Risk state" width="160">
          <template #default="{ row }">
            <ElTag :type="row.risk === 'Clear' ? 'success' : 'warning'">{{ row.risk }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="Created" width="180" />
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformUsers' })

  const users = [
    {
      email: 'No users loaded',
      wallet: 'Connect API',
      risk: 'Pending',
      createdAt: '-'
    }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }
</style>
