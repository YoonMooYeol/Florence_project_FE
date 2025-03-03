<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 사용자 정보 (실제 구현 시 스토어나 API에서 가져올 예정)
const userInfo = ref({
  name: '홍길동',
  email: 'user@example.com',
  phone: '010-1234-5678',
  isPregnant: true,
  dueDate: '2025-06-15',
  pregnancyWeek: 12,
  babyNickname: '콩콩이'
})

// 수정된 정보를 저장하는 함수 (실제 구현은 나중에)
const saveUserInfo = () => {
  // 저장 성공 메시지
  alert('정보가 성공적으로 저장되었습니다.')
  
  // 프로필 페이지로 이동
  router.push('/profile')
}

// 뒤로 가기
const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between">
      <button @click="goBack" class="text-dark-gray">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-center text-dark-gray flex-1">내 정보 관리</h1>
      <div class="w-6"></div> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 사용자 정보 폼 -->
    <div class="p-4">
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <!-- 프로필 이미지 섹션 -->
        <div class="flex flex-col items-center mb-6">
          <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-2 relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            <button class="absolute bottom-0 right-0 bg-point-yellow rounded-full p-1 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-dark-gray" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">프로필 사진 변경</p>
        </div>

        <!-- 이름 입력 -->
        <div class="mb-4">
          <label for="name" class="block mb-2 text-sm font-medium text-dark-gray">이름</label>
          <input
            id="name"
            v-model="userInfo.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          >
        </div>

        <!-- 이메일 입력 -->
        <div class="mb-4">
          <label for="email" class="block mb-2 text-sm font-medium text-dark-gray">이메일</label>
          <input
            id="email"
            v-model="userInfo.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow bg-gray-100"
            disabled
          >
          <p class="mt-1 text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-4">
          <label for="phone" class="block mb-2 text-sm font-medium text-dark-gray">전화번호</label>
          <input
            id="phone"
            v-model="userInfo.phone"
            type="tel"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          >
        </div>

        <!-- 임신 정보 섹션 -->
        <div v-if="userInfo.isPregnant" class="mb-4">
          <h3 class="text-lg font-medium text-dark-gray mb-3">임신 정보</h3>
          
          <!-- 출산 예정일 -->
          <div class="mb-4">
            <label for="dueDate" class="block mb-2 text-sm font-medium text-dark-gray">출산 예정일</label>
            <input
              id="dueDate"
              v-model="userInfo.dueDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            >
          </div>
          
          <!-- 태명 -->
          <div class="mb-4">
            <label for="babyNickname" class="block mb-2 text-sm font-medium text-dark-gray">태명</label>
            <input
              id="babyNickname"
              v-model="userInfo.babyNickname"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            >
          </div>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <button 
        @click="saveUserInfo"
        class="w-full p-4 bg-point-yellow rounded-lg shadow-md text-center text-dark-gray font-bold"
      >
        저장하기
      </button>
    </div>
  </div>
</template>

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
.bg-base-yellow {
  background-color: #FFED90;
}
.bg-point-yellow {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style> 