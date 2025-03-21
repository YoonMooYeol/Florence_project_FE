<!-- eslint-disable no-trailing-spaces -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import api from '@/utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()
const authStore = useAuthStore()

// 사용자 정보
const userInfo = ref({
  name: '',
  email: '',
  phone: '',
  gender: '',
  isPregnant: false,
  dueDate: '',
  pregnancyWeek: null,
  babyNickname: '',
  highRisk: false,
  pregnancyId: null,
  isFromRegistration: false
})

// 로딩 상태 관리
const isLoading = ref(false)
const errorMessage = ref('')

// 사용자 정보 불러오기
const fetchUserInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 토큰 확인
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (!token) {
      throw new Error('인증 토큰이 없습니다.')
    }

    // API를 통해 본인 정보 조회
    const response = await api.get('/accounts/users/me/')
    console.log('사용자 정보 응답:', response.data)

    // 사용자 기본 정보 설정
    userInfo.value.name = response.data.name || '사용자'
    userInfo.value.email = response.data.email || ''
    userInfo.value.phone = response.data.phone || ''
    userInfo.value.gender = response.data.gender || ''

    // 로컬 스토리지 및 세션 스토리지에 사용자 정보 저장
    if (localStorage.getItem('rememberMe') === 'true') {
      localStorage.setItem('userName', userInfo.value.name)
      localStorage.setItem('userEmail', userInfo.value.email)
    } else {
      sessionStorage.setItem('userName', userInfo.value.name)
      sessionStorage.setItem('userEmail', userInfo.value.email)
    }

    // 임신 정보 불러오기
    await fetchPregnancyInfo()
  } catch (error) {
    console.error('사용자 정보 불러오기 오류:', error)
    
    if (error.response?.status === 401) {
      // 인증 오류인 경우 로그인 페이지로 리다이렉트
      router.push('/login')
      return
    }
    
    errorMessage.value = error.response?.data?.detail || error.message || '사용자 정보를 불러오는 중 오류가 발생했습니다.'

    // API 호출 실패 시 로컬 스토리지에서 정보 가져오기
    userInfo.value.name = localStorage.getItem('userName') || sessionStorage.getItem('userName') || '사용자'
    userInfo.value.email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || ''
  } finally {
    isLoading.value = false
  }
}

// 임신 정보 불러오기
const fetchPregnancyInfo = async () => {
  try {
    const response = await api.get('/accounts/pregnancies/')

    // 임신 정보가 있는 경우
    if (response.data && response.data.length > 0) {
      const data = response.data[0] // 가장 최근 임신 정보 사용

      userInfo.value.isPregnant = true
      userInfo.value.babyNickname = data.baby_name
      userInfo.value.dueDate = data.due_date
      userInfo.value.pregnancyWeek = data.current_week
      userInfo.value.highRisk = data.high_risk
      userInfo.value.pregnancyId = data.pregnancy_id
      userInfo.value.isFromRegistration = data.is_from_registration || false // 회원가입 시 등록 여부 설정

      // 임신 상태 저장
      localStorage.setItem('isPregnant', 'true')
      sessionStorage.setItem('isPregnant', 'true')
    } else {
      // 임신 정보가 없는 경우
      userInfo.value.isPregnant = false
      localStorage.setItem('isPregnant', 'false')
      sessionStorage.setItem('isPregnant', 'false')
    }
  } catch (error) {
    console.error('임신 정보 불러오기 오류:', error)
    throw error
  }
}

// 컴포넌트 마운트 시 사용자 정보 불러오기
onMounted(fetchUserInfo)

// 출산 예정일까지 남은 일수 계산 함수
const getDaysUntilDueDate = () => {
  if (!userInfo.value.dueDate) return 0

  const today = new Date()
  const dueDate = new Date(userInfo.value.dueDate)

  // 날짜 차이 계산 (밀리초 단위)
  const diffTime = dueDate.getTime() - today.getTime()

  // 일수로 변환
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays > 0 ? diffDays : 0
}

// 받침 유무에 따라 적절한 조사 선택 함수
const getJosa = (word, josa1, josa2) => {
  if (!word || word.length === 0) return josa1

  // 마지막 글자의 유니코드 값
  const charCode = word.charCodeAt(word.length - 1)

  // 한글 유니코드 범위 및 받침 유무 확인
  // 한글 유니코드: AC00(가) ~ D7A3(힣)
  // 받침이 있으면 (charCode - AC00) % 28 != 0
  if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
    return (charCode - 0xAC00) % 28 > 0 ? josa1 : josa2
  }

  // 한글이 아닌 경우 기본값 반환
  return josa1
}

