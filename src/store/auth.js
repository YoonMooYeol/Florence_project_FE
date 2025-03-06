import { defineStore } from 'pinia'
import api from '../utils/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || null,
    loading: false,
    error: null
  }),

  actions: {
    // 액세스 토큰 설정
    setAccessToken (token) {
      this.accessToken = token

      // 로그인 유지 설정에 따라 저장소 선택
      if (localStorage.getItem('rememberMe') === 'true') {
        localStorage.setItem('accessToken', token)
      } else {
        sessionStorage.setItem('accessToken', token)
      }
    },

    // 리프레시 토큰 설정
    setRefreshToken (token) {
      this.refreshToken = token

      // 로그인 유지 설정에 따라 저장소 선택
      if (localStorage.getItem('rememberMe') === 'true') {
        localStorage.setItem('refreshToken', token)
      } else {
        sessionStorage.setItem('refreshToken', token)
      }
    },

    // 리프레시 토큰으로 액세스 토큰 갱신
    async refreshAccessToken () {
      this.loading = true
      this.error = null

      try {
        // 리프레시 토큰이 없으면 에러 발생
        if (!this.refreshToken) {
          throw new Error('리프레시 토큰이 없습니다. 다시 로그인해주세요.')
        }

        const response = await api.post('/accounts/token/refresh/', {
          refresh: this.refreshToken
        })

        // 새로운 액세스 토큰 저장
        this.setAccessToken(response.data.access)

        // 새로운 리프레시 토큰이 있는 경우 저장
        if (response.data.refresh) {
          this.setRefreshToken(response.data.refresh)
        }

        return response.data.access
      } catch (error) {
        this.error = error.response?.data?.detail || '토큰 갱신에 실패했습니다. 다시 로그인해주세요.'
        this.logout() // 토큰 갱신 실패 시 로그아웃 처리
        throw error
      } finally {
        this.loading = false
      }
    },

    // 로그아웃 처리
    logout () {
      this.accessToken = null
      this.refreshToken = null

      // 로컬 스토리지와 세션 스토리지에서 토큰 제거
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')

      // 사용자 정보도 함께 제거
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
      localStorage.removeItem('userId')
      localStorage.removeItem('isPregnant')
      sessionStorage.removeItem('userEmail')
      sessionStorage.removeItem('userName')
      sessionStorage.removeItem('userId')
      sessionStorage.removeItem('isPregnant')
    },

    // 액세스 토큰 유효성 검사 (간단한 형식 검사)
    isAccessTokenValid () {
      if (!this.accessToken) return false

      try {
        // JWT 토큰 구조 검사 (헤더.페이로드.서명)
        const tokenParts = this.accessToken.split('.')
        if (tokenParts.length !== 3) return false

        // 페이로드 디코딩
        const payload = JSON.parse(atob(tokenParts[1]))

        // 만료 시간 확인
        const expirationTime = payload.exp * 1000 // 초를 밀리초로 변환
        const currentTime = Date.now()

        return expirationTime > currentTime
      } catch (error) {
        return false
      }
    },

    // API 요청 시 사용할 인증 헤더 반환
    getAuthHeader () {
      return {
        Authorization: `Bearer ${this.accessToken}`
      }
    }
  },

  getters: {
    // 인증 여부 확인
    isAuthenticated: (state) => !!state.accessToken,

    // 로딩 상태 확인
    isLoading: (state) => state.loading,

    // 에러 메시지 확인
    getError: (state) => state.error
  }
})
