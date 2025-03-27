<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import api from '@/utils/axios'

// Global emailRegex declaration moved here
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = useRouter()
const authStore = useAuthStore()

// 폼 데이터 관리
const formData = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
  gender: '',
  is_pregnant: false,
  address: ''
})

// 유효성 검사 오류 메시지
const errors = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
  gender: '',
  address: '',
  form: ''
})

// 상태 관리 변수
const isSubmitting = ref(false)
const showSuccessMessage = ref(false)
const registeredUser = ref(null)

// 이메일 인증 관련 로직 추가
const verificationPopupVisible = ref(false)
const verificationCode = ref('')
const isSendingCode = ref(false)
const isVerifyingCode = ref(false)
const verificationStatus = ref('')

const email = ref('');
const isEmailVerified = ref(false);

const handleEmailVerification = async () => {
  if (!formData.email.trim()) {
    errors.email = '이메일을 입력하세요';
    return;
  }
  if (!emailRegex.test(formData.email)) {
    errors.email = '유효한 이메일 주소를 입력해주세요';
    return;
  }
  if (isEmailVerified.value) {
    // 재입력 클릭: 이메일 수정 가능하도록 상태 초기화
    isEmailVerified.value = false;
  } else {
    // 인증 요청 클릭: 실제 이메일 전송 API 호출
    await sendVerificationCode();
  }
};

// 이미 로그인된 사용자인지 확인
const checkAlreadyLoggedIn = () => {
  const accessToken = localStorage.getItem('accessToken') || authStore.accessToken || sessionStorage.getItem('accessToken')
  const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName')

  if (accessToken && userName) {
    router.push('/calendar')
    return true
  }
  return false
}

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
  formData.phone_number = formatPhoneNumber(input.value)
  
  // 커서를 항상 맨 끝으로 이동
  setTimeout(() => {
    const len = formData.phone_number.length
    input.setSelectionRange(len, len)
  }, 0)
}

// 컴포넌트 마운트 시 로그인 상태 확인 및 초기화
onMounted(() => {
  if (checkAlreadyLoggedIn()) {
    return
  }

  // 이벤트 리스너 등록
  window.addEventListener('message', handleAddressSelect)
})

// 폼 유효성 검사 함수
const validateForm = () => {
  let isValid = true

  // 사용자명 검증
  if (!formData.username.trim()) {
    errors.username = '아이디를 입력해주세요'
    isValid = false
  } else {
    errors.username = ''
  }

  // 이름 검증
  if (!formData.name.trim()) {
    errors.name = '이름을 입력해주세요'
    isValid = false
  } else {
    errors.name = ''
  }

  // 이메일 검증
  if (!formData.email.trim()) {
    errors.email = '이메일을 입력해주세요'
    isValid = false
  } else if (!emailRegex.test(formData.email)) {
    errors.email = '유효한 이메일 주소를 입력해주세요'
    isValid = false
  } else {
    errors.email = ''
  }

  // 이메일 인증 확인 추가
  if (!isEmailVerified.value) {
    errors.email = '이메일 인증이 필요합니다'
    isValid = false
  }

  // 전화번호 검증
  const phoneRegex = /^\d{3}-\d{3,4}-\d{4}$/
  if (!formData.phone_number.trim()) {
    errors.phone_number = '전화번호를 입력해주세요'
    isValid = false
  } else if (!phoneRegex.test(formData.phone_number)) {
    errors.phone_number = '올바른 전화번호 형식(000-0000-0000)으로 입력해주세요'
    isValid = false
  } else {
    errors.phone_number = ''
  }

  // 비밀번호 검증
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
  if (!formData.password) {
    errors.password = '비밀번호를 입력해주세요'
    isValid = false
  } else if (!passwordRegex.test(formData.password)) {
    errors.password = '비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다'
    isValid = false
  } else {
    errors.password = ''
  }

  // 비밀번호 확인 검증
  if (!formData.password_confirm) {
    errors.password_confirm = '비밀번호 확인을 입력해주세요'
    isValid = false
  } else if (formData.password !== formData.password_confirm) {
    errors.password_confirm = '비밀번호가 일치하지 않습니다'
    isValid = false
  } else {
    errors.password_confirm = ''
  }

  // 성별 검증
  if (!formData.gender) {
    errors.gender = '성별을 선택해주세요'
    isValid = false
  } else {
    errors.gender = ''
  }

  // 주소 검증
  if (!formData.address.trim()) {
    errors.address = '주소를 입력해주세요'
    isValid = false
  } else {
    errors.address = ''
  }

  return isValid
}

