import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { handleComponentError } from './utils/errorHandler'
import * as logger from './utils/logger'
import { useAuthStore } from './store/auth'

// Tailwind CSS 적용
import 'tailwindcss/tailwind.css'

// 앱 인스턴스 생성
const app = createApp(App)

// 전역 에러 핸들러 설정
app.config.errorHandler = handleComponentError

// 개발 환경일 때만 로깅 워닝과 에러 가로채기
if (process.env.NODE_ENV !== 'production') {
  // 경고 처리
  app.config.warnHandler = (msg, instance, trace) => {
    logger.warn('Vue Warning', msg, trace)
  }

  // 전역 에러 캐치
  window.addEventListener('error', (event) => {
    logger.error('Global Error', event.message, event.filename, event.lineno, event.error)
  })

  // Promise 에러 캐치
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', event.reason)
  })
}

// 스토어 설정
const pinia = createPinia()
app.use(pinia)

// auth store 초기화 및 라우터 주입
const authStore = useAuthStore()
authStore.setRouter(router)

// 라우터 설정
app.use(router)

// 앱 마운트
app.mount('#app')

// 초기 라우팅 처리
const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
if (token) {
  const currentRoute = router.currentRoute.value.path
  const onboardingCompleted = 
    localStorage.getItem('onboardingCompleted') === 'true' || 
    sessionStorage.getItem('onboardingCompleted') === 'true'
  
  // 온보딩 페이지가 아니고, 온보딩이 완료되지 않았을 때만 리디렉션
  if (!onboardingCompleted && currentRoute !== '/onboarding') {
    console.log('온보딩이 완료되지 않았습니다. 온보딩 페이지로 이동합니다.')
    // 페이지 로드 후 라우팅을 위해 setTimeout 사용
    setTimeout(() => {
      router.push('/onboarding')
    }, 100)
  }
}
