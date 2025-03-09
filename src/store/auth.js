/* eslint-disable no-trailing-spaces */
import { defineStore } from 'pinia'
import api from '../utils/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // 쿠키 기반 인증으로 전환하므로 토큰을 직접 저장하지 않음
    loading: false,
    error: null,
    // 사용자 정보는 필요에 따라 저장
    userId: sessionStorage.getItem('userId') || localStorage.getItem('userId') || null,
    userName: sessionStorage.getItem('userName') || localStorage.getItem('userName') || null,
    accessToken: localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || null
  }),

  actions: {
    // 사용자 정보 설정
    setUserInfo (userData, rememberMe = false) {
      const storage = rememberMe ? localStorage : sessionStorage

      if (userData.user_id) {
        this.userId = userData.user_id
        storage.setItem('userId', userData.user_id)
      }

      if (userData.name) {
        this.userName = userData.name
        storage.setItem('userName', userData.name)
      }

      // 기타 필요한 사용자 정보 저장
      if (userData.isPregnant !== undefined) {
        storage.setItem('isPregnant', userData.isPregnant)
      }
    },

    // 로그아웃 처리
    async logout () {
      try {
        // 서버에 로그아웃 요청
        await api.post('/accounts/logout/')
      } catch (error) {
        console.error('로그아웃 요청 오류:', error)
      } finally {
        // 사용자 정보 초기화
        this.userId = null
        this.userName = null
        this.accessToken = null
        this.refreshToken = null

        // 저장소에서 사용자 정보 제거
        localStorage.removeItem('userId')
        localStorage.removeItem('userName')
        localStorage.removeItem('isPregnant')
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        sessionStorage.removeItem('userId')
        sessionStorage.removeItem('userName')
        sessionStorage.removeItem('isPregnant')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
      }
    },

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

    // 인증 상태 확인
    async checkAuth () {
      this.loading = true
      this.error = null

      try {
        // 토큰 확인
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
        if (!token) {
          this.error = '인증 토큰이 없습니다'
          return false
        }

        // 사용자 정보 확인 API 호출
        const response = await api.get('/accounts/users/me/')
        
        // 사용자 정보가 있으면 인증된 상태로 판단
        this.setUserInfo(response.data)
        return true
      } catch (error) {
        console.error('인증 확인 오류:', error)
        this.error = '인증에 실패했습니다'
        return false
      } finally {
        this.loading = false
      }
    }
  },

  getters: {
    // 인증 여부 확인 - 사용자 ID로 판단
    isAuthenticated: (state) => !!state.userId,

    // 로딩 상태 확인
    isLoading: (state) => state.loading,

    // 에러 메시지 확인
    getError: (state) => state.error
  }
})
