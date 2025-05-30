<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
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
  isFromRegistration: false, // 회원가입 시 등록 여부
  isActive: true // 활성화 여부
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

// todayDate 계산된 속성 추가
const todayDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
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

      // 임신 정보가 비활성화된 경우 리다이렉트
      if (!data.is_active) {
        router.push('/pregnancy/register')
        return
      }

      pregnancyInfo.value = {
        babyName: data.baby_name,
        dueDate: data.due_date,
        currentWeek: data.current_week,
        highRisk: data.high_risk,
        isPregnant: true,
        pregnancyId: data.pregnancy_id,
        isFromRegistration: data.is_from_registration || false,
        isActive: data.is_active
      }

      // 수정 모드 초기값 설정
      isEditMode.value = true
    } else {
      // 임신 정보가 없는 경우 리다이렉트
      router.push('/pregnancy/register')
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.detail || '임신 정보를 불러오는 중 오류가 발생했습니다.'
    // 오류 발생 시에도 리다이렉트
    router.push('/pregnancy/register')
  } finally {
    isLoading.value = false
  }
}

// 수정 모드 활성화 함수 (이제 필요 없을 수 있지만, 다른 로직에서 사용될 수 있으므로 유지)
const enableEditMode = () => {
  isEditMode.value = true
}

// 컴포넌트 마운트 시 임신 정보 불러오기
onMounted(async () => {
  await fetchPregnancyInfo()
  // fetchPregnancyInfo 내부에서 isEditMode를 true로 설정하므로 여기서 별도 설정 불필요
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
    
    // 마지막 생리일로 계산한 경우는 이미 계산이 완료되었으니 넘어감
    // 출산예정일만 입력된 경우에는 임신주차 계산, 임신주차만 입력된 경우에는 출산예정일 계산
    if (pregnancyInfo.value.dueDate && !pregnancyInfo.value.currentWeek) {
      // 입력값이 데이터베이스에 그대로 저장되도록 calculateWeekFromDueDate 사용하지 않음
      // 관리자에게 알림
      alert('출산 예정일만 입력되었습니다. 임신 주차도 함께 입력하시는 것이 좋습니다.')
    } else if (!pregnancyInfo.value.dueDate && pregnancyInfo.value.currentWeek) {
      // 입력값이 데이터베이스에 그대로 저장되도록 calculateDueDateFromWeek 사용하지 않음
      // 관리자에게 알림
      alert('임신 주차만 입력되었습니다. 출산 예정일도 함께 입력하시는 것이 좋습니다.')
    }

    // 추가: 출산 예정일이 과거 날짜이면 경고 및 저장 중단
    if (pregnancyInfo.value.dueDate) {
      const dueDateObj = new Date(pregnancyInfo.value.dueDate)
      const today = new Date()
      if (dueDateObj <= today) {
        alert('출산 예정일은 미래 날짜여야 합니다.')
        return
      }
    }
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    let response
    // API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk,
      is_active: true
      // is_active는 여기서 관리하지 않음 (삭제 버튼으로 처리)
      // is_from_registration: pregnancyInfo.value.isFromRegistration // 이 필드가 필요하다면 유지
    }

    // isPregnant 상태는 이제 UI 표시용 또는 다른 로직용으로만 사용될 수 있음
    // 저장 시 isPregnant 값 자체를 보내지 않거나, 백엔드에서 is_active와 연동되지 않도록 처리 필요
    // 여기서는 isPregnant 값에 따라 생성/수정만 하도록 유지

    if (pregnancyInfo.value.pregnancyId) {
      // 기존 임신 정보 업데이트
      response = await api.put(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`, requestData)
    } else {
      // 새 임신 정보 생성 (is_active는 기본값 True로 생성될 것으로 가정)
      response = await api.post('/accounts/pregnancies/', requestData)
      pregnancyInfo.value.pregnancyId = response.data.pregnancy_id
    }

    // 저장 성공 메시지
    alert('임신 정보가 성공적으로 저장되었습니다.')

    // 프로필 페이지로 이동
    router.push('/profile')

  } catch (error) {
    errorMessage.value = error.response?.data?.detail || '임신 정보 저장 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

// 임신 정보 삭제 (비활성화) 함수 수정
const deletePregnancyInfo = async () => {
  if (!pregnancyInfo.value.pregnancyId) {
    alert('삭제할 임신 정보가 없습니다.')
    return
  }

  // 사용자 확인
  if (!confirm('정말로 임신 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // PATCH 요청으로 모든 필드 초기화 및 is_active를 false로 설정
    const resetData = {
      baby_name: null,        // 태명 초기화
      due_date: null,         // 출산예정일 초기화
      current_week: 1,     // 임신 주차 초기화
      high_risk: false,       // 고위험 임신 여부 false로 설정
      is_active: false        // 비활성화
    }

    await api.put(`/accounts/pregnancies/${pregnancyInfo.value.pregnancyId}/`, resetData)

    // 성공 메시지
    alert('임신 정보가 삭제되었습니다.')

    // 임신 정보 등록 페이지로 리다이렉트
    router.push('/profile')

  } catch (error) {
    errorMessage.value = error.response?.data?.detail || '임신 정보 삭제 중 오류가 발생했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

// 뒤로 가기
const goBack = () => {
  // 뒤로 가기 대신 프로필 페이지로 이동하도록 변경할 수도 있습니다.
  router.push('/profile')
  // 또는 기존처럼 router.go(-1) 유지
  // router.go(-1)
}

// 출산까지 남은 일수 계산
const getDaysUntilDueDate = () => {
  if (!pregnancyInfo.value.dueDate) return 0
  
  const dueDate = new Date(pregnancyInfo.value.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
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
      <div v-if="isEditMode" class="bg-white rounded-lg shadow-md p-6 mb-4">
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
            누리달에서 맞춤 서비스를 제공해 드립니다
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
              :max="todayDate"
            >
            <p class="text-xs text-gray-500 mt-1">
              마지막 생리 시작일을 입력하시면 임신 주차와 출산예정일이 자동으로 계산됩니다. 정확하지 않으니 반드시 의사와 상담하세요.
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
      <div v-if="isEditMode" class="flex flex-col space-y-3">
        <button
          class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
          :disabled="isSubmitting"
          @click="savePregnancyInfo"
        >
          <span v-if="isSubmitting">처리 중...</span>
          <span v-else>저장하기</span>
        </button>

        <!-- 임신 정보 삭제 버튼 조건 수정 (pregnancyId 존재 여부만 확인) -->
        <button
          v-if="pregnancyInfo.pregnancyId && pregnancyInfo.isActive"
          class=""
          :disabled="isSubmitting"
          @click="deletePregnancyInfo"
        >
          <span v-if="isSubmitting">_</span>
          <span v-else>임신 정보 삭제</span>
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
