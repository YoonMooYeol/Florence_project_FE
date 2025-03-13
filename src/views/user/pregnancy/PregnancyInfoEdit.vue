<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
import { calculateWeekFromDueDate, calculateDueDateFromWeek } from '@/utils/dateUtils'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiMotherNurse } from '@mdi/js'

const router = useRouter()

const path = mdiMotherNurse

// 임신 정보
const pregnancyInfo = ref({
  babyName: '',
  dueDate: '',
  currentWeek: 1,
  highRisk: false,
  isPregnant: false,
  pregnancyId: null,
  isFromRegistration: false // 회원가입 시 등록 여부
})

// "모름" 상태 관리
const unknownInfo = ref({
  babyName: false,
  pregnancyDate: false // 임신 주차/출산예정일 모름 상태 추가
})

// 마지막 생리일 상태 추가
const lastPeriodDate = ref('')

// 로딩 상태 관리
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const isEditMode = ref(false) // 수정 모드 상태

// 현재 주차 옵션
const weekOptions = Array.from({ length: 40 }, (_, i) => i + 1)

// 출산예정일이 변경되면 임신 주차 자동 계산
watch(() => pregnancyInfo.value.dueDate, (newDueDate) => {
  if (newDueDate) {
    pregnancyInfo.value.currentWeek = calculateWeekFromDueDate(newDueDate)
  }
})

// 임신 주차가 변경되면 출산예정일 자동 계산
watch(() => pregnancyInfo.value.currentWeek, (newWeek, oldWeek) => {
  // oldWeek이 있는 경우에만 계산
  if (oldWeek) {
    pregnancyInfo.value.dueDate = calculateDueDateFromWeek(newWeek)
  }
})

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
        pregnancyId: data.pregnancy_id,
        isFromRegistration: data.is_from_registration || false // 회원가입 시 등록 여부
      }

      // 수정 모드 초기값 설정: 항상 false(보기 모드)로 시작
      isEditMode.value = false

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'true')
      sessionStorage.setItem('isPregnant', 'true')
    } else {
      // 임신 정보가 없는 경우
      pregnancyInfo.value.isPregnant = false
      isEditMode.value = true // 정보가 없으면 바로 입력 가능하도록 수정 모드 활성화
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

// 수정 모드 활성화 함수
const enableEditMode = () => {
  isEditMode.value = true
}

// 컴포넌트 마운트 시 임신 정보 불러오기
onMounted(async () => {
  await fetchPregnancyInfo()
  
  // 세션 스토리지에서 수정 모드 확인
  if (sessionStorage.getItem('pregnancyEditMode') === 'true') {
    isEditMode.value = true
    // 사용 후 세션 스토리지에서 삭제
    sessionStorage.removeItem('pregnancyEditMode')
  }
})

// 임신 여부 변경 시 처리
watch(() => pregnancyInfo.value.isPregnant, (isPregnant) => {
  if (!isPregnant) {
    // 임신이 아닌 경우 모든 필드 초기화
    pregnancyInfo.value.babyName = ''
    pregnancyInfo.value.dueDate = ''
    pregnancyInfo.value.currentWeek = 1
    pregnancyInfo.value.highRisk = false
    unknownInfo.value.babyName = true
  }
})

// "모름" 체크박스 상태 변경 시 관련 필드 처리
watch(() => unknownInfo.value.babyName, (isUnknown) => {
  if (isUnknown) {
    pregnancyInfo.value.babyName = '우리 애기'
  } else if (pregnancyInfo.value.babyName === '우리 애기') {
    pregnancyInfo.value.babyName = ''
  }
})

// 임신 정보 저장 함수
const savePregnancyInfo = async () => {
  // 유효성 검사
  if (pregnancyInfo.value.isPregnant) {
    if (!pregnancyInfo.value.babyName && !unknownInfo.value.babyName) {
      alert('태명을 입력해주세요')
      return
    }

    // 출산예정일이나 현재 임신 주차 중 하나는 반드시 있어야 함
    if (!pregnancyInfo.value.dueDate && !pregnancyInfo.value.currentWeek) {
      alert('출산 예정일 또는 현재 임신 주차 중 하나를 입력해주세요.')
      return
    }

    // 출산예정일이 없으면 현재 임신 주차로부터 계산
    if (!pregnancyInfo.value.dueDate && pregnancyInfo.value.currentWeek) {
      pregnancyInfo.value.dueDate = calculateDueDateFromWeek(pregnancyInfo.value.currentWeek)
    }

    // 현재 임신 주차가 없으면 출산예정일로부터 계산
    if (!pregnancyInfo.value.currentWeek && pregnancyInfo.value.dueDate) {
      pregnancyInfo.value.currentWeek = calculateWeekFromDueDate(pregnancyInfo.value.dueDate)
    }
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    let response
    // 2. API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk,
      is_from_registration: pregnancyInfo.value.isFromRegistration // 회원가입 시 등록 여부 유지
    }

    if (pregnancyInfo.value.isPregnant) {
      if (pregnancyInfo.value.pregnancyId) {
        // 기존 임신 정보 업데이트
        response = await api.put(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`, requestData)
      } else {
        // 새 임신 정보 생성
        response = await api.post('/accounts/pregnancies/', requestData)
        pregnancyInfo.value.pregnancyId = response.data.pregnancy_id
      }

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'true')
      sessionStorage.setItem('isPregnant', 'true')
    } else {
      // 임신 정보 삭제
      if (pregnancyInfo.value.pregnancyId) {
        await api.delete(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`)
      }
      
      // 임신 상태 업데이트
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')
    }

    // 저장 성공 메시지
    alert('임신 정보가 성공적으로 저장되었습니다.')

    // 임신 정보 새로고침
    await fetchPregnancyInfo()
  } catch (error) {
    console.error('임신 정보 저장 오류:', error)
    errorMessage.value = error.response?.data?.detail || '임신 정보 저장 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

// 뒤로 가기
const goBack = () => {
  router.go(-1)
}

// 출산까지 남은 일수 계산
const getDaysUntilDueDate = () => {
  const dueDate = new Date(pregnancyInfo.value.dueDate)
  const today = new Date()
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24))
  return daysUntilDue
}

