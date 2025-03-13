<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios'

const router = useRouter()

// 폼 데이터 관리
const formData = reactive({
  email: '',
  verificationCode: '' // 인증번호 입력 필드 추가
})

// 에러 메시지
const errors = reactive({
  email: '',
  verificationCode: '',
  form: ''
})

// 제출 상태 관리
const isSubmitting = ref(false)
const isCodeSent = ref(false) // 인증번호 발송 여부 상태

// 이메일 유효성 검사 함수 추가
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 폼 유효성 검사
const validateForm = () => {
  let isValid = true

  const emailValue = formData.email.trim()
  if (!emailValue) {
    errors.email = '이메일을 입력해주세요'
    isValid = false
  } else if (!isValidEmail(emailValue)) {
    errors.email = '올바른 이메일 형식이 아닙니다'
    isValid = false
  } else {
    errors.email = ''
  }

  return isValid
}

// 비밀번호 찾기 API 호출
const findPasswordApi = async (email) => {
  try {
    if (!email || !isValidEmail(email)) {
      throw new Error('유효하지 않은 이메일 주소입니다.')
    }

    // 요청 데이터 준비
    const requestData = {
      email: email.trim(),
      type: 'password'
    }

    console.log('이메일 전송 요청 데이터:', JSON.stringify(requestData, null, 2))
    console.log('API 엔드포인트:', '/accounts/reset_code/')

    // API 요청 설정
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }

    // API 요청 전송
    const response = await api.post('/accounts/reset_code/', requestData, config)
    
    console.log('서버 응답 전체:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    })
    
    if (!response.data) {
      throw new Error('서버 응답이 비어있습니다.')
    }
    
    return response.data
  } catch (error) {
    // 상세 에러 로깅
    console.error('API 에러 상세:', {
      name: error.name,
      message: error.message,
      response: error.response ? {
        data: error.response.data,
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers
      } : 'No response',
      request: error.config ? {
        url: error.config.url,
        method: error.config.method,
        data: JSON.parse(error.config.data || '{}'),
        headers: error.config.headers
      } : 'No config'
    })

    // 에러 메시지 처리
    if (error.response?.status === 404) {
      throw new Error('요청한 기능을 찾을 수 없습니다. 관리자에게 문의해주세요.')
    }
    if (error.response?.status === 500) {
      if (error.response?.data?.detail?.includes('Invalid address')) {
        throw new Error('등록되지 않은 이메일 주소입니다. 회원가입 시 사용한 이메일을 입력해주세요.')
      }
      const errorDetail = error.response?.data?.detail || error.response?.data?.message || '';
      throw new Error(`서버 오류가 발생했습니다: ${errorDetail}`)
    }
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail)
    }
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('이메일 전송 중 오류가 발생했습니다. 다시 시도해주세요.')
  }
}

// 제출 처리
const handleSubmit = async () => {
  errors.form = ''

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const email = formData.email.trim()
    if (!email || !isValidEmail(email)) {
      throw new Error('올바른 이메일 주소를 입력해주세요.')
    }

    console.log('폼 제출 - 이메일:', {
      email: email,
      length: email.length,
      isValid: isValidEmail(email)
    })
    
    const response = await findPasswordApi(email)
    console.log('API 호출 결과:', response)
    
    if (response?.success === false) {
      errors.form = response.message || '인증코드 전송에 실패했습니다.'
      return
    }

    // 성공 시 처리
    isCodeSent.value = true
    alert('인증코드가 이메일로 전송되었습니다.')
  } catch (error) {
    console.error('인증코드 전송 실패:', {
      error: error.message,
      email: formData.email,
      emailLength: formData.email.length,
      emailValid: isValidEmail(formData.email)
    })
    errors.form = error.message
  } finally {
    isSubmitting.value = false
  }
}

// 인증번호 확인 API 호출
const verifyCode = async () => {
  if (!formData.verificationCode.trim()) {
    errors.verificationCode = '인증번호를 입력해주세요'
    return
  }

  try {
    const response = await api.post('/accounts/check_code/', {
      reset_code: formData.verificationCode.trim()
    })
    
    // 성공적으로 확인되면 비밀번호 재설정 페이지로 이동
    if (response.status === 200) {
      router.push({
        path: '/reset-password',
        query: { 
          email: formData.email.trim(),
          code: formData.verificationCode.trim()
        }
      })
    }
  } catch (error) {
    console.error('인증번호 확인 오류:', error)
    errors.verificationCode = error.response?.data?.detail || '유효하지 않은 인증번호입니다.'
  }
}

// 인증번호 확인 후 비밀번호 재설정 페이지로 이동
const verifyCodeAndProceed = async () => {
  await verifyCode()
}

// 로그인 페이지로 돌아가기
const goToLogin = () => {
  router.push('/login')
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
          비밀번호 찾기
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-[20px]"
      >
        {{ errors.form }}
      </div>

      <!-- 비밀번호 찾기 폼 -->
      <form
        class="p-9 bg-white rounded-[10px] shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 이메일 입력 -->
        <div class="mb-2">
          <label
            for="email"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >이메일</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="가입한 이메일을 입력하세요"
          >
          
          <p
            v-if="errors.email"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.email }}
          </p>
        </div>

        <!-- 인증번호 입력 (인증요청 후 표시) -->
        <div v-if="isCodeSent" class="mb-2">
          <label
            for="verificationCode"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >인증번호를 입력하세요</label>
          <input
            id="verificationCode"
            v-model="formData.verificationCode"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="인증번호"
          >
          <p
            v-if="errors.verificationCode"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.verificationCode }}
          </p>
        </div>

        <!-- 버튼 섹션 -->
        <div class="flex flex-col mt-4">
          <!-- 인증 요청 버튼 -->
          <button
            v-if="!isCodeSent"
            type="submit"
            class="w-full px-4 py-3 mb-4 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>인증요청</span>
          </button>

          <!-- 확인 버튼 (인증번호 입력 후 표시) -->
          <button
            v-if="isCodeSent"
            type="button"
            class="w-full px-4 py-3 mb-4 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
            @click="verifyCodeAndProceed"
            >
            확인
          </button>

          <!-- 로그인으로 돌아가기 버튼 -->
          <button
            type="button"
            class="w-full px-4 py-3 text-dark-gray border border-gray-300 rounded-[20px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
            @click="goToLogin"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

