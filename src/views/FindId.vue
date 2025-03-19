<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios'

const router = useRouter()

// 폼 데이터 관리
const formData = reactive({
  name: '',
  phoneNumber: ''
})

// 에러 메시지
const errors = reactive({
  name: '',
  phoneNumber: '',
  form: ''
})

// 찾은 아이디 상태
const foundUsername = ref('')
const isSubmitting = ref(false)

// 폼 유효성 검사
const validateForm = () => {
  let isValid = true

  if (!formData.name.trim()) {
    errors.name = '닉네임을 입력해주세요'
    isValid = false
  } else {
    errors.name = ''
  }

  if (!formData.phoneNumber.trim()) {
    errors.phoneNumber = '전화번호를 입력해주세요'
    isValid = false
  } else {
    errors.phoneNumber = ''
  }

  return isValid
}

// 아이디 찾기 API 호출
const findIdApi = async () => {
  try {
    const requestData = {
      name: formData.name.trim(),
      phone_number: formData.phoneNumber.trim()
    }
    const response = await api.post('/accounts/find_username/', requestData)
    return response.data
  } catch (error) {
    if (error.response?.data?.non_field_errors?.[0]) {
      const errorMessage = error.response.data.non_field_errors[0].replace('이름', '닉네임')
      throw new Error(errorMessage)
    }
    throw new Error(error.response?.data?.detail || '아이디 찾기 요청 실패')
  }
}

// 전화번호 포맷팅
const formatPhoneNumber = (value) => {
  if (!value) return value
  const phoneNumber = value.replace(/[^0-9]/g, '')
  if (phoneNumber.length <= 3) {
    return phoneNumber
  } else if (phoneNumber.length <= 7) {
    return phoneNumber.slice(0, 3) + '-' + phoneNumber.slice(3)
  } else {
    return phoneNumber.slice(0, 3) + '-' + phoneNumber.slice(3, 7) + '-' + phoneNumber.slice(7, 11)
  }
}

// 전화번호 입력 처리
const handlePhoneNumberInput = (e) => {
  const formatted = formatPhoneNumber(e.target.value)
  formData.phoneNumber = formatted
}

// 제출 처리
const handleSubmit = async () => {
  errors.form = ''
  foundUsername.value = ''

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const response = await findIdApi()
    if (response && response.masked_email) {
      foundUsername.value = response.masked_email
      errors.form = ''
    } else {
      errors.form = '일치하는 사용자 정보를 찾을 수 없습니다.'
    }
  } catch (error) {
    errors.form = error.message
  } finally {
    isSubmitting.value = false
  }
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
          누리달
        </h1>
        <p class="mt-2 text-dark-gray">
          아이디 찾기
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-[20px]"
      >
        {{ errors.form }}
      </div>

      <!-- 찾은 아이디 표시 -->
      <div
        v-if="foundUsername"
        class="p-4 mb-6 text-center bg-yellow-200 rounded-[20px]"
      >
        <p class="text-gray-700 font-bold">아이디</p>
        <p class="mt-2 text-xl font-bold text-gray-900">{{ foundUsername }}</p>
      </div>

      <!-- 아이디 찾기 폼 -->
      <form
        class="p-9 bg-white rounded-[10px] shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 닉네임 입력 -->
        <div class="mb-4">
          <label
            for="name"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >닉네임</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="닉네임을 입력하세요"
          >
          <p
            v-if="errors.name"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.name }}
          </p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-6">
          <label
            for="phoneNumber"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >전화번호</label>
          <input
            id="phoneNumber"
            v-model="formData.phoneNumber"
            type="tel"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="전화번호를 입력하세요 (예: 01012345678)"
            @input="handlePhoneNumberInput"
          >
          <p
            v-if="errors.phoneNumber"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.phoneNumber }}
          </p>
        </div>

        <!-- 버튼 섹션 -->
        <div class="flex flex-col mt-4">
          <!-- 아이디 찾기 버튼 -->
          <button
            type="submit"
            class="w-full px-4 py-3 mb-4 text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>아이디 찾기</span>
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

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
</style>
