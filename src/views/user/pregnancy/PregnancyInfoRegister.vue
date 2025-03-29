<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
import { calculateWeekFromDueDate, calculateDueDateFromWeek, calculateFromLastPeriod } from '@/utils/dateUtils'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiMotherNurse } from '@mdi/js'

const router = useRouter()

const path = mdiMotherNurse

// 임신 정보 (실제 구현 시 API로 전송할 데이터)
const pregnancyInfo = ref({
  babyName: '',
  dueDate: '',
  currentWeek: 1,
  highRisk: false,
  pregnancyId: null,
  isPregnant: false, // 임신 여부
  lastPeriodDate: '' // 마지막 생리 시작일
})

// 단계별 상태 관리
const unknownInfo = ref({
  babyName: false,
  weekAndDueDate: false
})

// 입력 단계 관리 (1: 임신 여부, 2: 태명, 3: 주차와 예정일, 4: 고위험 여부)
const currentStep = ref(1)

// 로딩 상태 관리
const isSubmitting = ref(false)
const errorMessage = ref('')

// 현재 주차 옵션
const weekOptions = Array.from({ length: 40 }, (_, i) => i + 1)

// 단계별 입력 완료 여부 확인
const isStep1Complete = () => pregnancyInfo.value.isPregnant
const isStep2Complete = () => pregnancyInfo.value.babyName || unknownInfo.value.babyName
const isStep3Complete = () => {
  // 주차와 예정일을 모르는 경우, 마지막 생리일이 입력되어 있어야 함
  if (unknownInfo.value.weekAndDueDate) {
    return !!pregnancyInfo.value.lastPeriodDate
  }
  // 아니면 주차나 예정일 중 하나라도 입력되어 있어야 함
  return !!pregnancyInfo.value.dueDate || !!pregnancyInfo.value.currentWeek
}

// 다음 단계로 진행
const goToNextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

// 이전 단계로 돌아가기
const goToPrevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 출산예정일이 변경되면 임신 주차 자동 계산
watch(() => pregnancyInfo.value.dueDate, (newDueDate) => {
  if (newDueDate && !unknownInfo.value.weekAndDueDate) {
    pregnancyInfo.value.currentWeek = calculateWeekFromDueDate(newDueDate)
  }
})

// 임신 주차가 변경되면 출산예정일 자동 계산
watch(() => pregnancyInfo.value.currentWeek, (newWeek, oldWeek) => {
  // oldWeek이 있고 사용자가 주차와 예정일을 모르지 않는 경우에만 계산
  if (oldWeek && !unknownInfo.value.weekAndDueDate) {
    pregnancyInfo.value.dueDate = calculateDueDateFromWeek(newWeek)
  }
})

// 마지막 생리일이 변경되면 임신 주차와 출산예정일 계산
watch(() => pregnancyInfo.value.lastPeriodDate, (newDate) => {
  if (newDate && unknownInfo.value.weekAndDueDate) {
    const { currentWeek, dueDate } = calculateFromLastPeriod(newDate)
    pregnancyInfo.value.currentWeek = currentWeek
    pregnancyInfo.value.dueDate = dueDate
  }
})

