<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()
const searchQuery = ref('')
const users = ref([])
const selectedUser = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const activeTab = ref('search')
const searchResult = ref(null) // 이메일 검색 결과
const isFollowLoading = ref(false) // 팔로우/언팔로우 작업 중 상태

// 탭 변경 함수
const changeTab = (tab) => {
  activeTab.value = tab
  searchQuery.value = ''
  selectedUser.value = null
  searchResult.value = null
  users.value = []

  // 탭에 따라 적절한 사용자 목록 불러오기
  if (tab === 'following') {
    fetchFollowingUsers()
  } else if (tab === 'followers') {
    fetchFollowersUsers()
  }
}

// 팔로잉 사용자 목록 불러오기
const fetchFollowingUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get('/accounts/follow-list/following/')

    // 백엔드에서 받아온 데이터 구조 변경됨
    // 이제 각 항목에 following_detail 필드가 있고 is_following 필드도 포함됨
    users.value = response.data
  } catch (error) {
    users.value = [] // 오류 발생 시 빈 배열 설정
    
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage.value = '팔로잉 목록을 가져올 수 없습니다. API 엔드포인트를 찾을 수 없습니다.'
      } else if (error.response.status === 401) {
        errorMessage.value = '인증이 필요합니다. 다시 로그인해주세요.'
      } else if (error.response.status >= 500) {
        errorMessage.value = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else {
        errorMessage.value = `팔로잉 목록 불러오기 오류 (${error.response.status}): ${error.response.data?.detail || '알 수 없는 오류'}`
      }
    } else {
      errorMessage.value = '팔로잉 사용자 목록을 불러오는 중 오류가 발생했습니다.'
    }
  } finally {
    isLoading.value = false
  }
}

// 팔로워 사용자 목록 불러오기
const fetchFollowersUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get('/accounts/follow-list/followers/')
    users.value = response.data
  } catch (error) {
    users.value = [] // 오류 발생 시 빈 배열 설정
    
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage.value = '팔로워 목록을 가져올 수 없습니다. API 엔드포인트를 찾을 수 없습니다.'
      } else if (error.response.status === 401) {
        errorMessage.value = '인증이 필요합니다. 다시 로그인해주세요.'
      } else if (error.response.status >= 500) {
        errorMessage.value = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else {
        errorMessage.value = `팔로워 목록 불러오기 오류 (${error.response.status}): ${error.response.data?.detail || '알 수 없는 오류'}`
      }
    } else {
      errorMessage.value = '팔로워 사용자 목록을 불러오는 중 오류가 발생했습니다.'
    }
  } finally {
    isLoading.value = false
  }
}

