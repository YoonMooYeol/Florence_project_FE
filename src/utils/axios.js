import axios from 'axios'
import router from '../router'
import { clearAuthData as clearAuth } from './auth'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 쿠키를 포함하여 요청을 보냄
})

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    console.log('=== API 요청 인터셉터 시작 ===')
    // 로컬 스토리지 또는 세션 스토리지에서 직접 토큰 가져오기
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')

    console.log('요청 인터셉터 - 경로:', config.url)
    console.log('요청 인터셉터 - 메서드:', config.method.toUpperCase())
    
    // DELETE 요청에 대한 특별한 로깅
    if (config.method.toLowerCase() === 'delete') {
      console.log('⚠️ 삭제 요청 감지:', config.url)
      console.log('삭제 요청 세부 정보:', {
        url: config.url,
        headers: config.headers,
        params: config.params,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log('Local Storage Token:', localStorage.getItem('accessToken') ? '있음' : '없음')
    console.log('Session Storage Token:', sessionStorage.getItem('accessToken') ? '있음' : '없음')

    // 액세스 토큰이 있으면 헤더에 추가
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
      console.log('인증 헤더 추가됨:', `Bearer ${accessToken.substring(0, 10)}...`)

      // JWT 만료 시간 확인 (토큰 디코딩)
      try {
        const tokenData = JSON.parse(atob(accessToken.split('.')[1]))
        const expTime = tokenData.exp
        const currentTime = Math.floor(Date.now() / 1000)
        const timeLeft = expTime - currentTime

        console.log(`토큰 만료까지 남은 시간: ${timeLeft}초 (${Math.floor(timeLeft / 60)}분)`)

        if (timeLeft < 300) { // 5분 이내로 만료되면 경고
          console.warn('⚠️ 토큰이 곧 만료됩니다! 갱신이 필요할 수 있습니다.')
        }
      } catch (err) {
        console.error('토큰 디코딩 오류:', err)
      }
    } else {
      console.log('인증 토큰 없음 - 인증되지 않은 요청을 보냅니다')
    }

    console.log('=== API 요청 인터셉터 종료 ===')
    return config
  },
  (error) => {
    console.error('API 요청 인터셉터 오류:', error)
    return Promise.reject(error)
  }
)

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    // 성공 응답 로깅
    const method = response.config.method.toUpperCase()
    const url = response.config.url
    const status = response.status
    
    console.log(`=== API 응답 수신 [${status}] ${method} ${url} ===`)
    
    // DELETE 요청에 대한 특별한 로깅
    if (method === 'DELETE') {
      console.log('✅ 삭제 요청 성공:', {
        url: url,
        status: status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      })
    }
    
    return response
  },
  async (error) => {
    // 오류 응답 로깅
    console.error('=== API 응답 오류 ===')
    
    if (error.config) {
      const method = error.config.method.toUpperCase()
      const url = error.config.url
      console.error(`요청 정보: ${method} ${url}`)
      
      // DELETE 요청에 대한 특별한 로깅
      if (method === 'DELETE') {
        console.error('❌ 삭제 요청 실패:', {
          url: url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    if (error.response) {
      console.error('응답 상태:', error.response.status)
      console.error('응답 데이터:', error.response.data)
    } else {
      console.error('네트워크 오류 또는 요청 취소됨')
    }

    const originalRequest = error.config

    // 401 에러(인증 실패)이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

        if (!refreshToken) {
          // 리프레시 토큰이 없으면 로그인 페이지로 이동
          clearAuth()
          router.push('/login')
          return Promise.reject(error)
        }

        // 토큰 갱신 요청
        const response = await api.post('/accounts/token/refresh/', {
          refresh: refreshToken
        })

        const newAccessToken = response.data.access
        const rememberMe = localStorage.getItem('rememberMe') === 'true'

        // 새 토큰 저장
        if (rememberMe) {
          localStorage.setItem('accessToken', newAccessToken)
          if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh)
          }
        } else {
          sessionStorage.setItem('accessToken', newAccessToken)
          if (response.data.refresh) {
            sessionStorage.setItem('refreshToken', response.data.refresh)
          }
        }

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그아웃 처리
        clearAuth()
        router.push('/login')
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// 인증 상태 확인 함수
const isAuthenticated = () => {
  // 쿠키 기반 인증에서는 사용자 정보의 존재 여부로 확인
  return !!(localStorage.getItem('userId') || sessionStorage.getItem('userId'))
}

export default api
export { clearAuth as clearAuthData, isAuthenticated }
