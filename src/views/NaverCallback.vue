<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  // URL 파라미터에서 토큰 및 사용자 정보 추출
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const refresh = urlParams.get('refresh')
  const userId = urlParams.get('user_id')
  const name = urlParams.get('name')
  const isPregnant = urlParams.get('is_pregnant') === 'true'
  
  console.log('네이버 콜백 파라미터:', { token: token?.substring(0, 10) + '...', userId, name, isPregnant })
  
  if (token && refresh) {
    // 토큰 저장
    authStore.setAccessToken(token)
    authStore.setRefreshToken(refresh)
    
    // 사용자 정보 저장
    localStorage.setItem('userId', userId)
    localStorage.setItem('userName', name)
    localStorage.setItem('isPregnant', isPregnant)
    
    // 성공 알림
    alert('네이버 로그인에 성공했습니다')
    
    // 로그인 성공 후 리다이렉트
    router.push('/calendar')
  } else {
    console.error('토큰이 없습니다')
    alert('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요')
    router.push('/login')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-ivory">
    <div class="p-8 text-center bg-white rounded-lg shadow-md">
      <h2 class="mb-4 text-2xl font-bold text-dark-gray">
        로그인 처리 중...
      </h2>
      <p class="text-gray-600">
        잠시만 기다려주세요.
      </p>
      <div class="mt-4">
        <div class="w-12 h-12 mx-auto border-4 border-point-yellow rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  </div>
</template> 