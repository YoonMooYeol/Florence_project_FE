<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()

// 사용자 정보
const userInfo = ref({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  gender: ''
})

// 오류 메시지 객체
const errors = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  form: '' // 일반적인 오류 메시지
})

// 로딩 상태 관리
const isLoading = ref(false)
const isSubmitting = ref(false)

// 전화번호 자동 형식화 함수
const formatPhoneNumber = (value) => {
  if (!value) return ''
  
  // 숫자만 추출
  const numericValue = value.replace(/\D/g, '')
  
  // 길이에 따라 포맷팅
  if (numericValue.length <= 3) {
    return numericValue
  } else if (numericValue.length <= 7) {
    return `${numericValue.slice(0, 3)}-${numericValue.slice(3)}`
  } else {
    return `${numericValue.slice(0, 3)}-${numericValue.slice(3, 7)}-${numericValue.slice(7, 11)}`
  }
}

// 전화번호 입력 처리
const handlePhoneInput = (event) => {
  // 기존 에러 메시지 초기화
  clearFieldError('phone_number')
  
  // 현재 입력값 저장
  const input = event.target
  
  // 입력 값 형식화
  userInfo.value.phone_number = formatPhoneNumber(input.value)
  
  // 커서를 항상 맨 끝으로 이동
  setTimeout(() => {
    const len = userInfo.value.phone_number.length
    input.setSelectionRange(len, len)
  }, 0)
}

// 오류 필드 초기화
const clearErrors = () => {
  errors.username = ''
  errors.name = ''
  errors.email = ''
  errors.phone_number = ''
  errors.form = ''
}

// 각 필드 입력 시 해당 필드의 오류 메시지 초기화
const clearFieldError = (field) => {
  if (errors[field]) {
    errors[field] = ''
  }
}

// 사용자 정보 불러오기
const fetchUserInfo = async () => {
  isLoading.value = true
  clearErrors()

  try {
    // API를 통해 본인 정보 조회
    const response = await api.get('/accounts/users/me/')
    console.log('사용자 정보 응답 데이터:', response.data)

    // 사용자 기본 정보 설정
    userInfo.value.username = response.data.username || ''
    userInfo.value.name = response.data.name || ''
    userInfo.value.email = response.data.email || ''
    userInfo.value.phone_number = response.data.phone_number || ''
    userInfo.value.gender = response.data.gender || ''
  } catch (error) {
    console.error('사용자 정보 불러오기 오류:', error)
    errors.form = error.response?.data?.detail || '사용자 정보를 불러오는 중 오류가 발생했습니다.'

    // API 호출 실패 시 로컬 스토리지에서 정보 가져오기
    userInfo.value.name = localStorage.getItem('userName') || sessionStorage.getItem('userName') || ''
    userInfo.value.email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || ''
  } finally {
    isLoading.value = false
  }
}

// 유효성 검사 함수
const validateForm = () => {
  let isValid = true

  // 사용자명 검증
  if (!userInfo.value.username.trim()) {
    errors.username = '아이디를 입력해주세요'
    isValid = false
  } else {
    errors.username = ''
  }

  // 이름 검증
  if (!userInfo.value.name.trim()) {
    errors.name = '닉네임을 입력해주세요'
    isValid = false
  } else {
    errors.name = ''
  }

  return isValid
}

