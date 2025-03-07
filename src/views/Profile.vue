<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import api from '../utils/axios'
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
  pregnancyId: null
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

// 임신 정보 삭제 함수

// 로그아웃 함수
const handleLogout = () => {
  // auth 스토어의 로그아웃 함수 호출
  authStore.logout()

  // 로그아웃 메시지 표시
  alert('로그아웃 되었습니다.')

  // 로그인 페이지로 이동
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md">
      <h1 class="text-xl font-bold text-center text-dark-gray">
        마이페이지
      </h1>
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

    <!-- 사용자 정보 섹션 -->
    <div
      v-if="!isLoading"
      class="p-4 mt-4 pb-20"
    >
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="flex items-center mb-4">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-gray-500"
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
            <h2 class="text-lg font-bold text-dark-gray">
              {{ userInfo.name }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ userInfo.email }}
            </p>
          </div>
        </div>

        <!-- 임신 정보 섹션 -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-dark-gray">
              ♥︎사랑스런 {{ userInfo.babyNickname }}{{ getJosa(userInfo.babyNickname, '과', '와') }} 만나기까지♥︎
            </h2>
            <div
              v-if="userInfo.isPregnant"
              class="flex space-x-2"
            >
              <!-- <button
                class="px-3 py-1 text-sm bg-base-yellow rounded-md hover:bg-point-yellow text-dark-gray"
                @click="router.push('/pregnancy-info-edit')"
              >
                수정
              </button>
              <button
                class="px-3 py-1 text-sm bg-red-100 rounded-md hover:bg-red-200 text-red-600"
                @click="deletePregnancyInfo"
              >
                삭제
              </button> -->
            </div>
          </div>

          <div
            v-if="userInfo.isPregnant"
            class="space-y-4"
          >
            <!-- <div class="flex justify-between items-center">
              <span class="text-gray-600">태명</span>
              <span class="font-medium">{{ userInfo.babyNickname }}</span>
            </div> -->
            <div class="flex justify-between items-center">
              <span class="text-gray-600">출산 예정일</span>
              <span class="font-medium">{{ userInfo.dueDate }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">현재 임신 주차</span>
              <span class="font-medium">{{ userInfo.pregnancyWeek }}주차</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">출산까지 남은 일수</span>
              <span class="font-medium">{{ getDaysUntilDueDate() }}일</span>
            </div>
            <div
              v-if="userInfo.highRisk"
              class="flex items-center text-red-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="text-sm">고위험 임신</span>
            </div>
          </div>
          <div
            v-else
            class="text-center"
          >
            <p class="text-gray-500 mb-4">
              아직 임신 정보가 등록되지 않았습니다
            </p>
            <button
              class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
              @click="router.push('/pregnancy-info-edit')"
            >
              임신 정보 등록하기
            </button>
          </div>
        </div>
      </div>

      <!-- 메뉴 섹션 -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div class="divide-y divide-gray-100">
          <button
            class="w-full p-4 text-left flex items-center"
            @click="router.push('/user-info-edit')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fill-rule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-dark-gray">내 정보 관리</span>
          </button>

          <button
            class="w-full p-4 text-left flex items-center"
            @click="router.push('/pregnancy-info-edit')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg>
            <span class="text-dark-gray">임신 정보 입력</span>
          </button>

          <button class="w-full p-4 text-left flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-dark-gray">비밀번호 변경</span>
          </button>

          <button class="w-full p-4 text-left flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-dark-gray">공지사항</span>
          </button>

          <button class="w-full p-4 text-left flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-dark-gray">자주 묻는 질문</span>
          </button>

          <button class="w-full p-4 text-left flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-3 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-dark-gray">앱 정보</span>
          </button>
        </div>
      </div>

      <!-- 로그아웃 버튼 -->
      <button
        class="w-full p-4 bg-white rounded-lg shadow-md text-center text-red-500 font-medium"
        @click="handleLogout"
      >
        로그아웃
      </button>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="profile" />
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