// 임신 정보 수정 페이지로 이동
const goToPregnancyEdit = () => {
  if (userInfo.value.isPregnant) {
    // 임신 정보가 있는 경우 수정 페이지로 이동
    router.push('/pregnancy-info-edit')
  } else {
    // 임신 정보가 없는 경우 등록 페이지로 이동
    router.push('/pregnancy-info-register')
  }
}

// 로그아웃 함수
const handleLogout = async () => {
  try {
    // auth 스토어의 로그아웃 함수 호출
    await authStore.logout()

    // 로그아웃 메시지 표시
    alert('로그아웃 되었습니다.')

    // 로그인 페이지로 명시적 이동
    router.push('/login')
  } catch (error) {
    console.error('로그아웃 처리 중 오류:', error)
    alert('로그아웃 처리 중 오류가 발생했습니다.')
    
    // 오류가 발생해도 로그인 페이지로 이동
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-3 sm:p-4 shadow-md">
      <h1 class="text-lg sm:text-xl font-bold text-center text-dark-gray">
        마이페이지
      </h1>
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-3 sm:p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-sm sm:text-base text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 에러 메시지 표시 -->
    <div
      v-if="errorMessage"
      class="p-3 sm:p-4 mb-3 sm:mb-4 text-center text-sm sm:text-base text-red-700 bg-red-100"
    >
      {{ errorMessage }}
    </div>

    <!-- 사용자 정보 섹션 -->
    <div
      v-if="!isLoading"
      class="p-3 sm:p-4 mt-3 sm:mt-4 pb-20"
    >
      <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-3 sm:mb-4">
        <div class="flex items-center mb-3 sm:mb-4">
          <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center mr-3 sm:mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 sm:h-10 sm:w-10 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-dark-gray">
              {{ userInfo.name }}
            </h2>
            <p class="text-xs sm:text-sm text-gray-500">
              {{ userInfo.email }}
            </p>
          </div>
        </div>

        <!-- 임신 정보 섹션 -->
        <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-3 sm:mb-4">
          <div class="flex justify-between items-center mb-3 sm:mb-4">
            <!-- 임신 정보가 있을 때만 표시 -->
            <h2 v-if="userInfo.isPregnant" class="text-base sm:text-lg font-bold text-dark-gray">
              ♥︎사랑스런 {{ userInfo.babyNickname }}{{ getJosa(userInfo.babyNickname, '과', '와') }} 만나기까지♥︎
            </h2>
          </div>

          <!-- 임신 정보가 있을 때만 표시 -->
          <div v-if="userInfo.isPregnant" class="space-y-3 sm:space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm sm:text-base text-gray-600">출산 예정일</span>
              <span class="text-sm sm:text-base font-medium text-dark-gray">{{ formatDate(userInfo.dueDate) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm sm:text-base text-gray-600">현재 임신 주차</span>
              <span class="text-sm sm:text-base font-medium text-dark-gray">{{ userInfo.pregnancyWeek }}주</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm sm:text-base text-gray-600">출산까지 남은 일수</span>
              <span class="text-sm sm:text-base font-medium text-dark-gray">{{ getDaysUntilDueDate() }}일</span>
            </div>
          </div>

          <!-- 임신 정보가 없을 때 표시 -->
          <div v-else class="text-center py-4">
            <p class="text-sm sm:text-base text-gray-600 mb-3">
              아직 등록된 임신 정보가 없습니다.
            </p>
            <button
              class="px-4 py-2 text-sm sm:text-base bg-point-yellow text-dark-gray rounded-lg hover:bg-yellow-400 transition-colors focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="goToPregnancyEdit"
            >
              임신 정보 등록하기
            </button>
          </div>
        </div>

        <!-- 계정 관리 섹션 -->
        <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 class="text-base sm:text-lg font-bold text-dark-gray mb-3 sm:mb-4">
            계정 관리
          </h2>
          <div class="space-y-3 sm:space-y-4">
            <button
              class="w-full px-4 py-2.5 text-sm sm:text-base text-dark-gray bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              @click="router.push('/user-info-edit')"
            >
              개인정보 수정
            </button>
            <button
              class="w-full px-4 py-2.5 text-sm sm:text-base text-dark-gray bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              @click="router.push('/password-change')"
            >
              비밀번호 변경
            </button>
            <button
              class="w-full px-4 py-2.5 text-sm sm:text-base text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
              @click="handleLogout"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar />
  </div>
</template>

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
.text-dark-gray {
  color: #353535;
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  .space-y-3 {
    margin-top: 0.75rem;
  }

  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
}
</style>
