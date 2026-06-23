<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>
        <div class="header-row">
          <span>Users</span>
          <ElButton :loading="loading" type="primary" @click="loadUsers">Refresh</ElButton>
        </div>
      </template>

      <ElAlert v-if="error" :title="error" class="mb-4" show-icon type="error" />

      <ElTable v-loading="loading" :data="users" empty-text="No users found" size="large">
        <ElTableColumn prop="email" label="Email" min-width="240" />
        <ElTableColumn prop="role" label="Role" width="140">
          <template #default="{ row }">
            <ElTag :type="row.role === 'ADMIN' ? 'danger' : 'info'">{{ row.role }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="Created" width="220">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { fetchAdminUsers } from '@/api/platform'

  defineOptions({ name: 'PlatformUsers' })

  const users = ref<Api.Platform.AdminUser[]>([])
  const loading = ref(false)
  const error = ref('')

  const loadUsers = async () => {
    loading.value = true
    error.value = ''

    try {
      users.value = await fetchAdminUsers()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load users'
    } finally {
      loading.value = false
    }
  }

  const formatDate = (value: string) => new Date(value).toLocaleString()

  onMounted(loadUsers)
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }

  .header-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }
</style>
