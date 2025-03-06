import axios from 'axios'
import router from '../router'

// axios 인스턴스 생성
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 요청 인터셉터 설정
api.interceptors.request.use(
  (config) => {
    // 로컬 스토리지 또는 세션 스토리지에서 직접 토큰 가져오기
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')

    // 액세스 토큰이 있으면 헤더에 추가
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터 설정
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 401 에러(인증 실패)이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

        if (!refreshToken) {
          // 리프레시 토큰이 없으면 로그인 페이지로 이동
          clearAuthData()
          router.push('/login')
          return Promise.reject(error)
        }

        // 토큰 갱신 요청
        const response = await axios.post('http://127.0.0.1:8000/v1/accounts/token/refresh/', {
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
        clearAuthData()
        router.push('/login')
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// 인증 데이터 초기화 함수
const clearAuthData = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userName')
  localStorage.removeItem('userId')
  localStorage.removeItem('isPregnant')
  sessionStorage.removeItem('userEmail')
  sessionStorage.removeItem('userName')
  sessionStorage.removeItem('userId')
  sessionStorage.removeItem('isPregnant')
}

export default api
