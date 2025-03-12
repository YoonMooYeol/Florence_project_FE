<!-- PasswordChange.vue -->
<template>
  <div class="min-h-screen bg-ivory p-4">
    <h1 class="text-2xl font-bold mb-6">비밀번호 변경</h1>
    
    <div class="bg-white rounded-lg p-6 shadow-sm">
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">기존 비밀번호</label>
          <input 
            type="password" 
            v-model="passwordChange.currentPassword"
            class="w-full p-2 border rounded focus:outline-none focus:border-yellow-400"
            placeholder="기존 비밀번호를 입력해주세요"
          >
        </div>
        
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">새 비밀번호</label>
          <input 
            type="password" 
            v-model="passwordChange.newPassword"
            class="w-full p-2 border rounded focus:outline-none focus:border-yellow-400"
            placeholder="새 비밀번호를 입력해주세요"
          >
        </div>
        
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">새 비밀번호 확인</label>
          <input 
            type="password" 
            v-model="passwordChange.confirmPassword"
            class="w-full p-2 border rounded focus:outline-none focus:border-yellow-400"
            placeholder="새 비밀번호를 다시 입력해주세요"
          >
        </div>

        <div class="flex justify-end space-x-2">
          <button 
            @click="goBack"
            class="px-4 py-2 rounded border hover:bg-gray-50 font-bold"
          >
            취소
          </button>
          <button 
            @click="handlePasswordChange"
            class="bg-yellow-400 text-gray-800 px-4 py-2 rounded hover:bg-yellow-500 font-bold"
          >
            변경하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'

const router = useRouter()

const passwordChange = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handlePasswordChange = async () => {
  // 유효성 검사
  if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
    alert('모든 필드를 입력해주세요.')
    return
  }

  if (passwordChange.newPassword !== passwordChange.confirmPassword) {
    alert('새 비밀번호가 일치하지 않습니다.')
    return
  }

  try {
    const response = await api.put('/accounts/users/me/change-password/', {
      current_password: passwordChange.currentPassword,
      new_password: passwordChange.newPassword,
      new_password_confirm: passwordChange.confirmPassword
    })

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
</style> 