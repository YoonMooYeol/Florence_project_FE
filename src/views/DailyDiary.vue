<template>
  <div class="flex flex-col h-screen bg-yellow-50">
    <!-- Header -->
    <div class="p-4 bg-white shadow-md text-center relative">
      <button 
        class="absolute left-4 text-dark-gray"
        @click="router.go(-1)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 class="text-xl font-semibold">오늘의 하루</h1>
      <div class="w-6" /> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="flex-1 flex justify-center items-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray ml-2">정보를 불러오는 중...</p>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="p-4 mb-4 text-center text-red-700 bg-red-100">
      {{ errorMessage }}
    </div>

    <!-- Content -->
    <div v-if="!isLoading" class="flex-1 flex justify-center items-center p-4">
      <div class="w-full bg-yellow-200 p-6 rounded-lg">
        <div class="flex items-center mb-4 relative">
          <p class="text-gray-700 font-semibold text-lg">{{ getCurrentDate() }}</p>
          <p class="text-gray-700 font-semibold text-lg absolute left-1/2 transform -translate-x-1/2">{{ userInfo.name }}님의 하루</p>
        </div>
        <div class="flex justify-center w-full">
          <div class="w-full bg-white min-h-[700px] rounded-lg shadow-md p-4">
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <BottomNavBar active-tab="profile" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import api from '../utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()
const authStore = useAuthStore()

const userInfo = ref({ name: '', email: '' })
const isLoading = ref(false)
const errorMessage = ref('')

const getCurrentDate = () => {
  const date = new Date()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${month}.${day}(${weekDay})`
}

const fetchUserInfo = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/accounts/users/me/')
    userInfo.value.name = response.data.name || '사용자'
    userInfo.value.email = response.data.email || ''
  } catch (error) {
    errorMessage.value = '사용자 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(fetchUserInfo)
</script>

<style scoped>
.bg-yellow-50 {
  background-color: #FFFAE0;
}
.bg-yellow-200 {
  background-color: #FFED90;
}
.text-dark-gray {
  color: #353535;
}
</style>