// 회원가입 API 호출 함수
const registerApi = async (userData) => {
  const response = await api.post('/accounts/register/', userData)
  return response.data
}

// 로그인 API 호출 함수
const loginApi = async (email, password) => {
  const response = await api.post('/accounts/login/', {
    email,
    password
  })
  return response.data
}

// 로그인 정보와 토큰을 저장하는 함수
const saveLoginState = (userData) => {
  // 액세스 토큰과 리프레시 토큰 저장
  authStore.setAccessToken(userData.tokens.access)
  authStore.setRefreshToken(userData.tokens.refresh)

  // 사용자 정보 저장
  localStorage.setItem('userEmail', formData.email)
  localStorage.setItem('userName', userData.name)
  localStorage.setItem('userId', userData.user_id)
  localStorage.setItem('isPregnant', userData.is_pregnant || 'false')
  // 세션 스토리지에도 저장
  sessionStorage.setItem('userEmail', formData.email)
  sessionStorage.setItem('userName', userData.name)
  sessionStorage.setItem('userId', userData.user_id)
  sessionStorage.setItem('isPregnant', userData.is_pregnant || 'false')
}

// 각 필드 입력 시 해당 필드의 오류 메시지 초기화
const clearFieldError = (field) => {
  if (errors[field]) {
    errors[field] = ''
  }
}

// 회원가입 처리 함수
const handleSubmit = async () => {
  errors.form = ''

  // 이메일 인증 확인 추가
  if (!isEmailVerified.value) {
    errors.email = '이메일 인증이 필요합니다'
    errors.form = '이메일 인증을 완료해주세요'
    return
  }

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // API에 보낼 데이터 준비
    const dataToSend = { ...formData }

    // API 호출
    const response = await registerApi(dataToSend)

    // 응답 데이터 저장
    registeredUser.value = response

    // 자동 로그인 처리
    try {
      const userData = await loginApi(formData.email, formData.password)
      // 로그인 정보와 토큰 저장
      saveLoginState(userData)
      // 임신 여부에 따라 페이지 이동
      if (formData.is_pregnant) {
        router.push('/pregnancy-info-register')
      } else {
        router.push('/calendar')
      }
    } catch (loginError) {
      console.error('자동 로그인 실패:', loginError)
      // 자동 로그인 실패 시 성공 메시지 표시 후 수동으로 로그인하도록 유도
      showSuccessMessage.value = true
    }
  } catch (error) {
    // 서버에서 오는 에러 메시지 처리
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errors.form = error.response.data
      } else if (error.response.data.detail) {
        errors.form = error.response.data.detail
      } else {
        // 필드별 에러 메시지 처리
        const fieldErrors = error.response.data
        let hasFieldErrors = false

        Object.keys(fieldErrors).forEach(field => {
          if (errors[field] !== undefined) {
            errors[field] = Array.isArray(fieldErrors[field])
              ? fieldErrors[field][0]
              : fieldErrors[field]
            hasFieldErrors = true
          }
        })

        if (hasFieldErrors) {
          errors.form = '입력 정보를 확인해주세요.'
        } else {
          errors.form = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.'
        }
      }
    } else {
      errors.form = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// 로그인 페이지로 이동
const goToLogin = () => {
  router.push('/login')
}

// 임신 정보 등록 페이지로 이동
const goToPregnancyInfoRegister = () => {
  router.push('/pregnancy-info-register')
}

// 회원가입 성공 후 페이지 이동
const navigateAfterRegistration = () => {
  if (formData.is_pregnant) {
    goToPregnancyInfoRegister()
  } else {
    goToLogin()
  }
}

// Daum 우편번호 검색 창 열기
const openDaumPostcode = () => {
  const width = 500
  const height = 600
  const left = (window.screen.width / 2) - (width / 2)
  const top = (window.screen.height / 2) - (height / 2)

  window.open(
    'search.html',
    'addressSearch',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
  )
}

// 지도 표시
const showMap = (coords) => {
  const mapContainer = document.getElementById('map')
  const mapOption = {
    center: coords,
    level: 5
  }
  mapContainer.style.display = 'block'
}

// 마커 표시
const placeMarker = (coords) => {
  // marker = new daum.maps.Marker({
  //   position: coords
  // })
}

// 주소 검색 결과 처리
const handleAddressSelect = (event) => {
  if (event.data && event.data.type === 'ADDRESS_SELECTED') {
    const address = event.data.address
    formData.address = address
  }
}

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  window.removeEventListener('message', handleAddressSelect)
})

