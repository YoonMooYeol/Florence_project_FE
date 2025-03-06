<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()
const searchQuery = ref('')
const users = ref([])
const selectedUser = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

// 전체 사용자 목록 불러오기
const fetchAllUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/accounts/users/')
    console.log('사용자 목록 데이터:', response.data)
    users.value = response.data
  } catch (error) {
    console.error('사용자 목록 불러오기 오류:', error)
    errorMessage.value = error.response?.data?.detail || '사용자 목록을 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 사용자 검색 함수
const searchUsers = async () => {
  if (!searchQuery.value.trim()) {
    await fetchAllUsers()
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // 실제 API에서는 검색 쿼리를 파라미터로 전달하는 방식으로 구현할 수 있습니다.
    // 여기서는 클라이언트 측에서 필터링하는 방식으로 구현합니다.
    const response = await api.get('/accounts/users/')
    console.log('검색 결과 데이터:', response.data)
    const allUsers = response.data

    // 이름이나 이메일에 검색어가 포함된 사용자 필터링
    users.value = allUsers.filter(user =>
      user.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  } catch (error) {
    console.error('사용자 검색 오류:', error)
    errorMessage.value = error.response?.data?.detail || '사용자 검색 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 사용자 상세 정보 불러오기
const fetchUserDetail = async (userId) => {
  // userId가 유효한지 확인
  if (!userId) {
    errorMessage.value = '유효하지 않은 사용자 ID입니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  selectedUser.value = null

  try {
    console.log(`사용자 상세 정보 요청 URL: /accounts/users/${userId}/`)
    const response = await api.get(`/accounts/users/${userId}/`)
    console.log('사용자 상세 정보 응답:', response.data)
    selectedUser.value = response.data
  } catch (error) {
    console.error('사용자 상세 정보 불러오기 오류:', error)
    errorMessage.value = error.response?.data?.detail || '사용자 상세 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 본인 정보 불러오기
const fetchMyInfo = async () => {
  isLoading.value = true
  errorMessage.value = ''
  selectedUser.value = null

  try {
    const response = await api.get('/accounts/users/me/')
    selectedUser.value = response.data
  } catch (error) {
    console.error('본인 정보 불러오기 오류:', error)
    errorMessage.value = error.response?.data?.detail || '본인 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 뒤로 가기
const goBack = () => {
  if (selectedUser.value) {
    selectedUser.value = null
  } else {
    router.go(-1)
  }
}

// 컴포넌트 마운트 시 사용자 목록 불러오기
onMounted(fetchAllUsers)
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between">
      <button
        class="text-dark-gray"
        @click="goBack"
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
      <h1 class="text-xl font-bold text-center text-dark-gray flex-1">
        사용자 검색
      </h1>
      <div class="w-6" /> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 검색 영역 -->
    <div class="p-4">
      <div class="flex mb-4">
        <input
          v-model="searchQuery"
          type="text"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          placeholder="이름 또는 이메일로 검색"
          @keyup.enter="searchUsers"
        >
        <button
          class="px-4 py-2 bg-point-yellow text-dark-gray rounded-r-md hover:bg-yellow-500 focus:outline-none"
          @click="searchUsers"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- 내 정보 보기 버튼 -->
      <button
        class="w-full mb-4 px-4 py-3 bg-base-yellow rounded-md text-dark-gray font-medium hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-point-yellow"
        @click="fetchMyInfo"
      >
        내 정보 보기
      </button>
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 에러 메시지 표시 -->
    <div
      v-if="errorMessage"
      class="p-4 mb-4 text-center text-red-700 bg-red-100"
    >
      {{ errorMessage }}
    </div>

    <!-- 사용자 상세 정보 -->
    <div
      v-if="selectedUser && !isLoading"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="flex items-center mb-6">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-dark-gray">
              {{ selectedUser.username || '아이디 없음' }}
            </h2>
            <!-- <p class="text-sm text-gray-500">
              {{ selectedUser.email || '이메일 없음' }}
            </p> -->
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">닉네임</span>
            <span class="font-medium">{{ selectedUser.name || '정보 없음' }}</span>
          </div>
          <!-- <div class="flex justify-between items-center">
            <span class="text-gray-600">이메일</span>
            <span class="font-medium">{{ selectedUser.email || '정보 없음' }}</span>
          </div> -->
          <div class="flex justify-between items-center">
            <span class="text-gray-600">성별</span>
            <span class="font-medium">{{ selectedUser.gender !== undefined ? (selectedUser.gender === 'M' ? '남성' : '여성') : '정보 없음' }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-600">임신 여부</span>
            <span class="font-medium">{{ selectedUser.is_pregnant !== undefined ? (selectedUser.is_pregnant ? '임신중' : '임신 예정') : '정보 없음' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 사용자 목록 -->
    <div
      v-if="!selectedUser && !isLoading"
      class="p-4"
    >
      <div
        v-if="users.length === 0"
        class="bg-white rounded-lg shadow-md p-6 text-center text-gray-500"
      >
        검색 결과가 없습니다.
      </div>
      <div
        v-else
        class="bg-white rounded-lg shadow-md overflow-hidden"
      >
        <ul class="divide-y divide-gray-100">
          <li
            v-for="user in users"
            :key="user.user_id || user.id"
            class="p-4 hover:bg-gray-50 cursor-pointer"
            @click="user.user_id ? fetchUserDetail(user.user_id) : errorMessage = '유효하지 않은 사용자 ID입니다.'"
          >
            <div class="flex items-center">
              <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-medium text-dark-gray">
                  {{ user.name || '이름 없음' }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ user.email || '이메일 없음' }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="search" />
  </div>
</template>

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