// 마지막 생리일로부터 임신 주차와 출산예정일 계산
const calculateFromLastPeriod = () => {
  if (lastPeriodDate.value) {
    const lastPeriod = new Date(lastPeriodDate.value)
    const today = new Date()
    
    // 임신 주차 계산 (마지막 생리일로부터 경과된 주 수)
    const weeksDiff = Math.floor((today - lastPeriod) / (7 * 24 * 60 * 60 * 1000))
    const calculatedWeek = Math.min(weeksDiff + 1, 40) // 최대 40주로 제한
    
    // 출산예정일 계산 (마지막 생리일로부터 280일 후)
    const dueDate = new Date(lastPeriod)
    dueDate.setDate(dueDate.getDate() + 280)
    const calculatedDueDate = dueDate.toISOString().split('T')[0]

    // 계산된 값을 임신 정보에 설정
    pregnancyInfo.value.currentWeek = calculatedWeek
    pregnancyInfo.value.dueDate = calculatedDueDate
  }
}

// 임신 주차/출산예정일 모름 상태 변경 시 처리
watch(() => unknownInfo.value.pregnancyDate, (isUnknown) => {
  if (isUnknown) {
    // 체크박스 선택 시 기존 값 저장
    lastPeriodDate.value = ''
  } else {
    // 체크박스 해제 시 초기화
    lastPeriodDate.value = ''
    pregnancyInfo.value.currentWeek = 1
    pregnancyInfo.value.dueDate = ''
  }
})

// 마지막 생리일 변경 시 자동 계산
watch(() => lastPeriodDate.value, () => {
  if (lastPeriodDate.value) {
    calculateFromLastPeriod()
  }
})
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
        임신 정보 {{ isEditMode ? '수정' : '보기' }}
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

    <!-- 임신 정보 폼 -->
    <div
      v-if="!isLoading"
      class="p-4"
    >
      <!-- 임신정보가 있고 수정 모드가 아닐 때 보기 모드로 표시 -->
      <div v-if="pregnancyInfo.isPregnant && !isEditMode" class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="mb-6 text-center">
          <div class="w-20 h-20 bg-base-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <svg-icon
              type="mdi"
              :path="path"
              :size="52"
              class="text-dark-gray"
            ></svg-icon>
          </div>
          <h2 class="text-lg font-bold text-dark-gray">
            임신 정보
          </h2>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">태명</span>
            <span class="font-medium">{{ pregnancyInfo.babyName }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">현재 임신 주차</span>
            <span class="font-medium">{{ pregnancyInfo.currentWeek }}주차</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">출산 예정일</span>
            <span class="font-medium">{{ pregnancyInfo.dueDate }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">출산까지 남은 일수</span>
            <span class="font-medium">{{ getDaysUntilDueDate() }}일</span>
          </div>
          <div v-if="pregnancyInfo.highRisk" class="flex items-center text-red-500">
            <svg-icon
              type="mdi"
              :path="path"
              :size="20"
              class="mr-1"
            ></svg-icon>
            <span class="text-sm">고위험 임신</span>
          </div>
          
          <div class="mt-4">
            <button
              class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
              @click="enableEditMode"
            >
              수정하기
            </button>
          </div>
        </div>
      </div>

      <!-- 수정 모드이거나 임신정보가 없는 경우 편집 폼 표시 -->
      <div v-if="isEditMode || !pregnancyInfo.isPregnant" class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="mb-6 text-center">
          <div class="w-20 h-20 bg-base-yellow rounded-full flex items-center justify-center mx-auto mb-4">
            <svg-icon
              type="mdi"
              :path="path"
              :size="52"
              class="text-dark-gray"
            ></svg-icon>
          </div>
          <h2 class="text-lg font-bold text-dark-gray">
            임신 정보를 입력해주세요
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            하트비트에서 맞춤 서비스를 제공해 드립니다
          </p>
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
              :disabled="unknownInfo.pregnancyDate"
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
              :disabled="unknownInfo.pregnancyDate"
            >
            <p class="text-xs text-gray-500 mt-1">
              임신 주차를 선택하면 자동으로 계산됩니다. 필요 시 수정 가능합니다.
            </p>
          </div>

          <!-- 임신 주차/출산예정일 모름 체크박스 -->
          <div class="mb-4">
            <label class="flex items-center mt-2">
              <input
                v-model="unknownInfo.pregnancyDate"
                type="checkbox"
                class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
              >
              <span class="ml-2 text-sm text-gray-500">현재 임신 주차/출산예정일을 모릅니다</span>
            </label>
          </div>

          <!-- 마지막 생리 시작일 (체크박스 선택 시에만 표시) -->
          <div v-if="unknownInfo.pregnancyDate" class="mb-4">
            <label
              for="lastPeriodDate"
              class="block mb-2 text-sm font-medium text-dark-gray"
            >마지막 생리 시작일</label>
            <input
              id="lastPeriodDate"
              v-model="lastPeriodDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            >
            <p class="text-xs text-gray-500 mt-1">
              마지막 생리 시작일을 입력하시면 임신 주차와 출산예정일이 자동으로 계산됩니다.
            </p>
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
      <div v-if="isEditMode" class="flex flex-col">
        <button
          class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
          :disabled="isSubmitting"
          @click="savePregnancyInfo"
        >
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