/* 이메일 인증 관련 로직 추가 */
const sendVerificationCode = async () => {
  if (!formData.email.trim()) {
    alert('이메일을 입력해주세요')
    return
  }
  if (!emailRegex.test(formData.email)) {
    alert('유효한 이메일 주소를 입력해주세요')
    return
  }
  isSendingCode.value = true
  try {
    await api.post('/accounts/send_register/', { email: formData.email })
    console.log(api)
    verificationPopupVisible.value = true
    alert('인증번호가 전송되었습니다. 이메일을 확인해주세요.')
  } catch (error) {
    console.error('인증번호 전송 실패', error)
    alert('인증번호 전송에 실패했습니다.')
    isSendingCode.value = false
  }
}

const verifyCode = async () => {
  if (!verificationCode.value.trim()) {
    alert('인증번호를 입력해주세요')
    return
  }
  isVerifyingCode.value = true
  try {
    await api.post('/accounts/check_register/', { email: formData.email, code: verificationCode.value })
    verificationStatus.value = 'verified'
    verificationPopupVisible.value = false
    isEmailVerified.value = true
    isSendingCode.value = false
    verificationCode.value = ''  // 인증번호 입력 필드 초기화
    alert('이메일 인증이 완료되었습니다.')
  } catch (error) {
    console.error('인증번호 확인 실패', error)
    alert('인증번호가 일치하지 않습니다. 다시 시도해주세요.')
  } finally {
    isVerifyingCode.value = false
  }
}

