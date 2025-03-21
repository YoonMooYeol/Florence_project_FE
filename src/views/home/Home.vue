<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = async () => {
  console.log('시작하기 버튼 클릭')
  try {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (token) {
      // 이미 로그인된 경우 캘린더 페이지로 이동
      await router.push('/calendar')
    } else {
      // 로그인되지 않은 경우 로그인 페이지로 이동
      await router.push('/login')
    }
  } catch (error) {
    console.error('라우팅 에러:', error)
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md mx-auto p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white rounded-[20px] shadow-md">
      <div class="text-center space-y-4">
        <p class="text-sm sm:text-base text-dark-gray">
          온누리에 생명의 소리가 가득 차 넘치는 달
        </p>
        <h1 class="text-2xl sm:text-3xl font-bold text-dark-gray">
          누리달
        </h1>
      </div>

      <div class="space-y-4">
        <button
          class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold text-base sm:text-lg transition-colors duration-200"
          @click="goToLogin"
        >
          시작하기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .bg-ivory {
    min-height: 100dvh; /* 모바일 브라우저의 동적 뷰포트 높이 사용 */
  }
}
</style>
