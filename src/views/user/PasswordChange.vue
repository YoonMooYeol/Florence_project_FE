<!-- PasswordChange.vue -->
<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between">
      <button @click="goBack" class="text-dark-gray">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-xl font-bold text-dark-gray flex-1 text-center">비밀번호 변경</h1>
      <div class="w-6"></div>
    </div>

    <!-- 본문 -->
    <div class="p-4">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="space-y-4">
          <div>
            <label class="block mb-2 text-sm font-medium text-dark-gray">{{ isSocialLogin.value ? '새 비밀번호를 입력하세요' : '기존 비밀번호' }}</label>
            <input type="password" v-model="passwordChange.currentPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" :placeholder="isSocialLogin.value ? '새 비밀번호를 입력하세요' : '기존 비밀번호를 입력해주세요'" :disabled="isSocialLogin.value" />
          </div>
          <div>
            <label class="block mb-2 text-sm font-medium text-dark-gray">새 비밀번호</label>
            <input type="password" v-model="passwordChange.newPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" placeholder="새 비밀번호를 입력해주세요" />
          </div>
          <div>
            <label class="block mb-2 text-sm font-medium text-dark-gray">새 비밀번호 확인</label>
            <input type="password" v-model="passwordChange.confirmPassword" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" placeholder="새 비밀번호를 다시 입력해주세요" />
          </div>
          <div class="flex space-x-2">
            <button @click="handlePasswordChange" class="flex-1 px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold">변경하기</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
import { useAuthStore } from '@/store/auth'

const router = useRouter()

const passwordChange = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const authStore = useAuthStore()

// Determine if the user is logged in via social login
const isSocialLogin = computed(() => {
  if (!authStore.user) return false;
  return authStore.user.provider !== 'local' ||
         authStore.user.username.startsWith('google_') ||
         authStore.user.username.startsWith('naver_') ||
         authStore.user.username.startsWith('kakao_');
});

const handlePasswordChange = async () => {
  // Validation: if social login, skip currentPassword requirement
  if (isSocialLogin.value) {
    if (!passwordChange.newPassword || !passwordChange.confirmPassword) {
      alert('모든 필드를 입력해주세요.')
      return
    }
  } else {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      alert('모든 필드를 입력해주세요.')
      return
    }
  }

  if (passwordChange.newPassword !== passwordChange.confirmPassword) {
    alert('새 비밀번호가 일치하지 않습니다.')
    return
  }

  // Construct payload based on login type
  let payload;
  if (isSocialLogin.value) {
    payload = {
      new_password: passwordChange.newPassword,
      new_password_confirm: passwordChange.confirmPassword
    }
  } else {
    payload = {
      current_password: passwordChange.currentPassword,
      new_password: passwordChange.newPassword,
      new_password_confirm: passwordChange.confirmPassword
    }
  }

  try {
    const response = await api.put('/accounts/users/me/change-password/', payload)

    if (response.status === 200) {
      alert('비밀번호가 성공적으로 변경되었습니다.')
      router.push('/profile')
    }
  } catch (error) {
    if (error.response?.status === 400) {
      alert(error.response.data.detail || '기존 비밀번호가 일치하지 않습니다.')
    } else {
      alert('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
    }
    console.error('비밀번호 변경 오류:', error)
  }
}

const goBack = () => {
  router.back()
}
</script>

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