/* eslint-disable no-trailing-spaces */
import { defineStore } from 'pinia'
import api from '../utils/axios'
import { clearAuthData } from '../utils/auth'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', {
  state: () => {
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    
    return {
      loading: false,
      error: null,
      // 사용자 정보
      userId: rememberMe 
        ? localStorage.getItem('userId') 
        : sessionStorage.getItem('userId') || null,
      userName: rememberMe 
        ? localStorage.getItem('userName') 
        : sessionStorage.getItem('userName') || null,
      // 토큰 정보 - rememberMe 값에 따라 적절한 스토리지에서만 가져옴
      accessToken: rememberMe 
        ? localStorage.getItem('accessToken') 
        : sessionStorage.getItem('accessToken') || null,
      refreshToken: rememberMe 
        ? localStorage.getItem('refreshToken') 
        : sessionStorage.getItem('refreshToken') || null,
      router: null // 라우터 인스턴스를 저장할 상태 추가
    }
  },

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

        // 모든 스토리지에서 명시적으로 토큰 제거
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')

        // auth.js의 clearAuthData 함수를 사용하여 모든 데이터 삭제
        clearAuthData()
        
        // 페이지 새로고침 (선택 사항)
        // window.location.reload()
      }
    },

    // 액세스 토큰 설정
    setAccessToken (token, explicitRememberMe = null) {
      this.accessToken = token
      // explicitRememberMe 값이 전달되면 그 값을 우선 사용하고, 아니면 localStorage에서 확인
      const rememberMe = explicitRememberMe !== null 
        ? explicitRememberMe 
        : localStorage.getItem('rememberMe') === 'true'

      if (rememberMe) {
        localStorage.setItem('accessToken', token)
        // 세션 스토리지에서 제거
        sessionStorage.removeItem('accessToken')
      } else {
        sessionStorage.setItem('accessToken', token)
        // 로컬 스토리지에서 제거
        localStorage.removeItem('accessToken')
      }
    },

    // 리프레시 토큰 설정
    setRefreshToken (token, explicitRememberMe = null) {
      this.refreshToken = token
      // explicitRememberMe 값이 전달되면 그 값을 우선 사용하고, 아니면 localStorage에서 확인
      const rememberMe = explicitRememberMe !== null 
        ? explicitRememberMe 
        : localStorage.getItem('rememberMe') === 'true'

      if (rememberMe) {
        localStorage.setItem('refreshToken', token)
        // 세션 스토리지에서 제거
        sessionStorage.removeItem('refreshToken')
      } else {
        sessionStorage.setItem('refreshToken', token)
        // 로컬 스토리지에서 제거
        localStorage.removeItem('refreshToken')
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
    },

    // 라우터 설정 함수 추가
    setRouter(router) {
      this.router = router
    },

    async login(email, password, rememberMe = false) {
      try {
        const response = await api.post('/accounts/login/', {
          email,
          password
        })

        // 토큰 저장 - 직접 저장하지 않고 메서드 활용
        this.setAccessToken(response.data.access, rememberMe)
        this.setRefreshToken(response.data.refresh, rememberMe)
        
        // rememberMe 상태 저장
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          // 세션에서 제거
          sessionStorage.removeItem('rememberMe')
        } else {
          sessionStorage.setItem('rememberMe', 'false')
          // 로컬에서 제거
          localStorage.removeItem('rememberMe')
        }

        // 다시 보지 않기 상태 확인
        const onboardingCompleted = 
          localStorage.getItem('onboardingCompleted') === 'true' || 
          sessionStorage.getItem('onboardingCompleted') === 'true'

        if (!onboardingCompleted) {
          // 온보딩을 완료하지 않은 경우 온보딩 페이지로 이동
          console.log('온보딩 페이지로 이동합니다.')
          if (!this.router) {
            // 라우터가 없는 경우 URL 직접 변경
            window.location.href = '/onboarding'
            return false
          }
          await this.router.push('/onboarding')
          return true
        }

        // 임신 정보 확인
        try {
          const pregnancyResponse = await api.get('/accounts/pregnancies/')
          const hasPregnancyInfo = pregnancyResponse.data && 
                                  pregnancyResponse.data.length > 0 && 
                                  pregnancyResponse.data[0].is_active
          
          if (!hasPregnancyInfo) {
            // 임신 정보가 없는 경우 임신 정보 등록 페이지로 이동
            console.log('임신 정보 등록 페이지로 이동')
            if (!this.router) {
              window.location.href = '/pregnancy-info-register'
              return false
            }
            await this.router.push('/pregnancy-info-register')
          } else {
            // 모든 정보가 있는 경우 온보딩 상태에 따라 이동
            console.log('온보딩 상태에 따라 이동')
            // 이미 온보딩이 완료된 경우에만 캘린더로 이동
            const onboardingCompleted = 
              localStorage.getItem('onboardingCompleted') === 'true' || 
              sessionStorage.getItem('onboardingCompleted') === 'true'
            
            if (onboardingCompleted) {
              console.log('온보딩이 완료되어 캘린더로 이동')
              if (!this.router) {
                window.location.href = '/calendar'
                return false
              }
              await this.router.push('/calendar')
            } else {
              console.log('온보딩으로 이동')
              if (!this.router) {
                window.location.href = '/onboarding'
                return false
              }
              await this.router.push('/onboarding')
            }
          }
        } catch (error) {
          console.error('임신 정보 조회 오류:', error)
          // 임신 정보 조회 실패 시 임신 정보 등록 페이지로 이동
          if (!this.router) {
            window.location.href = '/pregnancy-info-register'
            return false
          }
          await this.router.push('/pregnancy-info-register')
        }

        return true
      } catch (error) {
        console.error('로그인 오류:', error)
        throw error
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
