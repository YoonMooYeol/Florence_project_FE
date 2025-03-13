<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">
      <!-- 헤더 -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-dark-gray">
          하트비트
        </h1>
        <p class="mt-2 text-dark-gray">
          새 비밀번호 설정
        </p>
      </div>

      <!-- 폼 에러 메시지 -->
      <div
        v-if="errors.form"
        class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-[20px]"
      >
        {{ errors.form }}
      </div>

      <!-- 비밀번호 재설정 폼 -->
      <form
        class="p-9 bg-white rounded-[10px] shadow-md"
        @submit.prevent="handleSubmit"
      >
        <!-- 새 비밀번호 입력 -->
        <div class="mb-4">
          <label
            for="newPassword"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >새 비밀번호</label>
          <input
            id="newPassword"
            v-model="formData.newPassword"
            type="password"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="새 비밀번호를 입력하세요"
          >
          <p
            v-if="errors.newPassword"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.newPassword }}
          </p>
        </div>

        <!-- 새 비밀번호 확인 -->
        <div class="mb-6">
          <label
            for="confirmPassword"
            class="block mb-2 text-xl font-medium text-dark-gray"
          >새 비밀번호 확인</label>
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            class="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="새 비밀번호를 다시 입력하세요"
          >
          <p
            v-if="errors.confirmPassword"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- 버튼 섹션 -->
        <div class="flex flex-col">
          <button
            type="submit"
            class="w-full px-4 py-3 mb-4 text-center text-dark-gray bg-base-yellow rounded-[20px] hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>비밀번호 변경</span>
          </button>

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

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/utils/axios'

const router = useRouter()
const route = useRoute()

const isSubmitting = ref(false)

const formData = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = reactive({
  newPassword: '',
  confirmPassword: '',
  form: ''
})

// URL 파라미터에서 이메일과 코드 가져오기
onMounted(() => {
  const { email, code } = route.query
  if (!email || !code) {
    alert('잘못된 접근입니다.')
    router.push('/login')
    return
  }
  formData.email = email
  formData.code = code
})

// 폼 유효성 검사
const validateForm = () => {
  let isValid = true
  errors.newPassword = ''
  errors.confirmPassword = ''
  errors.form = ''

  if (!formData.newPassword) {
    errors.newPassword = '새 비밀번호를 입력해주세요'
    isValid = false
  } else if (formData.newPassword.length < 8) {
    errors.newPassword = '비밀번호는 8자 이상이어야 합니다'
    isValid = false
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요'
    isValid = false
  } else if (formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다'
    isValid = false
  }

  return isValid
}

// 비밀번호 재설정 API 호출
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const response = await api.post('/accounts/confirm_code/', {
      email: formData.email,
      reset_code: formData.code,
      new_password: formData.newPassword,
      new_password_confirm: formData.confirmPassword
    })

    if (response.status === 200) {
      alert('비밀번호가 성공적으로 변경되었습니다.')
      router.push('/login')
    }
  } catch (error) {
    console.error('비밀번호 변경 오류:', error)
    errors.form = error.response?.data?.detail || '비밀번호 변경에 실패했습니다. 다시 시도해주세요.'
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
</style> 