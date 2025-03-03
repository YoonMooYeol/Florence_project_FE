<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 폼 데이터 관리
const formData = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// 유효성 검사 오류 메시지
const errors = reactive({
  email: '',
  password: '',
  form: ''
})

// 제출 상태 관리
const isSubmitting = ref(false)

// 폼 유효성 검사 함수
const validateForm = () => {
  let isValid = true

  // 이메일 검증
  if (!formData.email.trim()) {
    errors.email = '이메일을 입력해주세요'
    isValid = false
  } else {
    errors.email = ''
  }

  // 비밀번호 검증
  if (!formData.password) {
    errors.password = '비밀번호를 입력해주세요'
    isValid = false
  } else {
    errors.password = ''
  }

  return isValid
}

// 로그인 정보와 토큰을 저장하는 함수
const saveLoginState = (userData) => {
  if (formData.rememberMe) {
    // 로그인 유지를 선택한 경우 로컬 스토리지에 저장 (브라우저를 닫아도 유지)
    localStorage.setItem('rememberMe', 'true')
    localStorage.setItem('userEmail', formData.email)
    localStorage.setItem('userName', userData.name)
    localStorage.setItem('userId', userData.user_id)
    localStorage.setItem('isPregnant', userData.is_pregnant)
    localStorage.setItem('accessToken', userData.tokens.access)
    localStorage.setItem('refreshToken', userData.tokens.refresh)
  } else {
    // 로그인 유지를 선택하지 않은 경우 세션 스토리지에 저장 (브라우저 닫으면 삭제)
    sessionStorage.setItem('userEmail', formData.email)
    sessionStorage.setItem('userName', userData.name)
    sessionStorage.setItem('userId', userData.user_id)
    sessionStorage.setItem('isPregnant', userData.is_pregnant)
    sessionStorage.setItem('accessToken', userData.tokens.access)
    sessionStorage.setItem('refreshToken', userData.tokens.refresh)

    // 로컬 스토리지에서 기존 데이터 삭제
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('isPregnant')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
}

// 저장된 로그인 정보 확인
const checkSavedLogin = () => {
  const savedRememberMe = localStorage.getItem('rememberMe')
  const savedEmail = localStorage.getItem('userEmail')
  const accessToken = localStorage.getItem('accessToken')

  if (savedRememberMe === 'true' && savedEmail && accessToken) {
    formData.email = savedEmail
    formData.rememberMe = true
  }
}

// 컴포넌트 마운트 시 저장된 로그인 정보 확인
checkSavedLogin()

// 로그인 API 호출 함수
const loginApi = async (email, password) => {
  const response = await axios.post('http://127.0.0.1:8000/v1/accounts/login/', {
    email,
    password
  })
  return response.data
}

// 로그인 처리 함수
const handleSubmit = async () => {
  errors.form = ''

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // 로그인 API 호출
    const userData = await loginApi(formData.email, formData.password)

    // 로그인 정보와 토큰 저장
    saveLoginState(userData)

    // 로그인 성공 메시지 표시
    alert(userData.message)

    // 홈 페이지로 이동
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (error) {
    errors.form = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
  } finally {
    isSubmitting.value = false
  }
}

// 페이지 이동 함수들
const goToRegister = () => {
  router.push('/register')
}

const goToFindId = () => {
  // 아이디 찾기 구현 예정
}

const goToFindPassword = () => {
  // 비밀번호 찾기 구현 예정
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">
      <!-- 헤더 -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-dark-gray">
          하트비트
        </h1>
        <p class="mt-2 text-dark-gray">
          로그인
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-md"
      >
        {{ errors.form }}
      </div>

      <!-- 로그인 폼 -->
      <form
        class="p-6 bg-white rounded-lg shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 이메일 입력 -->
        <div class="mb-4">
          <label
            for="email"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >이메일</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="이메일을 입력하세요"
          >
          <p
            v-if="errors.email"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.email }}
          </p>
        </div>

        <!-- 비밀번호 입력 -->
        <div class="mb-4">
          <label
            for="password"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >비밀번호</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 입력하세요"
          >
          <p
            v-if="errors.password"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.password }}
          </p>
        </div>

        <!-- 로그인 유지 체크박스 -->
        <div class="mb-6">
          <label class="flex items-center">
            <input
              v-model="formData.rememberMe"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-dark-gray">로그인 유지</span>
          </label>
        </div>

        <!-- 버튼 섹션 -->
        <div class="flex flex-col space-y-3">
          <!-- 로그인 버튼 -->
          <button
            type="submit"
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>로그인</span>
          </button>

          <!-- 소셜 로그인 섹션 -->
          <div class="mt-6 mb-4">
            <div class="flex items-center justify-center mb-5">
              <hr class="flex-grow border-gray-300">
              <span class="px-4 text-sm font-medium text-gray-500">간편 로그인</span>
              <hr class="flex-grow border-gray-300">
            </div>

            <div class="flex flex-col space-y-3">
              <!-- 소셜 로그인 버튼 -->
              <button
                type="button"
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                    fill="#4285F4"
                  />
                </svg>
                <span>구글 계정으로 로그인</span>
              </button>

              <button
                type="button"
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-800 bg-[#FEE500] border border-[#FEE500] rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3C6.48 3 2 6.48 2 11c0 2.95 1.83 5.52 4.53 6.97V21l4.13-2.48c.43.05.86.08 1.34.08 5.52 0 10-3.48 10-8s-4.48-8-10-8z"
                    fill="#3A1D1D"
                  />
                </svg>
                <span>카카오 계정으로 로그인</span>
              </button>

              <button
                type="button"
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-[#03C75A] border border-[#03C75A] rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 8.8V15h-2.6L11 11.5V15H8V8.8h2.5l2.5 3.5V8.8H16z"
                    fill="white"
                  />
                </svg>
                <span>네이버 계정으로 로그인</span>
              </button>

              <button
                type="button"
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-black border border-black rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.05 20.28c-.98.95-2.05.88-3.08.45-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.47C2.7 15.25 3.78 7.46 9.02 7.18c1.59-.08 2.58.73 3.56.78 1.37-.21 2.44-1.05 3.82-.84 1.63.25 2.83 1.19 3.41 2.77-3.4 2.11-2.2 6.89.93 8.35-.7 1.43-1.47 2.87-3.69 2.04zm-5.35-14.6c-.12-2.13 1.99-4.04 3.98-4.2.29 2.47-2.38 4.32-3.98 4.2z"
                    fill="white"
                  />
                </svg>
                <span>애플 계정으로 로그인</span>
              </button>
            </div>
          </div>

          <!-- 링크 모음 -->
          <div class="flex justify-center items-center space-x-4 mt-4 text-sm">
            <a
              href="#"
              class="text-dark-gray hover:underline"
              @click.prevent="goToFindId"
            >
              아이디 찾기
            </a>
            <span class="text-gray-300">|</span>
            <a
              href="#"
              class="text-dark-gray hover:underline"
              @click.prevent="goToFindPassword"
            >
              비밀번호 찾기
            </a>
            <span class="text-gray-300">|</span>
            <a
              href="#"
              class="text-point-yellow hover:underline font-medium"
              @click.prevent="goToRegister"
            >
              회원가입하기
            </a>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
