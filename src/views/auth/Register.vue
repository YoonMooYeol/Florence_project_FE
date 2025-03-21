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
      <!-- 헤더 -->
      <div class="mb-6 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold text-dark-gray">
          누리달
        </h1>
        <p class="mt-2 text-sm sm:text-base text-dark-gray">
          회원가입
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-3 mb-4 text-sm text-center text-red-700 bg-red-100 rounded-[15px]"
      >
        {{ errors.form }}
      </div>

      <!-- 회원가입 폼 -->
      <form
        class="p-5 sm:p-6 bg-white rounded-[10px] shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 아이디 입력 -->
        <div class="mb-4">
          <label
            for="username"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >아이디</label>
          <input
            id="username"
            v-model="formData.username"
            type="text"
            class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="아이디를 입력하세요"
          >
          <p
            v-if="errors.username"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.username }}
          </p>
        </div>

        <!-- 이름 입력 -->
        <div class="mb-4">
          <label
            for="name"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >이름</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="이름을 입력하세요"
          >
          <p
            v-if="errors.name"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.name }}
          </p>
        </div>

        <!-- 이메일 입력 -->
        <div class="mb-4">
          <label
            for="email"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >이메일</label>
          <div class="flex space-x-2">
            <input
              id="email"
              v-model="formData.email"
              type="email"
              class="flex-1 px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="이메일을 입력하세요"
              :disabled="isEmailVerified"
            >
            <button
              type="button"
              class="px-3 py-2 text-sm sm:text-base text-dark-gray bg-base-yellow rounded-[15px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="handleEmailVerification"
            >
              {{ isEmailVerified ? '재입력' : '인증요청' }}
            </button>
          </div>
          <p
            v-if="errors.email"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.email }}
          </p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-4">
          <label
            for="phone_number"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >전화번호</label>
          <input
            id="phone_number"
            v-model="formData.phone_number"
            type="tel"
            class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="전화번호를 입력하세요"
            @input="handlePhoneInput"
          >
          <p
            v-if="errors.phone_number"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.phone_number }}
          </p>
        </div>

        <!-- 비밀번호 입력 -->
        <div class="mb-4">
          <label
            for="password"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >비밀번호</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 입력하세요"
          >
          <p
            v-if="errors.password"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.password }}
          </p>
        </div>

        <!-- 비밀번호 확인 -->
        <div class="mb-4">
          <label
            for="password_confirm"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >비밀번호 확인</label>
          <input
            id="password_confirm"
            v-model="formData.password_confirm"
            type="password"
            class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 다시 입력하세요"
          >
          <p
            v-if="errors.password_confirm"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.password_confirm }}
          </p>
        </div>

        <!-- 성별 선택 -->
        <div class="mb-4">
          <label class="block mb-1 text-base sm:text-lg font-medium text-dark-gray">성별</label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="formData.gender"
                value="F"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
              >
              <span class="ml-2 text-sm text-gray-700">여성</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="formData.gender"
                value="M"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
              >
              <span class="ml-2 text-sm text-gray-700">남성</span>
            </label>
          </div>
          <p
            v-if="errors.gender"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.gender }}
          </p>
        </div>

        <!-- 임신 여부 체크박스 -->
        <div class="mb-4">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="formData.is_pregnant"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            >
            <span class="ml-2 text-sm text-gray-700">임신 중이에요</span>
          </label>
        </div>

        <!-- 주소 입력 -->
        <div class="mb-4">
          <label
            for="address"
            class="block mb-1 text-base sm:text-lg font-medium text-dark-gray"
          >주소</label>
          <div class="flex space-x-2">
            <input
              id="address"
              v-model="formData.address"
              type="text"
              class="flex-1 px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="주소를 입력하세요"
              readonly
            >
            <button
              type="button"
              class="px-3 py-2 text-sm sm:text-base text-dark-gray bg-base-yellow rounded-[15px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="openDaumPostcode"
            >
              주소 검색
            </button>
          </div>
          <p
            v-if="errors.address"
            class="mt-1 text-xs sm:text-sm text-red-600"
          >
            {{ errors.address }}
          </p>
        </div>

        <!-- 버튼 섹션 -->
        <div class="flex flex-col mt-6">
          <button
            type="submit"
            class="w-full px-4 py-2.5 mb-3 text-sm sm:text-base text-dark-gray bg-base-yellow rounded-[15px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>회원가입</span>
          </button>

          <button
            type="button"
            class="w-full px-4 py-2.5 text-sm sm:text-base text-dark-gray border border-gray-300 rounded-[15px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
            @click="goToLogin"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </form>
    </div>

    <!-- 이메일 인증 팝업 -->
    <div
      v-if="verificationPopupVisible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        @click="handleVerificationCancel"
      />
      <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h3 class="text-lg font-semibold text-dark-gray mb-4">
          이메일 인증
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          입력하신 이메일로 인증번호가 발송되었습니다.<br>
          받으신 인증번호를 입력해주세요.
        </p>
        <input
          v-model="verificationCode"
          type="text"
          class="w-full px-3 py-2 text-base border border-gray-300 rounded-[15px] focus:outline-none focus:ring-2 focus:ring-point-yellow mb-4"
          placeholder="인증번호를 입력하세요"
        >
        <div class="flex space-x-2">
          <button
            class="flex-1 px-4 py-2 text-sm text-dark-gray bg-base-yellow rounded-[15px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
            @click="verifyCode"
            :disabled="isVerifyingCode"
          >
            {{ isVerifyingCode ? '확인 중...' : '확인' }}
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm text-dark-gray border border-gray-300 rounded-[15px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
            @click="handleVerificationCancel"
          >
            취소
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

/* 모바일 최적화 */
@media (max-width: 640px) {
  input[type="text"],
  input[type="email"],
  input[type="tel"],
  input[type="password"] {
    font-size: 16px; /* iOS에서 자동 확대 방지 */
  }
  
  .max-w-md {
    max-width: 100%;
  }
}
</style>