// 이메일로 사용자 검색 함수
const searchUserByEmail = async () => {
  if (!searchQuery.value.trim()) {
    errorMessage.value = '이메일을 입력해주세요.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  searchResult.value = null

  try {
    // 이메일로 사용자 검색 (백엔드에서 이제 is_following 정보 포함)
    const response = await api.get(`/accounts/search/?email=${searchQuery.value.trim()}`)

    // 백엔드에서 is_following 값을 제공하므로 별도 요청 필요 없음
    // 응답에 is_following 필드가 없다면 기본값으로 false 설정
    if (response.data && response.data.user_id) {
      if (response.data.is_following === undefined) {
        response.data.is_following = false
      }
    }

    searchResult.value = response.data
  } catch (error) {
    users.value = [] // 검색 오류 시 빈 결과 표시
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage.value = '검색 기능을 사용하려면 로그인이 필요합니다.'
      } else if (error.response.status === 403) {
        errorMessage.value = '검색 기능을 사용할 권한이 없습니다.'
      } else if (error.response.status >= 500) {
        errorMessage.value = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.response.data?.detail) {
        errorMessage.value = `검색 오류: ${error.response.data.detail}`
      } else {
        errorMessage.value = '사용자 검색 중 오류가 발생했습니다.'
      }
    } else {
      errorMessage.value = '사용자 검색 중 오류가 발생했습니다.'
    }
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

// 팔로우/언팔로우 함수
const toggleFollow = async (userId, isCurrentlyFollowing) => {
  if (!userId) {
    errorMessage.value = '사용자 ID가 없어 팔로우할 수 없습니다.'
    return
  }

  isFollowLoading.value = true

  try {
    if (isCurrentlyFollowing) {
      // 언팔로우
      await api.delete('/accounts/follow/', {
        data: { user_id: userId }
      })

      // 검색 결과였다면 검색 결과 업데이트
      if (searchResult.value && searchResult.value.user_id === userId) {
        searchResult.value.is_following = false
      }

      // 현재 탭에 따라 목록 갱신
      if (activeTab.value === 'following') {
        await fetchFollowingUsers()
      } else if (activeTab.value === 'followers') {
        await fetchFollowersUsers()
      }
    } else {
      // 팔로우
      await api.post('/accounts/follow/', {
        user_id: userId
      })

      // 검색 결과였다면 검색 결과 업데이트
      if (searchResult.value && searchResult.value.user_id === userId) {
        searchResult.value.is_following = true
      }

      // 현재 탭이 팔로워이면 목록 다시 불러오기 (is_following 상태 갱신)
      if (activeTab.value === 'followers') {
        await fetchFollowersUsers()
      }
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.response?.data?.detail || '팔로우 상태를 변경하는 중 오류가 발생했습니다.'
  } finally {
    isFollowLoading.value = false
  }
}

// 사용자 탭 아이템 렌더링
// const renderUserItem = (user) => {
//   return (
//     <div class="flex items-center justify-between">
//       <div class="flex items-center">
//         <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             class="h-6 w-6 text-gray-500"
//             viewBox="0 0 20 20"
//             fill="currentColor"
//           >
//             <path
//               fill-rule="evenodd"
//               d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
//               clip-rule="evenodd"
//             />
//           </svg>
//         </div>
//         <div>
//           <h3 class="font-medium text-dark-gray">
//             {user.name || '이름 없음'}
//           </h3>
//           <p class="text-sm text-gray-500">
//             {user.username || user.email || '아이디 없음'}
//           </p>
//         </div>
//       </div>
//     </div>
//   )
// }
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-3 sm:p-4 shadow-md flex items-center justify-between">
      <button
        class="text-dark-gray p-2 -m-2"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
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
      <h1 class="text-lg sm:text-xl font-bold text-dark-gray flex-1 text-center">사용자 검색</h1>
      <div class="w-5 sm:w-6"></div>
    </div>

    <!-- 검색 섹션 -->
    <div class="p-3 sm:p-4">
      <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div class="flex space-x-2">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="이메일로 검색"
            class="flex-1 px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @keyup.enter="searchUserByEmail"
          />
          <button
            @click="searchUserByEmail"
            class="px-4 py-2.5 text-base sm:text-sm text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
          >
            검색
          </button>
        </div>
      </div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="bg-white border-b border-gray-200">
      <div class="flex">
        <button
          v-for="tab in ['search', 'following', 'followers']"
          :key="tab"
          @click="changeTab(tab)"
          :class="[
            'flex-1 py-3 text-sm sm:text-base font-medium text-center border-b-2 transition-colors duration-200',
            activeTab === tab
              ? 'border-point-yellow text-point-yellow'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab === 'search' ? '검색' : tab === 'following' ? '팔로잉' : '팔로워' }}
        </button>
      </div>
    </div>

    <!-- 검색 결과 또는 사용자 목록 -->
    <div class="p-3 sm:p-4">
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-point-yellow"></div>
      </div>

      <div v-else-if="errorMessage" class="text-red-500 text-center py-4">
        {{ errorMessage }}
      </div>

      <div v-else-if="activeTab === 'search' && searchResult" class="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 sm:h-8 sm:w-8 text-gray-500"
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
              <h3 class="text-base sm:text-lg font-medium text-dark-gray">
                {{ searchResult.name || '이름 없음' }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ searchResult.email }}
              </p>
            </div>
          </div>
          <button
            @click="toggleFollow(searchResult.user_id, searchResult.is_following)"
            :disabled="isFollowLoading"
            :class="[
              'px-4 py-2 text-sm sm:text-base rounded-md font-medium transition-colors duration-200',
              searchResult.is_following
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-point-yellow text-dark-gray hover:bg-base-yellow'
            ]"
          >
            {{ searchResult.is_following ? '언팔로우' : '팔로우' }}
          </button>
        </div>
      </div>

      <div v-else-if="users.length > 0" class="space-y-3">
        <div
          v-for="user in users"
          :key="user.user_id"
          class="bg-white rounded-lg shadow-md p-4 sm:p-6"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 sm:h-8 sm:w-8 text-gray-500"
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
                <h3 class="text-base sm:text-lg font-medium text-dark-gray">
                  {{ user.name || '이름 없음' }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ user.email }}
                </p>
              </div>
            </div>
            <button
              v-if="activeTab === 'followers'"
              @click="toggleFollow(user.user_id, user.is_following)"
              :disabled="isFollowLoading"
              :class="[
                'px-4 py-2 text-sm sm:text-base rounded-md font-medium transition-colors duration-200',
                user.is_following
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-point-yellow text-dark-gray hover:bg-base-yellow'
              ]"
            >
              {{ user.is_following ? '언팔로우' : '팔로우' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-gray-500">
        {{ activeTab === 'search' ? '검색 결과가 없습니다.' : '목록이 비어있습니다.' }}
      </div>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar />
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

/* iOS에서 자동 확대 방지 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  input {
    font-size: 16px;
  }
}
</style>
