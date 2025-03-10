<script setup>
import { ref, watch, onMounted } from 'vue'
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'

const router = useRouter()

// 임신 정보
// 임신 정보
const pregnancyInfo = ref({
  babyName: '',
  dueDate: '',
  currentWeek: 1,
  highRisk: false,
  isPregnant: false,
  pregnancyId: null
  isPregnant: false,
  pregnancyId: null
})

// "모름" 상태 관리
const unknownInfo = ref({
  babyName: false,
  dueDate: false,
  currentWeek: false
})

// 로딩 상태 관리
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// 로딩 상태 관리
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

// 현재 주차 옵션
const weekOptions = Array.from({ length: 40 }, (_, i) => i + 1)

// 임신 정보 불러오기
const fetchPregnancyInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/accounts/pregnancies/')

    // 임신 정보가 있는 경우
    if (response.data && response.data.length > 0) {
      const data = response.data[0] // 가장 최근 임신 정보 사용

      pregnancyInfo.value = {
        babyName: data.baby_name,
        dueDate: data.due_date,
        currentWeek: data.current_week,
        highRisk: data.high_risk,
        isPregnant: true,
        pregnancyId: data.pregnancy_id
      }

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'true')
      sessionStorage.setItem('isPregnant', 'true')
    } else {
      // 임신 정보가 없는 경우
      pregnancyInfo.value.isPregnant = false
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')
    }
  } catch (error) {
    console.error('임신 정보 불러오기 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 컴포넌트 마운트 시 임신 정보 불러오기
onMounted(fetchPregnancyInfo)

// 임신 정보 불러오기
const fetchPregnancyInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/accounts/pregnancies/')

    // 임신 정보가 있는 경우
    if (response.data && response.data.length > 0) {
      const data = response.data[0] // 가장 최근 임신 정보 사용

      pregnancyInfo.value = {
        babyName: data.baby_name,
        dueDate: data.due_date,
        currentWeek: data.current_week,
        highRisk: data.high_risk,
        isPregnant: true,
        pregnancyId: data.pregnancy_id
      }

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'true')
      sessionStorage.setItem('isPregnant', 'true')
    } else {
      // 임신 정보가 없는 경우
      pregnancyInfo.value.isPregnant = false
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')
    }
  } catch (error) {
    console.error('임신 정보 불러오기 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 컴포넌트 마운트 시 임신 정보 불러오기
onMounted(fetchPregnancyInfo)

// 임신 여부 변경 시 처리
watch(() => pregnancyInfo.value.isPregnant, (isPregnant) => {
  if (!isPregnant) {
    // 임신이 아닌 경우 모든 필드 초기화
    pregnancyInfo.value.babyName = ''
    pregnancyInfo.value.dueDate = ''
    pregnancyInfo.value.currentWeek = 1
    pregnancyInfo.value.highRisk = false
    unknownInfo.value.babyName = false
    unknownInfo.value.dueDate = false
    unknownInfo.value.currentWeek = false
  }
})

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

// 임신 정보 저장 함수
const savePregnancyInfo = async () => {
// 임신 정보 저장 함수
const savePregnancyInfo = async () => {
  // 임신이 아닌 경우 바로 저장
  if (!pregnancyInfo.value.isPregnant) {
    try {
      isSubmitting.value = true

      // 기존 임신 정보가 있는 경우 삭제 요청
      if (pregnancyInfo.value.pregnancyId) {
        await api.delete(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`)
      }

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')

      alert('임신 정보가 성공적으로 저장되었습니다.')
      router.push('/profile')
      return
    } catch (error) {
      console.error('임신 정보 삭제 오류:', error)
      errorMessage.value = error.response?.data?.detail || '임신 정보 삭제 중 오류가 발생했습니다.'
      alert(errorMessage.value)
    } finally {
      isSubmitting.value = false
    }
    try {
      isSubmitting.value = true

      // 기존 임신 정보가 있는 경우 삭제 요청
      if (pregnancyInfo.value.pregnancyId) {
        await api.delete(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`)
      }

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')

      alert('임신 정보가 성공적으로 저장되었습니다.')
      router.push('/profile')
      return
    } catch (error) {
      console.error('임신 정보 삭제 오류:', error)
      errorMessage.value = error.response?.data?.detail || '임신 정보 삭제 중 오류가 발생했습니다.'
      alert(errorMessage.value)
    } finally {
      isSubmitting.value = false
    }
    return
  }

  // 유효성 검사
  if (!pregnancyInfo.value.babyName && !unknownInfo.value.babyName) {
    alert('태명을 입력하거나 태명이 없음을 체크해주세요.')
    return
  }
  if (!pregnancyInfo.value.dueDate && !unknownInfo.value.dueDate) {
    alert('출산 예정일을 선택하거나 모름을 체크해주세요.')
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate || null,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk
    }

    let response

    // 기존 임신 정보가 있는 경우 업데이트, 없는 경우 새로 생성
    if (pregnancyInfo.value.pregnancyId) {
      response = await api.put(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`, requestData)
    } else {
      response = await api.post('/accounts/pregnancies/', requestData)
      pregnancyInfo.value.pregnancyId = response.data.pregnancy_id
    }

    // 임신 상태 저장
    localStorage.setItem('isPregnant', 'true')
    sessionStorage.setItem('isPregnant', 'true')

    // 저장 성공 메시지
    alert('임신 정보가 성공적으로 저장되었습니다.')

    // 프로필 페이지로 이동
    router.push('/profile')
  } catch (error) {
    console.error('임신 정보 저장 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보 저장 중 오류가 발생했습니다.'
    alert(errorMessage.value)
  } finally {
    isSubmitting.value = false
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate || null,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk
    }

    let response

    // 기존 임신 정보가 있는 경우 업데이트, 없는 경우 새로 생성
    if (pregnancyInfo.value.pregnancyId) {
      response = await api.put(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`, requestData)
    } else {
      response = await api.post('/accounts/pregnancies/', requestData)
      pregnancyInfo.value.pregnancyId = response.data.pregnancy_id
    }

    // 임신 상태 저장
    localStorage.setItem('isPregnant', 'true')
    sessionStorage.setItem('isPregnant', 'true')

    // 저장 성공 메시지
    alert('임신 정보가 성공적으로 저장되었습니다.')

    // 프로필 페이지로 이동
    router.push('/profile')
  } catch (error) {
    console.error('임신 정보 저장 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보 저장 중 오류가 발생했습니다.'
    alert(errorMessage.value)
  } finally {
    isSubmitting.value = false
  }
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
      <button
        class="text-dark-gray"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-center text-dark-gray flex-1">
        임신 정보 등록
      </h1>
      <div class="w-6" /> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 에러 메시지 표시 -->
    <div
      v-if="errorMessage"
      class="p-4 mb-4 text-center text-red-700 bg-red-100"
    >
      {{ errorMessage }}
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 에러 메시지 표시 -->
    <div
      v-if="errorMessage"
      class="p-4 mb-4 text-center text-red-700 bg-red-100"
    >
      {{ errorMessage }}
    </div>

    <!-- 임신 정보 폼 -->
    <div
      v-if="!isLoading"
      class="p-4"
    >
    <div
      v-if="!isLoading"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
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

        <!-- 임신 여부 -->
        <div class="mb-6">
          <label class="flex items-center">
            <input
              v-model="pregnancyInfo.isPregnant"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-dark-gray">임신 중입니다</span>
          </label>
        </div>

        <!-- 임신 정보 입력 영역 -->
        <div v-if="pregnancyInfo.isPregnant">
          <!-- 태명 입력 -->
          <div class="mb-1">
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
            <label
              for="dueDate"
              class="block mb-2 text-sm font-medium text-dark-gray"
            >출산 예정일</label>
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
            <label
              for="currentWeek"
              class="block mb-2 text-sm font-medium text-dark-gray"
            >현재 임신 주차</label>
            <select
              id="currentWeek"
              v-model="pregnancyInfo.currentWeek"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              :disabled="unknownInfo.currentWeek"
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
      </div>

      <!-- 버튼 영역 -->
      <div class="flex flex-col">
        <button
          class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
          :disabled="isSubmitting"
          :disabled="isSubmitting"
          @click="savePregnancyInfo"
        >
          <span v-if="isSubmitting">처리 중...</span>
          <span v-else>저장하기</span>
          <span v-if="isSubmitting">처리 중...</span>
          <span v-else>저장하기</span>
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