// 임신 정보 저장 함수
const savePregnancyInfo = async () => {
  // 유효성 검사
  if (!pregnancyInfo.value.isPregnant) {
    alert('임신 여부를 선택해주세요.')
    return
  }

  if (!pregnancyInfo.value.babyName && !unknownInfo.value.babyName) {
    alert('태명을 입력해주세요.')
    return
  }

  // 태명이 없는 경우 기본값 설정
  if (unknownInfo.value.babyName) {
    pregnancyInfo.value.babyName = '우리 아기'
  }

  // 출산예정일이나 현재 임신 주차 중 하나는 반드시 있어야 함
  if (!pregnancyInfo.value.dueDate && !pregnancyInfo.value.currentWeek) {
    alert('출산 예정일 또는 현재 임신 주차 정보가 필요합니다.')
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

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // API 요청 데이터 준비
    const requestData = {
      baby_name: pregnancyInfo.value.babyName,
      due_date: pregnancyInfo.value.dueDate,
      current_week: pregnancyInfo.value.currentWeek,
      high_risk: pregnancyInfo.value.highRisk,
      is_from_registration: true // 회원가입 시 등록임을 표시
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
    router.push('/onboarding')
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
    router.push('/onboarding')
  }
}

// 고위험 임신 정보 모달
const showHighRiskInfoModal = ref(false)
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
    <div class="p-4 w-full max-w-md">
      <div class="bg-white rounded-[10px] shadow-md p-8 mb-4">
        <div class="flex justify-center mb-8">
          <div class="w-20 h-20 rounded-full bg-base-yellow flex items-center justify-center">
            <svg-icon
              type="mdi"
              :path="path"
              :size="52"
              class="text-dark-gray"
            ></svg-icon>
          </div>
        </div>
        <div class="mb-6 text-center">
          <h2 class="text-lg font-bold text-dark-gray">
            임신 정보를 입력해주세요
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            누리달에서 맞춤 서비스를 제공해 드립니다
          </p>
        </div>

        <!-- 에러 메시지 표시 -->
        <div
          v-if="errorMessage"
          class="p-3 mb-4 text-center text-red-700 bg-red-100 rounded-md"
        >
          {{ errorMessage }}
        </div>

        <!-- 단계 표시 -->
        <div class="flex justify-between mb-6">
          <div 
            v-for="step in 4" 
            :key="step" 
            class="flex flex-col items-center"
            :class="{ 'text-point-yellow font-bold': step === currentStep, 'text-gray-400': step !== currentStep }"
          >
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center mb-1"
              :class="step === currentStep ? 'bg-point-yellow text-dark-gray' : (step < currentStep ? 'bg-green-500 text-white' : 'bg-gray-200')"
            >
              {{ step }}
            </div>
            <span class="text-xs">
              {{ step === 1 ? '임신 여부' : step === 2 ? '태명' : step === 3 ? '임신 주차' : '고위험 여부' }}
            </span>
          </div>
        </div>

        <!-- 단계 1: 임신 여부 -->
        <div v-if="currentStep === 1">
          <div class="mb-6">
            <label class="flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="pregnancyInfo.isPregnant ? 'bg-base-yellow border-point-yellow' : 'bg-white border-gray-300 hover:bg-gray-100'">
              <input
                v-model="pregnancyInfo.isPregnant"
                type="checkbox"
                class="w-5 h-5 text-point-yellow border-gray-300 rounded focus:ring-point-yellow mr-3"
              >
              <span class="text-dark-gray font-medium">본인/배우자가 임신 중입니다</span>
            </label>
          </div>
          
          <div class="flex justify-end mt-8">
            <button
              class="px-6 py-2 bg-point-yellow rounded-md text-dark-gray font-bold shadow-sm hover:bg-yellow-400"
              :disabled="!isStep1Complete()"
              :class="{ 'opacity-50 cursor-not-allowed': !isStep1Complete() }"
              @click="goToNextStep"
            >
              다음
            </button>
          </div>
        </div>

        <!-- 단계 2: 태명 입력 -->
        <div v-if="currentStep === 2">
          <div class="mb-6">
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
            
            <label class="flex items-center mt-3">
              <input
                v-model="unknownInfo.babyName"
                type="checkbox"
                class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
              >
              <span class="ml-2 text-sm text-gray-500">태명이 없습니다</span>
            </label>
          </div>
          
          <div class="flex justify-between mt-8">
            <button
              class="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium shadow-sm hover:bg-gray-100"
              @click="goToPrevStep"
            >
              이전
            </button>
            <button
              class="px-6 py-2 bg-point-yellow rounded-md text-dark-gray font-bold shadow-sm hover:bg-yellow-400"
              :disabled="!isStep2Complete()"
              :class="{ 'opacity-50 cursor-not-allowed': !isStep2Complete() }"
              @click="goToNextStep"
            >
              다음
            </button>
          </div>
        </div>

        <!-- 단계 3: 임신 주차 및 출산 예정일 -->
        <div v-if="currentStep === 3">
          <div class="mb-6" v-if="!unknownInfo.weekAndDueDate">
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
              <p class="text-xs text-gray-500 mt-1">
                임신 주차를 선택하면 자동으로 계산됩니다. 필요 시 수정 가능합니다.
              </p>
            </div>
          </div>

          <!-- 임신 주차와 출산 예정일을 모를 경우 -->
          <div class="mb-4">
            <label class="flex items-center mb-3">
              <input
                v-model="unknownInfo.weekAndDueDate"
                type="checkbox"
                class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
              >
              <span class="ml-2 text-sm text-gray-700">현재 임신 주차와 출산 예정일을 모릅니다</span>
            </label>
            
            <div v-if="unknownInfo.weekAndDueDate" class="pl-6 mt-2 border-l-2 border-point-yellow">
              <label
                for="lastPeriodDate"
                class="block mb-2 text-sm font-medium text-dark-gray"
              >마지막 생리 시작일</label>
              <input
                id="lastPeriodDate"
                v-model="pregnancyInfo.lastPeriodDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              >
              <p class="text-xs text-gray-500 mt-1">
                마지막 생리 시작일을 기준으로 임신 주차와 출산 예정일을 계산합니다.
              </p>
              
              <div v-if="pregnancyInfo.lastPeriodDate" class="mt-4 p-3 bg-gray-100 rounded-md">
                <p class="text-sm text-dark-gray">계산된 결과:</p>
                <p class="text-sm text-dark-gray">
                  <span class="font-medium">임신 주차:</span> {{ pregnancyInfo.currentWeek }}주차
                </p>
                <p class="text-sm text-dark-gray">
                  <span class="font-medium">출산 예정일:</span> {{ pregnancyInfo.dueDate }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between mt-8">
            <button
              class="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium shadow-sm hover:bg-gray-100"
              @click="goToPrevStep"
            >
              이전
            </button>
            <button
              class="px-6 py-2 bg-point-yellow rounded-md text-dark-gray font-bold shadow-sm hover:bg-yellow-400"
              :disabled="!isStep3Complete()"
              :class="{ 'opacity-50 cursor-not-allowed': !isStep3Complete() }"
              @click="goToNextStep"
            >
              다음
            </button>
          </div>
        </div>

        <!-- 단계 4: 고위험 임신 여부 -->
        <div v-if="currentStep === 4">
          <div class="mb-6">
            <label class="flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors"
                  :class="pregnancyInfo.highRisk ? 'bg-red-100 border-red-300' : 'bg-white border-gray-300 hover:bg-gray-100'">
              <input
                v-model="pregnancyInfo.highRisk"
                type="checkbox"
                class="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500 mr-3"
              >
              <span class="text-dark-gray font-medium">고위험 임신입니다</span>
            </label>
            <p class="text-xs text-gray-500 mt-2 text-center flex justify-center items-center">
              <span class="underline cursor-pointer text-blue-500" @click="showHighRiskInfoModal = true">
                고위험 임신이란?
              </span>
            </p>
          </div>
          
          <div class="flex justify-between mt-8">
            <button
              class="px-6 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium shadow-sm hover:bg-gray-100"
              @click="goToPrevStep"
            >
              이전
            </button>
            <button
              class="px-6 py-2 bg-point-yellow rounded-md text-dark-gray font-bold shadow-sm hover:bg-yellow-400"
              :disabled="isSubmitting"
              @click="savePregnancyInfo"
            >
              <span v-if="isSubmitting">처리 중...</span>
              <span v-else>저장하기</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 건너뛰기 버튼 -->
      <div class="text-center mt-4">
        <button
          class="text-gray-500 hover:text-gray-700 font-medium"
          :disabled="isSubmitting"
          @click="skipForNow"
        >
          나중에 입력하기
        </button>
      </div>
    </div>

    <!-- 고위험 임신 정보 모달 -->
    <div v-if="showHighRiskInfoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-dark-gray">고위험 임신 기준</h3>
          <button @click="showHighRiskInfoModal = false" class="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="text-sm text-gray-700">
          <h4 class="font-bold mb-2 text-md">1. 산모의 건강 상태에 따른 고위험 임신 기준</h4>
          <ul class="list-disc pl-5 mb-4 space-y-1">
            <li>만 35세 이상(고령 임신) 또는 만 18세 이하</li>
            <li>고혈압, 당뇨병, 심장병, 신장병, 간 질환 등 만성질환</li>
            <li>갑상선 질환(갑상선 기능 항진증/저하증)</li>
            <li>자궁기형(쌍각자궁, 자궁중격 등) 또는 자궁근종</li>
            <li>자궁경부무력증(조기진통 위험)</li>
            <li>자간전증(임신 중독증) 병력</li>
            <li>자가면역질환(루푸스, 류마티스 관절염 등)</li>
            <li>비만(BMI 30 이상) 또는 저체중(BMI 18.5 이하)</li>
            <li>혈액응고 장애(항인지질증후군 등)</li>
            <li>유전적 질환(다운증후군, 혈우병 가족력 등)</li>
          </ul>
          
          <h4 class="font-bold mb-2 text-md">2. 임신 과정에서의 위험 요인</h4>
          <ul class="list-disc pl-5 mb-4 space-y-1">
            <li>다태 임신(쌍둥이, 세쌍둥이 등)</li>
            <li>과거 유산, 조산 또는 사산 경험</li>
            <li>태반 이상(전치태반, 태반 조기 박리)</li>
            <li>양수 이상(양수 과다증 또는 양수 과소증)</li>
            <li>자궁 내 성장 지연(IUGR)</li>
            <li>임신성 당뇨, 임신성 고혈압</li>
            <li>조기진통(임신 37주 이전 진통 발생)</li>
            <li>태아 기형 또는 유전 질환 진단</li>
          </ul>
          
          <h4 class="font-bold mb-2 text-md">3. 외부 환경 및 생활습관 요인</h4>
          <ul class="list-disc pl-5 mb-4 space-y-1">
            <li>흡연, 음주, 약물 복용</li>
            <li>심한 스트레스, 과로, 영양 불균형</li>
            <li>산재(산업재해) 위험이 높은 직업(야간 근무, 유해 물질 노출 등)</li>
          </ul>
          
          <p class="text-xs text-gray-500 mt-4">
            고위험 임신으로 체크하시면 맞춤형 정보를 제공해 드립니다. 위의 조건에 해당되신다면 체크해 주세요.
          </p>
        </div>
        
        <div class="mt-4 flex justify-end">
          <button 
            @click="showHighRiskInfoModal = false" 
            class="px-4 py-2 bg-point-yellow rounded-md text-dark-gray font-medium shadow-sm hover:bg-yellow-400">
            확인
          </button>
        </div>
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
