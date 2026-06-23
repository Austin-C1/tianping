<template>
  <section class="page-stack">
    <div class="toolbar">
      <div>
        <span class="eyebrow">Planned module</span>
        <h2>{{ route.meta.title }}</h2>
      </div>
    </div>

    <ACard :bordered="false">
      <p class="placeholder-copy">{{ route.meta.description }}</p>
      <AEmpty description="No data wired yet" />
    </ACard>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
