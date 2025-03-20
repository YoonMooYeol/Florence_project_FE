import { defineStore } from 'pinia'
import api from '@/utils/axios'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false,
    error: null
  }),

  actions: {
    async register (userData) {
      this.loading = true
      this.error = null

      try {
        const response = await api.post('/accounts/register/', userData)
        this.user = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data || '회원가입 중 오류가 발생했습니다.'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError () {
      this.error = null
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.user,
    getUser: (state) => state.user
  }
})