// 인증 팝업 취소 함수
const handleVerificationCancel = () => {
  verificationPopupVisible.value = false
  verificationCode.value = ''
  isSendingCode.value = false
  isVerifyingCode.value = false
  verificationStatus.value = ''
  // 인증 상태 초기화
  isEmailVerified.value = false
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">
      <!-- 성공 메시지 모달 -->
      <div
        v-if="showSuccessMessage"
        class="fixed inset-0 flex items-center justify-center z-50"
      >
        <!-- 배경 오버레이 -->
        <div class="absolute inset-0 bg-black bg-opacity-50" />

        <!-- 모달 컨텐츠 -->
        <div class="bg-white rounded-[20px] shadow-xl p-6 max-w-md w-full mx-4 z-10 relative">
          <div class="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">
            회원가입이 완료되었습니다!
          </h2>
          <p class="text-center text-gray-600 mb-6">
            아래 버튼을 클릭하여 {{ formData.is_pregnant ? '임신 정보를 등록' : '로그인 페이지로 이동' }}하세요.
          </p>

          <div
            v-if="registeredUser"
            class="bg-gray-50 p-4 rounded-md mb-6"
          >
            <p class="mb-2">
              <strong>이름:</strong> {{ registeredUser.name }}
            </p>
            <p class="mb-2">
              <strong>이메일:</strong> {{ registeredUser.email }}
            </p>
            <p><strong>전화번호:</strong> {{ registeredUser.phone_number }}</p>
          </div>

          <div class="text-center">
            <button
              class="px-6 py-2 bg-point-yellow text-dark-gray font-medium rounded-[20px] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-colors"
              @click="navigateAfterRegistration"
            >
              {{ formData.is_pregnant ? '임신 정보 등록하기' : '로그인 페이지로 이동' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-md"
      >
        {{ errors.form }}
      </div>

      <!-- 회원가입 폼 -->

      <div class="mb-3 text-center">
        <h1 class="text-3xl font-bold text-dark-gray">
          누리달
        </h1>
        <p class="mt-1 text-dark-gray">
          회원가입
        </p>
      </div>

      <form
        class="p-5 bg-white rounded-lg shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 사용자명 입력 -->
        <div class="mb-4">
          <label
            for="username"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >아이디</label>
          <input
            id="username"
            v-model="formData.username"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="아이디를 입력하세요"
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
          >이름</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="이름을 입력하세요"
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
          <label for="email" class="block mb-2 text-sm font-medium text-dark-gray">이메일</label>
          <div class="relative">
            <input
              id="email"
              v-model="formData.email"
              type="email"
              :disabled="isEmailVerified && !isSendingCode"
              @input="clearFieldError('email')"
              :class="{'bg-gray-200': isEmailVerified && !isSendingCode}"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="이메일을 입력하세요"
            >
            <button
              type="button"
              @click="handleEmailVerification"
              :class="['absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-dark-gray rounded font-bold text-sm', isSendingCode ? 'bg-gray-300' : 'bg-yellow-300']"
              :disabled="isSendingCode"
            >
              {{ isSendingCode ? '인증중' : (isEmailVerified ? '재입력' : '인증요청') }}
            </button>
          </div>
          <p v-if="errors.email" class="mt-1 text-sm text-red-600">
            {{ errors.email }}
          </p>
          <p v-if="isEmailVerified" class="mt-1 text-sm text-green-600 font-bold">
            ✓ 이메일 인증이 완료되었습니다
          </p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium text-dark-gray">전화번호</label>
          <div class="relative">
            <input
              id="phone_number"
              v-model="formData.phone_number"
              type="tel"
              maxlength="13"
              class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="010-0000-0000"
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
            class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 입력하세요"
            @input="clearFieldError('password'); formData.password_confirm && clearFieldError('password_confirm')"
          >
          <p
            v-if="errors.password"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.password }}
          </p>
        </div>

        <!-- 비밀번호 확인 입력 -->
        <div class="mb-4">
          <label
            for="password_confirm"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >비밀번호 확인</label>
          <input
            id="password_confirm"
            v-model="formData.password_confirm"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 다시 입력하세요"
            @input="clearFieldError('password_confirm')"
          >
          <p
            v-if="errors.password_confirm"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.password_confirm }}
          </p>
        </div>

        <!-- 성별 선택 -->
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium text-dark-gray">성별</label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                v-model="formData.gender"
                type="radio"
                value="male"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
                @change="clearFieldError('gender')"
              >
              <span class="ml-2 text-dark-gray">남성</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="formData.gender"
                type="radio"
                value="female"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
                @change="clearFieldError('gender')"
              >
              <span class="ml-2 text-dark-gray">여성</span>
            </label>
          </div>
          <p
            v-if="errors.gender"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.gender }}
          </p>
        </div>

        <!-- 임신 여부 (여성인 경우만 표시) -->
        <div
          class="mb-4"
        >
          <label class="flex items-center">
            <input
              v-model="formData.is_pregnant"
              type="checkbox"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-dark-gray">본인/배우자가 임신 중입니다</span>
          </label>
        </div>

        <div class="mb-6">
          <!-- 주소 입력 -->
          <div class="w-full mb-2">
            <label
              for="address"
              class="block mb-2 text-sm font-medium text-dark-gray"
            >주소</label>
            <div class="flex">
              <input
                id="address"
                v-model="formData.address"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-l-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow bg-gray-50"
                placeholder="주소 검색 버튼을 눌러 주소를 입력하세요"
                readonly
              >
              <!-- 주소 검색 버튼 -->
              <button
                type="button"
                class="bg-base-yellow text-dark-gray py-2 px-3 rounded-r-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow font-bold whitespace-nowrap"
                @click="openDaumPostcode"
              >
                주소 검색
              </button>
            </div>
            <p
              v-if="errors.address"
              class="mt-1 text-sm text-red-600"
            >
              {{ errors.address }}
            </p>
          </div>
        </div>

        <!-- 지도 표시 -->
        <div
          id="map"
          style="width:100px;height:300px;margin-top:10px;display:none"
        />

        <!-- 버튼 섹션 -->
        <div class="flex flex-col space-y-3">
          <!-- 회원가입 버튼 -->
          <button
            type="submit"
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[10px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting || !isEmailVerified"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else-if="!isEmailVerified">이메일 인증 필요</span>
            <span v-else>회원가입</span>
          </button>

          <!-- 로그인 링크 -->
          <div class="text-center mt-4">
            <a
              href="#"
              class="font-medium"
              @click.prevent="goToLogin"
            >
              <span class="text-dark-gray">이미 계정이 있으신가요?</span> <span class="text-point-yellow hover:underline">로그인하기</span>
            </a>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- 이메일 인증 UI 추가 시작 -->
  <div v-if="verificationPopupVisible" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 998;">
    <div class="email-verification-popup" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border: 1px solid #ccc; border-radius: 20px; width: 400px; max-width: 90%; z-index: 999;">
      <p class="mb-4 text-lg font-bold text-center">이메일로 받은 인증번호를 입력하세요:</p>
      <input v-model="verificationCode" type="text" placeholder="인증번호 입력" class="w-full px-3 py-2 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-point-yellow mb-4" />
      <div class="flex space-x-4">
        <button @click="verifyCode" :disabled="isVerifyingCode" class="flex-1 py-2 bg-yellow-200 text-dark-gray font-bold border border-yellow-300 rounded-[10px] hover:bg-yellow-300 focus:outline-none">
          확인
        </button>
        <button @click="handleVerificationCancel" class="flex-1 py-2 bg-gray-200 text-dark-gray font-bold border border-gray-300 rounded-[10px] hover:bg-gray-300 focus:outline-none">
          취소
        </button>
      </div>
    </div>
  </div>
  <!-- 이메일 인증 UI 추가 끝 -->
</template>

<script>
export default {
  data () {
    return {
      formData: {
        address: '' // 주소
      }
    }
  },

  mounted () {
    // this.geocoder = new daum.maps.services.Geocoder() // 주소-좌표 변환 객체
    // this.marker = new daum.maps.Marker() // 마커 객체 생성
  },
  methods: {
    // Daum 주소 검색 및 지도 표시
    openDaumPostcode () {
      new daum.Postcode({
        oncomplete: (data) => {
          const addr = data.address // 최종 주소 변수

          // 주소를 입력 필드에 넣기
          this.formData.address = addr

          // 주소로 상세 정보를 검색
          // this.geocoder.addressSearch(data.address, (results, status) => {
          //   if (status === daum.maps.services.Status.OK) {
          //     const result = results[0] // 첫번째 결과의 값 사용

          //     const coords = new daum.maps.LatLng(result.y, result.x) // 좌표
          //     this.showMap(coords) // 지도 표시
          //     this.placeMarker(coords) // 마커 표시
          //   }
          // })
        }
      }).open()
    },

    // 지도 표시
    showMap (coords) {
      const mapContainer = document.getElementById('map')
      const mapOption = {
        center: coords,
        level: 5
      }
      // this.map = new daum.maps.Map(mapContainer, mapOption)
      mapContainer.style.display = 'block'
    },

    // 마커 표시
    placeMarker (coords) {
      // this.marker.setPosition(coords)
    },

    // 필드 에러 초기화 함수
    clearFieldError (field) {
      // 필드에 대한 에러를 초기화하는 코드 (에러 메시지 처리 등)
    }
  }
}
</script>
