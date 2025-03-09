<!-- eslint-disable brace-style -->
<!-- eslint-disable brace-style -->
<template>
  <div class="social-callback">
    <div
      v-if="loading"
      class="loading"
    >
      <p>{{ getPlatformName() }} 로그인 처리 중...</p>
    </div>
    <div
      v-if="error"
      class="error"
    >
      <p>로그인 중 오류가 발생했습니다: {{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(null)

// URL 경로에서 소셜 제공자 추출 (/auth/callback/google, /auth/callback/naver, 등)
const socialProvider = route.path.split('/').pop()

// 에러 처리 함수
const handleError = (errorMessage) => {
  console.error('소셜 로그인 오류:', errorMessage)
  error.value = errorMessage
  loading.value = false
  alert(`로그인 중 오류가 발생했습니다: ${errorMessage}`)

  // 3초 후 로그인 페이지로 리다이렉트
  setTimeout(() => {
    router.push('/login')
  }, 3000)
}

onMounted(async () => {
  try {
    // URL에서 error 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')

    if (errorParam) {
      return handleError(errorParam)
    }

    // URL에서 토큰과 사용자 정보 추출
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const tokenInfo = urlParams.get('token_info')

    if (!code && !tokenInfo) {
      return handleError('인증 코드가 없습니다')
    }

    console.log(`${getPlatformName()} 로그인 처리 중...`, { code, state, tokenInfo })

    // 백엔드로부터 전달받은 토큰 정보 처리
    if (tokenInfo) {
      try {
        const decodedTokenInfo = JSON.parse(decodeURIComponent(tokenInfo))
        console.log('디코딩된 토큰 정보:', decodedTokenInfo)

        // 토큰 저장
        localStorage.setItem('access_token', decodedTokenInfo.access_token)
        localStorage.setItem('refresh_token', decodedTokenInfo.refresh_token)

        if (decodedTokenInfo.user) {
          // 사용자 정보 저장
          authStore.setUser(decodedTokenInfo.user)
          localStorage.setItem('user', JSON.stringify(decodedTokenInfo.user))

          alert(`${getPlatformName()} 로그인 성공!`)
          router.push('/') // 홈페이지로 리다이렉트
        } else {
          return handleError('사용자 정보가 없습니다')
        }
      } catch (e) {
        return handleError(`토큰 정보 파싱 오류: ${e.message}`)
      }
    // eslint-disable-next-line brace-style
    }
    // 코드만 있는 경우 (소셜 제공자마다 처리 방식이 다를 수 있음)
    else if (code) {
      // 향후 코드를 사용한 서버 요청 구현 가능
      console.log(`${socialProvider} 인증 코드:`, code)
      return handleError('직접 코드 처리는 아직 구현되지 않았습니다')
    }

    loading.value = false
  } catch (e) {
    handleError(e.message)
  }
})

// 플랫폼 이름을 한글로 변환하는 함수
const getPlatformName = () => {
  switch (socialProvider) {
    case 'google':
      return '구글'
    case 'naver':
      return '네이버'
    case 'kakao':
      return '카카오'
    default:
      return '소셜'
  }
}
</script>

<style scoped>
.social-callback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  background-color: #f5f5f5;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.error {
  color: #e53935;
}
</style>
