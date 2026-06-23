import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ACCESS_TOKEN_KEY } from '@/api/http'
import { getCurrentUser, login, type AdminUser } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(window.localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const user = ref<AdminUser | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function setToken(nextToken: string) {
    token.value = nextToken
    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextToken)
  }

  function clearSession() {
    token.value = ''
    user.value = null
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  async function signIn(email: string, password: string) {
    const result = await login({ email, password })
    if (result.user.role !== 'ADMIN') {
      throw new Error('Admin role is required')
    }

    setToken(result.accessToken)
    user.value = result.user
  }

  async function loadCurrentUser() {
    if (!token.value) {
      return null
    }

    const currentUser = await getCurrentUser()
    if (currentUser.role !== 'ADMIN') {
      clearSession()
      throw new Error('Admin role is required')
    }

    user.value = currentUser
    return currentUser
  }

  return {
    clearSession,
    isAdmin,
    isAuthenticated,
    loadCurrentUser,
    signIn,
    token,
    user
  }
})
