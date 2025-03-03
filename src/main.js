import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { handleComponentError } from './utils/errorHandler'
import * as logger from './utils/logger'

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
app.use(createPinia())
// 라우터 설정
app.use(router)

// 앱 마운트
app.mount('#app')
