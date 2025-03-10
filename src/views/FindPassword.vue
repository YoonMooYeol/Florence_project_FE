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

// 폼 유효성 검사
const validateForm = () => {
  let isValid = true

  if (!formData.email.trim()) {
    errors.email = '이메일을 입력해주세요'
    isValid = false
  } else {
    errors.email = ''
  }

  return isValid
}

// 비밀번호 찾기 API 호출
const findPasswordApi = async (email) => {
  try {
    const response = await api.post('/accounts/password-reset/', { email })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '비밀번호 찾기 요청 실패')
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
    await findPasswordApi(formData.email)
    alert('비밀번호 재설정 링크가 이메일로 전송되었습니다.')
    isCodeSent.value = true
  } catch (error) {
    errors.form = '비밀번호 찾기에 실패했습니다. 이메일을 확인해주세요.'
  } finally {
    isSubmitting.value = false
  }
}

// 인증번호 확인 후 비밀번호 재설정 페이지로 이동
const verifyCodeAndProceed = () => {
  if (!formData.verificationCode.trim()) {
    errors.verificationCode = '인증번호를 입력해주세요'
    return
  }
  errors.verificationCode = ''
  router.push('/reset-password') // 비밀번호 재설정 페이지로 이동
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
        <div class="mb-4 ">
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
        <div v-if="isCodeSent" class="mb-4">
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
        <div class="flex flex-col space-y-3">
          <!-- 인증 요청 버튼 -->
          <button
            v-if="!isCodeSent"
            type="submit"
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>인증요청</span>
          </button>

          <!-- 확인 버튼 (인증번호 입력 후 표시) -->
          <button
            v-if="isCodeSent"
            type="button"
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
            @click="verifyCodeAndProceed"
            >
            확인
          </button>
        </div>

        <!-- 로그인으로 돌아가기 버튼 -->
        <button
          type="button"
          class="w-full px-4 py-3 text-dark-gray border border-gray-300 rounded-[20px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
          @click="goToLogin"
        >
          로그인으로 돌아가기
        </button>
      </form>
    </div>
  </div>
</template>

