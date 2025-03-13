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
    <div class="w-full max-w-md p-10 space-y-8 bg-white rounded-[20px] shadow-md">
      <div class="text-center">
        <p class="mt-2 text-dark-gray">
          온누리에 생명의 소리가 가득 차 넘치는 달
        </p>
        <h1 class="text-3xl font-bold mt-4 text-dark-gray">
          누리달
        </h1>

      </div>

      <div class="mt-8 space-y-4">
        <button
          class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
          @click="goToLogin"
        >
          시작하기
        </button>
      </div>
    </div>
  </div>
</template>
