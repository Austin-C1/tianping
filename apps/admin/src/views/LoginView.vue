<template>
  <main class="login-screen">
    <section class="login-panel">
      <div class="login-copy">
        <span class="eyebrow">PMX 管理员</span>
        <h1>运营控制台</h1>
        <p>仅管理员可访问用户管理、市场同步、订单预览、审计日志和风险关口。</p>
      </div>

      <AForm layout="vertical" :model="form" @finish="handleSubmit">
        <AAlert v-if="error" class="form-alert" :message="error" show-icon type="error" />

        <AFormItem
          label="邮箱"
          name="email"
          :rules="[{ required: true, message: '请输入邮箱' }]"
        >
          <AInput v-model:value="form.email" autocomplete="username" size="large" />
        </AFormItem>

        <AFormItem
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <AInputPassword
            v-model:value="form.password"
            autocomplete="current-password"
            size="large"
          />
        </AFormItem>

        <AButton block html-type="submit" :loading="loading" size="large" type="primary">
          登录
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
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
