<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 임신 정보 (실제 구현 시 API로 전송할 데이터)
const pregnancyInfo = ref({
  babyName: '',
  dueDate: '',
  currentWeek: 1,
  highRisk: false
})

// "모름" 상태 관리
const unknownInfo = ref({
  babyName: false,
  dueDate: false,
  currentWeek: false
})

// 현재 주차 옵션
const weekOptions = Array.from({ length: 40 }, (_, i) => i + 1)

// "모름" 체크박스 상태 변경 시 관련 필드 처리
watch(() => unknownInfo.value.babyName, (isUnknown) => {
  if (isUnknown) {
    pregnancyInfo.value.babyName = '(태명 미정)'
  } else if (pregnancyInfo.value.babyName === '(태명 미정)') {
    pregnancyInfo.value.babyName = ''
  }
})

watch(() => unknownInfo.value.dueDate, (isUnknown) => {
  if (isUnknown) {
    pregnancyInfo.value.dueDate = ''
  }
})

watch(() => unknownInfo.value.currentWeek, (isUnknown) => {
  if (isUnknown) {
    pregnancyInfo.value.currentWeek = null
  } else if (pregnancyInfo.value.currentWeek === null) {
    pregnancyInfo.value.currentWeek = 1
  }
})

// 임신 정보 저장 함수 (실제 구현은 나중에)
const savePregnancyInfo = () => {
  // 유효성 검사
  if (!pregnancyInfo.value.babyName && !unknownInfo.value.babyName) {
    alert('태명을 입력하거나 태명이 없음을 체크해주세요.')
    return
  }
  
  if (!pregnancyInfo.value.dueDate && !unknownInfo.value.dueDate) {
    alert('출산 예정일을 선택하거나 모름을 체크해주세요.')
    return
  }
  
  // 저장 성공 메시지
  alert('임신 정보가 성공적으로 저장되었습니다.')
  
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
      <h1 class="text-xl font-bold text-center text-dark-gray flex-1">임신 정보 등록</h1>
      <div class="w-6"></div> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 임신 정보 폼 -->
    <div class="p-4">
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="mb-6 text-center">
          <div class="w-20 h-20 bg-base-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-dark-gray" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <h2 class="text-lg font-bold text-dark-gray">임신 정보를 입력해주세요</h2>
          <p class="text-sm text-gray-500 mt-1">하트비트에서 맞춤 서비스를 제공해 드립니다</p>
        </div>

        <!-- 태명 입력 -->
        <div class="mb-1">
          <label for="babyName" class="block mb-2 text-sm font-medium text-dark-gray">태명</label>
          <input
            id="babyName"
            v-model="pregnancyInfo.babyName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="태명을 입력해주세요"
            :disabled="unknownInfo.babyName"
          >
        </div>
        <div class="mb-4">
          <label class="flex items-center mt-2">
            <input
              v-model="unknownInfo.babyName"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-gray-500">태명이 없습니다</span>
          </label>
        </div>

        <!-- 출산 예정일 -->
        <div class="mb-1">
          <label for="dueDate" class="block mb-2 text-sm font-medium text-dark-gray">출산 예정일</label>
          <input
            id="dueDate"
            v-model="pregnancyInfo.dueDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            :disabled="unknownInfo.dueDate"
          >
        </div>
        <div class="mb-4">
          <label class="flex items-center mt-2">
            <input
              v-model="unknownInfo.dueDate"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-gray-500">출산 예정일을 모릅니다</span>
          </label>
        </div>
        
        <!-- 현재 임신 주차 -->
        <div class="mb-1">
          <label for="currentWeek" class="block mb-2 text-sm font-medium text-dark-gray">현재 임신 주차</label>
          <select
            id="currentWeek"
            v-model="pregnancyInfo.currentWeek"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            :disabled="unknownInfo.currentWeek"
          >
            <option v-for="week in weekOptions" :key="week" :value="week">{{ week }}주차</option>
          </select>
        </div>
        <div class="mb-4">
          <label class="flex items-center mt-2">
            <input
              v-model="unknownInfo.currentWeek"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-gray-500">현재 임신 주차를 모릅니다</span>
          </label>
        </div>
        
        <!-- 고위험 임신 여부 -->
        <div class="mb-6">
          <label class="flex items-center">
            <input
              v-model="pregnancyInfo.highRisk"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-dark-gray">고위험 임신입니다</span>
          </label>
        </div>
      </div>

      <!-- 버튼 영역 -->
      <div class="flex flex-col">
        <button 
          @click="savePregnancyInfo"
          class="w-full p-4 bg-point-yellow rounded-lg shadow-md text-center text-dark-gray font-bold"
        >
          저장하기
        </button>
      </div>
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