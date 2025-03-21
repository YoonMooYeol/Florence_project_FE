<!-- PasswordChange.vue -->
<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-3 sm:p-4 shadow-md flex items-center justify-between">
      <button @click="goBack" class="text-dark-gray p-2 -m-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-lg sm:text-xl font-bold text-dark-gray flex-1 text-center">비밀번호 변경</h1>
      <div class="w-5 sm:w-6"></div>
    </div>

    <!-- 본문 -->
    <div class="p-3 sm:p-4">
      <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div class="space-y-3 sm:space-y-4">
          <div>
            <label class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray">기존 비밀번호</label>
            <input 
              type="password" 
              v-model="passwordChange.currentPassword" 
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" 
              placeholder="기존 비밀번호를 입력해주세요" 
            />
          </div>
          <div>
            <label class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray">새 비밀번호</label>
            <input 
              type="password" 
              v-model="passwordChange.newPassword" 
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" 
              placeholder="새 비밀번호를 입력해주세요" 
            />
          </div>
          <div>
            <label class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray">새 비밀번호 확인</label>
            <input 
              type="password" 
              v-model="passwordChange.confirmPassword" 
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow" 
              placeholder="새 비밀번호를 다시 입력해주세요" 
            />
          </div>
          <div class="flex space-x-2">
            <button 
              @click="handlePasswordChange" 
              class="flex-1 px-4 py-3 text-base sm:text-sm text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
            >
              변경하기
            </button>
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

const handlePasswordChange = async () => {
  if (authStore.user && authStore.user.password === null) {
    alert("소셜로그인 계정입니다");
    return;
  }

  // For local accounts, require all fields
  if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
    alert('모든 필드를 입력해주세요.');
    return;
  }

  if (passwordChange.newPassword !== passwordChange.confirmPassword) {
    alert('새 비밀번호가 일치하지 않습니다.');
    return;
  }

  // Construct payload for local accounts only
  const payload = {
    current_password: passwordChange.currentPassword,
    new_password: passwordChange.newPassword,
    new_password_confirm: passwordChange.confirmPassword
  };

  try {
    const response = await api.put('/accounts/users/me/change-password/', payload);
    if (response.status === 200) {
      alert('비밀번호가 성공적으로 변경되었습니다.');
      router.push('/profile');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      alert(error.response.data.detail || '기존 비밀번호가 일치하지 않습니다.');
    } else {
      alert('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
    }
    console.error('비밀번호 변경 오류:', error);
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

/* iOS에서 자동 확대 방지 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  input {
    font-size: 16px;
  }
}
</style> 