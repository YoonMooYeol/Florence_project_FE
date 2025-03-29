<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'

const router = useRouter()
const currentSlide = ref(0)

const slides = [
  {
    image: '/src/assets/images/calendar.jpg',
    title: '📍 메인 페이지 - 캘린더',
    description: '이전/현재/다음 달로 이동하며 일정을 확인하고 일정을 클릭시 상세 내용을 볼 수 있어요 📅'
  },
  {
    image: '/src/assets/images/chat.jpg',
    title: '📍 채팅 페이지',
    description: '하루동안의 채팅을 AI 에이전트 "플로렌스"와 함께 나눠보세요 🍀'
  },
  {
    image: '/src/assets/images/search.jpg',
    title: '📍 검색 페이지',
    description: '팔로잉 하고싶은 아이디를 검색하여 팔로잉할 수 있어요 🔍'
  },
  {
    image: '/src/assets/images/user.jpg',
    title: '📍 마이 페이지',
    description: '사용자 정보와 임신 정보를 관리할 수 있어요 👼'
  }
]

// 다음 슬라이드로 이동
const nextSlide = () => {
  if (currentSlide.value < slides.length - 1) {
    currentSlide.value++
  } else {
    // 마지막 슬라이드에서는 메인 페이지로 이동
    finishOnboarding()
  }
}

// 이전 슬라이드로 이동
const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

// 온보딩 완료
const finishOnboarding = () => {
  // 온보딩 완료 상태 저장 (rememberMe 상태에 따라 저장소 선택)
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  if (rememberMe) {
    localStorage.setItem('onboardingCompleted', 'true')
  } else {
    sessionStorage.setItem('onboardingCompleted', 'true')
  }
  
  // 메인 페이지(캘린더)로 이동
  router.push('/calendar')
}

// 다시 보지 않기
const neverShowAgain = () => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  const storage = rememberMe ? localStorage : sessionStorage
  
  // 다시 보지 않기 상태 저장
  storage.setItem('hideOnboarding', 'true')
  
  // 다른 스토리지에서도 제거
  if (rememberMe) {
    sessionStorage.removeItem('hideOnboarding')
  } else {
    localStorage.removeItem('hideOnboarding')
  }
  
  // 온보딩 완료 상태도 저장
  storage.setItem('onboardingCompleted', 'true')
  
  // 다른 스토리지에서도 온보딩 완료 상태 제거
  if (rememberMe) {
    sessionStorage.removeItem('onboardingCompleted')
  } else {
    localStorage.removeItem('onboardingCompleted')
  }
  
  console.log('온보딩을 다시 보지 않도록 설정했습니다.')
  
  // 라우터를 통한 이동이 실패할 경우를 대비해 window.location 사용
  window.location.href = '/calendar'
}

// 슬라이드 건너뛰기
const skipOnboarding = () => {
  finishOnboarding()
}

onMounted(() => {
  // 다시 보지 않기 상태 확인
  const hideOnboarding = 
    localStorage.getItem('hideOnboarding') === 'true' || 
    sessionStorage.getItem('hideOnboarding') === 'true'
  
  if (hideOnboarding) {
    console.log('온보딩을 다시 보지 않기로 설정되어 있습니다. 캘린더로 이동합니다.')
    window.location.href = '/calendar'
    return
  }

  console.log('온보딩을 시작합니다.')
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 슬라이드 컨테이너 -->
    <div class="relative h-screen overflow-hidden">
      <!-- 슬라이드 -->
      <div
        class="flex transition-transform duration-300 ease-in-out h-full"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <div
          v-for="(slide, index) in slides"
          :key="index"
          class="min-w-full h-full flex flex-col items-center justify-center px-3"
        >
          <div class="w-full max-w-xl mx-auto flex flex-col items-center">
            <!-- 이미지 -->
            <img
              :src="slide.image"
              :alt="slide.title"
              class="w-full h-[60vh] object-contain mb-2 rounded-lg mt-[-60px]"
            >
            <!-- 텍스트 -->
            <div class="flex flex-col items-center justify-center mt-[-30px]">
              <h2 class="text-2xl font-bold text-dark-gray mb-1">
                {{ slide.title }}
              </h2>
              <p class="text-gray-600 text-center mb-8">
                {{ slide.description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 네비게이션 버튼 -->
      <div class="absolute bottom-20 left-0 right-0 flex justify-center space-x-3">
        <div
          v-for="(_, index) in slides"
          :key="index"
          class="w-3 h-3 rounded-full"
          :class="index === currentSlide ? 'bg-point-yellow' : 'bg-gray-300'"
        />
      </div>

      <!-- 하단 버튼 -->
      <div class="absolute bottom-10 left-0 right-0 flex flex-col items-center space-y-4">
        <div class="flex justify-between w-full px-8">
          <button
            v-if="currentSlide > 0"
            class="px-8 py-3 text-gray-600"
            @click="prevSlide"
          >
            이전
          </button>
          <button
            v-if="currentSlide === 0"
            class="px-5 py-3 text-gray-600"
            @click="skipOnboarding"
          >
            건너뛰기
          </button>
          <button
            class="px-4 py-1 bg-point-yellow rounded-full text-dark-gray font-bold"
            @click="nextSlide"
          >
            {{ currentSlide === slides.length - 1 ? '시작하기' : '다음' }}
          </button>
        </div>
        
        <!-- 다시 보지 않기 버튼 -->
        <button
          class="px-5 py-2 text-gray-500 text-sm hover:text-gray-700"
          @click="neverShowAgain"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-point-yellow {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style> 