// 수정된 정보를 저장하는 함수
const saveUserInfo = async () => {
  clearErrors()

  // 폼 유효성 검사
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // API 요청 데이터 준비
    const requestData = {
      username: userInfo.value.username,
      name: userInfo.value.name,
      email: userInfo.value.email,
      phone_number: userInfo.value.phone_number || null
    }

    // 요청 데이터 로깅
    console.log('요청 데이터:', requestData)

    // 사용자 정보 업데이트 API 호출
    const response = await api.put('/accounts/users/me/', requestData)
    console.log('응답 데이터:', response.data)

    // 로컬 스토리지 및 세션 스토리지 업데이트
    localStorage.setItem('userName', userInfo.value.name)
    sessionStorage.setItem('userName', userInfo.value.name)
    localStorage.setItem('userEmail', userInfo.value.email)
    sessionStorage.setItem('userEmail', userInfo.value.email)

    // 저장 성공 메시지
    alert('정보가 성공적으로 저장되었습니다.')

    // 프로필 페이지로 이동
    router.push('/profile')
  } catch (error) {
    console.error('사용자 정보 저장 오류:', error)

    // 서버에서 오는 에러 메시지 처리
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errors.form = error.response.data
      } else if (error.response.data.detail) {
        errors.form = error.response.data.detail
      } else {
        // 필드별 에러 메시지 처리
        const fieldErrors = error.response.data

        Object.keys(fieldErrors).forEach(field => {
          if (errors[field] !== undefined) {
            errors[field] = Array.isArray(fieldErrors[field])
              ? fieldErrors[field][0]
              : fieldErrors[field]
          } else {
            // 알 수 없는 필드의 경우 일반 오류로 추가
            errors.form = `${field}: ${fieldErrors[field]}`
          }
        })

        if (Object.keys(fieldErrors).length === 0) {
          errors.form = '사용자 정보 저장 중 오류가 발생했습니다.'
        }
      }
    } else {
      errors.form = error.message || '사용자 정보 저장 중 오류가 발생했습니다.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// 뒤로 가기
const goBack = () => {
  router.go(-1)
}

// 컴포넌트 마운트 시 사용자 정보 불러오기
onMounted(fetchUserInfo)
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
        내 정보 관리
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

    <!-- 일반 에러 메시지 표시 -->
    <div
      v-if="errors.form"
      class="p-4 mb-4 text-center text-red-700 bg-red-100"
    >
      {{ errors.form }}
    </div>

    <!-- 사용자 정보 폼 -->
    <div
      v-if="!isLoading"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <!-- 프로필 이미지 섹션 -->
        <div class="flex flex-col items-center mb-6">
          <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-2 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
            <button class="absolute bottom-0 right-0 bg-point-yellow rounded-full p-1 shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-dark-gray"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-500">
            프로필 사진 변경
          </p>
        </div>

        <!-- 사용자명 입력 -->
        <div class="mb-4">
          <label
            for="username"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >아이디</label>
          <input
            id="username"
            v-model="userInfo.username"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @input="clearFieldError('username')"
          >
          <p
            v-if="errors.username"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.username }}
          </p>
        </div>

        <!-- 이름 입력 -->
        <div class="mb-4">
          <label
            for="name"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >닉네임</label>
          <input
            id="name"
            v-model="userInfo.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @input="clearFieldError('name')"
          >
          <p
            v-if="errors.name"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.name }}
          </p>
        </div>

        <!-- 이메일 입력 -->
        <div class="mb-4">
          <label
            for="email"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >이메일</label>
          <input
            id="email"
            v-model="userInfo.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow bg-gray-100"
            disabled
          >
          <p class="mt-1 text-xs text-gray-500">
            이메일은 변경할 수 없습니다
          </p>
          <p
            v-if="errors.email"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.email }}
          </p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-4">
          <label
            for="phone_number"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >전화번호</label>
          <div class="relative">
            <input
              id="phone_number"
              v-model="userInfo.phone_number"
              type="tel"
              maxlength="13"
              placeholder="010-0000-0000"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              @input="handlePhoneInput"
            >
          </div>
          <p
            v-if="errors.phone_number"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.phone_number }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            휴대폰 번호는 '-'없이 숫자만 입력하셔도 됩니다
          </p>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <button
        class="w-full p-4 bg-point-yellow rounded-lg shadow-md text-center text-dark-gray font-bold"
        :disabled="isSubmitting"
        @click="saveUserInfo"
      >
        <span v-if="isSubmitting">처리 중...</span>
        <span v-else>저장하기</span>
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
