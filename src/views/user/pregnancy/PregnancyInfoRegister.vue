<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'

const router = useRouter()

// 임신 정보 (실제 구현 시 API로 전송할 데이터)
const pregnancyInfo = ref({
  babyName: '',
  dueDate: '',
  currentWeek: 1,
  highRisk: false,
  pregnancyId: null
})

// 로딩 상태 관리
const isSubmitting = ref(false)
const errorMessage = ref('')

// 현재 주차 옵션
const weekOptions = Array.from({ length: 40 }, (_, i) => i + 1)

// 임신 정보 저장 함수
const savePregnancyInfo = async () => {
  // 유효성 검사
  if (!pregnancyInfo.value.babyName) {
    alert('태명을 입력해주세요.')
    return
  }

  if (!pregnancyInfo.value.dueDate) {
    alert('출산 예정일을 선택해주세요.')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk
    }

    // 임신 정보 등록 API 호출
    const response = await api.post('/accounts/pregnancies/', requestData)
    // 응답에서 임신 ID 저장
    if (response.data && response.data.pregnancy_id) {
      pregnancyInfo.value.pregnancyId = response.data.pregnancy_id
    }

    // 임신 상태 저장
    localStorage.setItem('isPregnant', 'true')
    sessionStorage.setItem('isPregnant', 'true')

    // 저장 성공 메시지
    alert('임신 정보가 성공적으로 저장되었습니다.')

    // 홈 페이지로 이동
    router.push('/calendar')
  } catch (error) {
    console.error('임신 정보 저장 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보 저장 중 오류가 발생했습니다.'
    alert(errorMessage.value)
  } finally {
    isSubmitting.value = false
  }
}

// 건너뛰기 (나중에 입력)
const skipForNow = () => {
  if (confirm('임신 정보 입력을 건너뛰시겠습니까? 나중에 마이페이지에서 입력할 수 있습니다.')) {
    router.push('/calendar')
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">
      <!-- 헤더 -->
      <div class="mb-1 text-center">
        <h1 class="text-xl font-bold text-center text-dark-gray">
          임신 정보 등록
        </h1>
      </div>
    </div>

    <!-- 임신 정보 폼 -->
    <div class="p-4">
      <div class="bg-white rounded-[10px] shadow-md p-10 mb-4">
        <div class="mb-6 text-center">
          <div class="w-20 h-20 bg-base-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-dark-gray"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <h2 class="text-lg font-bold text-dark-gray">
            임신 정보를 입력해주세요
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            하트비트에서 맞춤 서비스를 제공해 드립니다
          </p>
        </div>

        <!-- 에러 메시지 표시 -->
        <div
          v-if="errorMessage"
          class="p-3 mb-4 text-center text-red-700 bg-red-100 rounded-md"
        >
          {{ errorMessage }}
        </div>

        <!-- 태명 입력 -->
        <div class="mb-4">
          <label
            for="babyName"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >태명</label>
          <input
            id="babyName"
            v-model="pregnancyInfo.babyName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="태명을 입력해주세요"
          >
        </div>

        <!-- 출산 예정일 -->
        <div class="mb-4">
          <label
            for="dueDate"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >출산 예정일</label>
          <input
            id="dueDate"
            v-model="pregnancyInfo.dueDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          >
        </div>

        <!-- 현재 임신 주차 -->
        <div class="mb-4">
          <label
            for="currentWeek"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >현재 임신 주차</label>
          <select
            id="currentWeek"
            v-model="pregnancyInfo.currentWeek"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          >
            <option
              v-for="week in weekOptions"
              :key="week"
              :value="week"
            >
              {{ week }}주차
            </option>
          </select>
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
      <div class="flex flex-col space-y-3">
        <button
          class="w-full p-4 bg-point-yellow rounded-lg shadow-md text-center text-dark-gray font-bold"
          :disabled="isSubmitting"
          @click="savePregnancyInfo"
        >
          <span v-if="isSubmitting">처리 중...</span>
          <span v-else>저장하기</span>
        </button>

        <button
          class="w-full p-4 bg-white rounded-lg shadow-md text-center text-gray-500 font-bold"
          :disabled="isSubmitting"
          @click="skipForNow"
        >
          건너뛰기
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
