<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import api from '@/utils/axios'

const router = useRouter()
const authStore = useAuthStore()

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
  // 액세스 토큰과 리프레시 토큰 저장
  authStore.setAccessToken(userData.tokens.access)
  authStore.setRefreshToken(userData.tokens.refresh)

  // 로그인 유지를 선택한 경우 로컬 스토리지에 저장 (브라우저를 닫아도 유지)
  if (formData.rememberMe) {
    localStorage.setItem('rememberMe', 'true')
    localStorage.setItem('userEmail', formData.email)
    localStorage.setItem('userName', userData.name)
    localStorage.setItem('userId', userData.user_id)
    localStorage.setItem('isPregnant', userData.is_pregnant)
  } else {
    // 로그인 유지를 선택하지 않은 경우 세션 스토리지에 저장 (브라우저 닫으면 삭제)
    sessionStorage.setItem('userEmail', formData.email)
    sessionStorage.setItem('userName', userData.name)
    sessionStorage.setItem('userId', userData.user_id)
    sessionStorage.setItem('isPregnant', userData.is_pregnant)

    // 로컬 스토리지에서 기존 데이터 삭제
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userId')
    localStorage.removeItem('isPregnant')
  }
}

// 저장된 로그인 정보 확인
const checkSavedLogin = () => {
  const savedRememberMe = localStorage.getItem('rememberMe')
  const savedEmail = localStorage.getItem('userEmail')
  const accessToken = localStorage.getItem('accessToken') || authStore.accessToken

  if (savedRememberMe === 'true' && savedEmail && accessToken) {
    formData.email = savedEmail
    formData.rememberMe = true
  }
}

// 이미 로그인된 사용자인지 확인
const checkAlreadyLoggedIn = () => {
  const accessToken = localStorage.getItem('accessToken') || authStore.accessToken || sessionStorage.getItem('accessToken')
  const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName')

  if (accessToken && userName) {
    // 이미 로그인된 상태이므로 캘린더 페이지로 리다이렉팅
    router.push('/calendar')
    return true
  }
  return false
}

// 컴포넌트 마운트 시 로그인 상태 확인
onMounted(() => {
  // 이미 로그인된 사용자인지 확인
  if (checkAlreadyLoggedIn()) {
    return
  }

  // 저장된 로그인 정보 확인
  checkSavedLogin()
})

// 로그인 API 호출 함수
const loginApi = async (email, password) => {
  const response = await api.post('/accounts/login/', {
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

    // 캘린더 페이지로 이동
    router.push('/calendar')
  } catch (error) {
    errors.form = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
  } finally {
    isSubmitting.value = false
  }
}

// 카카오 로그인 실행 함수
const initiateKakaoLogin = () => {
  try {
    // 카카오 REST API 키
    const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY
    if (!KAKAO_REST_API_KEY) {
      alert('카카오 로그인을 위한 설정이 완료되지 않았습니다. 관리자에게 문의하세요.')
      return
    }

    // 향후 통합된 콜백 URL로 변경할 수 있지만, 현재는 호환성을 위해 원래 URL 유지
    const REDIRECT_URI = 'https://nooridal.com/v1/accounts/kakao/callback'

    // 카카오 인증 페이지로 리다이렉션
    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`
    
    // 새로운 통합 콜백 사용 시:
    // const NEW_REDIRECT_URI = `${window.location.origin}/auth/callback/kakao`
    // window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${NEW_REDIRECT_URI}&response_type=code`
  } catch (error) {
    alert('카카오 로그인 초기화 중 오류가 발생했습니다: ' + error.message)
  }
}

// 네이버 로그인 실행 함수
const initiateNaverLogin = () => {
  try {
    // 네이버 Client ID
    const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID

    if (!NAVER_CLIENT_ID) {
      alert('네이버 로그인을 위한 설정이 완료되지 않았습니다. 관리자에게 문의하세요.')
      return
    }

    // 향후 통합된 콜백 URL로 변경할 수 있지만, 현재는 호환성을 위해 원래 URL 유지
    const REDIRECT_URI_RAW = 'https://nooridal.com/v1/accounts/naver/callback'
    const REDIRECT_URI = encodeURIComponent(REDIRECT_URI_RAW)

    // 상태 토큰 (CSRF 방지)
    const STATE = Math.random().toString(36).substring(2, 15)

    // 상태 토큰 저장
    localStorage.setItem('naverLoginState', STATE)

    // 네이버 인증 URL 생성
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}`

    // 네이버 인증 페이지로 리다이렉션
    window.location.href = authUrl
    
    // 새로운 통합 콜백 사용 시:
    // const NEW_REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/callback/naver`)
    // const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${NEW_REDIRECT_URI}&state=${STATE}`
  } catch (error) {
    alert('네이버 로그인 초기화 중 오류가 발생했습니다: ' + error.message)
  }
}

// 구글 로그인 실행 함수
const initiateGoogleLogin = () => {
  try {
    // 구글 Client ID
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!GOOGLE_CLIENT_ID) {
      alert('구글 로그인을 위한 설정이 완료되지 않았습니다. 관리자에게 문의하세요.')
      return
    }

    // 향후 통합된 콜백 URL로 변경할 수 있지만, 현재는 호환성을 위해 원래 URL 유지
    const REDIRECT_URI_RAW = 'https://nooridal.com/v1/accounts/google/callback/'
    const REDIRECT_URI = encodeURIComponent(REDIRECT_URI_RAW)

    // 범위 설정 (이메일, 프로필 정보)
    const SCOPE = encodeURIComponent('email profile')

    // 구글 인증 URL 생성
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&access_type=offline&include_granted_scopes=true`

    // 구글 인증 페이지로 리다이렉션
    window.location.href = authUrl
    
    // 새로운 통합 콜백 사용 시:
    // const NEW_REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/callback/google`)
    // const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${NEW_REDIRECT_URI}&scope=${SCOPE}&access_type=offline&include_granted_scopes=true`
  } catch (error) {
    alert('구글 로그인 초기화 중 오류가 발생했습니다: ' + error.message)
  }
}

// 페이지 이동 함수들
const goToRegister = () => {
  // 유효성 검사 메시지 초기화
  errors.email = ''
  errors.password = ''
  errors.form = ''
  router.push('/register')
}

// 아이디 찾기 페이지로 이동
const goToFindId = () => {
  router.push('/find-id')
}

// 비밀번호 찾기 페이지로 이동
const goToFindPassword = () => {
  router.push('/find-password')
}

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">
      <!-- 헤더 -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-dark-gray">
          누리달
        </h1>
        <p class="mt-2 text-dark-gray">
          로그인
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-[20px]"
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
            class="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
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
            class="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
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
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
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
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-800 bg-[#FEE500] border border-[#FEE500] rounded-[20px] shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
                @click="initiateKakaoLogin"
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
                class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-[#03C75A] border border-[#03C75A] rounded-[20px] shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
                @click="initiateNaverLogin"
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
            </div>
          </div>

          <!-- 링크 모음 -->
          <div class="flex justify-center items-center space-x-4 mt-4 text-sm">
            <button
              class="text-dark-gray hover:underline"
              @click="goToFindId"
            >
              아이디 찾기
            </button>
            <span class="text-gray-400">|</span>
            <button
              class="text-dark-gray hover:underline"
              @click="goToFindPassword"
            >
              비밀번호 찾기
            </button>
            <span class="text-gray-400">|</span>
            <button
              class="text-point-yellow hover:text-yellow-600"
              @click="goToRegister"
            >
              회원가입
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
