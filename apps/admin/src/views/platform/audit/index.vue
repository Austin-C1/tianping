<template>
  <div class="pmx-page">
    <ElCard shadow="never">
      <template #header>Audit log</template>
      <ElTimeline>
        <ElTimelineItem
          v-for="item in items"
          :key="item.action"
          :timestamp="item.timestamp"
          placement="top"
        >
          <strong>{{ item.action }}</strong>
          <p>{{ item.detail }}</p>
        </ElTimelineItem>
      </ElTimeline>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'PlatformAudit' })

  const items = [
    {
      action: 'auth.register',
      detail: 'Captured by NestJS audit log after user registration.',
      timestamp: 'Stage 2'
    },
    {
      action: 'auth.login',
      detail: 'Captured by NestJS audit log after successful login.',
      timestamp: 'Stage 2'
    }
  ]
</script>

<style scoped>
  .pmx-page {
    display: grid;
    gap: 16px;
  }

  p {
    color: var(--el-text-color-secondary);
    margin: 6px 0 0;
  }
</style>
