<template>
  <main class="login-screen">
    <section class="login-panel">
      <div class="login-copy">
        <span class="eyebrow">PMX Admin</span>
        <h1>Operations console</h1>
        <p>Admin-only access for users, market sync, order previews, audit logs, and risk gates.</p>
      </div>

      <AForm layout="vertical" :model="form" @finish="handleSubmit">
        <AAlert v-if="error" class="form-alert" :message="error" show-icon type="error" />

        <AFormItem
          label="Email"
          name="email"
          :rules="[{ required: true, message: 'Email is required' }]"
        >
          <AInput v-model:value="form.email" autocomplete="username" size="large" />
        </AFormItem>

        <AFormItem
          label="Password"
          name="password"
          :rules="[{ required: true, message: 'Password is required' }]"
        >
          <AInputPassword
            v-model:value="form.password"
            autocomplete="current-password"
            size="large"
          />
        </AFormItem>

        <AButton block html-type="submit" :loading="loading" size="large" type="primary">
          Sign in
        </AButton>
      </AForm>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const error = ref('')
const form = reactive({
  email: 'admin@pmx.local',
  password: 'change-me-123'
})

async function handleSubmit() {
  loading.value = true
  error.value = ''

  try {
    await auth.signIn(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.replace(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
