import axios from 'axios'

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
    // 원래 요청 설정 저장
    const originalRequest = error.config

    // 401 에러(인증 실패)이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // 리프레시 토큰 가져오기
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

        if (!refreshToken) {
          throw new Error('리프레시 토큰이 없습니다.')
        }

        // 토큰 갱신 요청
        const response = await axios.post('http://127.0.0.1:8000/v1/accounts/token/refresh/', {
          refresh: refreshToken
        })

        // 새 액세스 토큰 저장
        const newAccessToken = response.data.access

        // 로그인 유지 설정에 따라 저장소 선택
        if (localStorage.getItem('rememberMe') === 'true') {
          localStorage.setItem('accessToken', newAccessToken)

          // 새 리프레시 토큰이 있는 경우 저장
          if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh)
          }
        } else {
          sessionStorage.setItem('accessToken', newAccessToken)

          // 새 리프레시 토큰이 있는 경우 저장
          if (response.data.refresh) {
            sessionStorage.setItem('refreshToken', response.data.refresh)
          }
        }

        // 갱신된 토큰으로 헤더 업데이트
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        // 원래 요청 재시도
        return api(originalRequest)
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그인 페이지로 이동
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

        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
