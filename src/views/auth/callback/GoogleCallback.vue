<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

// 로딩 상태 관리
const isLoading = ref(true)
const error = ref(null)

onMounted(() => {
  console.log('구글 콜백 컴포넌트가 마운트되었습니다.')
  console.log('현재 URL:', window.location.href)
  // 서버 오류 확인 (URL에 error 파라미터가 있는지 확인)
  const urlParams = new URLSearchParams(window.location.search)
  const errorParam = urlParams.get('error')
  console.log('URL 파라미터:', Object.fromEntries(urlParams.entries()))
  if (errorParam) {
    // 서버에서 전달한 오류가 있는 경우
    console.error('서버 오류 파라미터 발견:', errorParam)
    handleError(`서버 오류: ${errorParam}`)
    return
  }
  try {
    // URL 파라미터에서 토큰 및 사용자 정보 추출
    const token = urlParams.get('token')
    const refresh = urlParams.get('refresh')
    const userId = urlParams.get('user_id')
    const name = urlParams.get('name')
    const isPregnant = urlParams.get('is_pregnant') === 'true'
    console.log('구글 콜백 파라미터:', {
      token: token ? `${token.substring(0, 10)}...` : '없음',
      refresh: refresh ? '있음' : '없음',
      userId,
      name,
      isPregnant
    })
    if (token && refresh) {
      console.log('토큰과 리프레시 토큰이 존재합니다. 저장을 시작합니다.')
      // 토큰 저장
      authStore.setAccessToken(token)
      authStore.setRefreshToken(refresh)
      // 사용자 정보 저장
      localStorage.setItem('userId', userId)
      localStorage.setItem('userName', name)
      localStorage.setItem('isPregnant', isPregnant)
      console.log('로그인 정보 저장 완료:', {
        userId: localStorage.getItem('userId'),
        userName: localStorage.getItem('userName')
      })
      // 성공 알림
      setTimeout(() => {
        alert('구글 로그인에 성공했습니다')
        // 로딩 상태 종료
        isLoading.value = false
        // 로그인 성공 후 리다이렉트
        console.log('캘린더 페이지로 이동합니다.')
        router.push('/calendar')
      }, 500)
    } else {
      console.error('토큰 정보가 없습니다:', { token, refresh })
      handleError('로그인 처리 중 오류가 발생했습니다. 토큰 정보가 없습니다.')
    }
  } catch (err) {
    console.error('로그인 처리 중 예외 발생:', err)
    handleError(`로그인 처리 중 오류가 발생했습니다: ${err.message}`)
  }
})

// 오류 처리를 위한 함수
function handleError (message) {
  error.value = message
  console.error('오류 처리:', message)
  isLoading.value = false

  // 사용자에게 알림
  setTimeout(() => {
    alert(message)
    console.log('로그인 페이지로 이동합니다.')
    router.push('/login')
  }, 500)
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-ivory">
    <div class="p-8 text-center bg-white rounded-lg shadow-md">
      <template v-if="isLoading">
        <h2 class="mb-4 text-2xl font-bold text-dark-gray">
          로그인 처리 중...
        </h2>
        <p class="text-gray-600">
          잠시만 기다려주세요.
        </p>
        <div class="mt-4">
          <div class="w-12 h-12 mx-auto border-4 border-point-yellow rounded-full border-t-transparent animate-spin" />
        </div>
      </template>
      <template v-else-if="error">
        <h2 class="mb-4 text-2xl font-bold text-red-600">
          로그인 오류
        </h2>
        <p class="text-gray-700">
          {{ error }}
        </p>
        <button
          class="mt-4 px-4 py-2 bg-point-yellow text-dark-gray rounded-[20px] font-medium hover:bg-yellow-400"
          @click="router.push('/login')"
        >
          로그인 페이지로 돌아가기
        </button>
      </template>
    </div>
  </div>
</template>
