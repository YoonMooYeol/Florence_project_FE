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
    const response = await api.get('/accounts/follow/following/')
    console.log('팔로잉 사용자 목록 데이터:', response.data)

    // 백엔드에서 받아온 데이터 구조 변경됨
    // 이제 각 항목에 following_detail 필드가 있고 is_following 필드도 포함됨
    if (response.data && response.data.length > 0) {
      response.data.forEach((item, index) => {
        console.log(`팔로잉 항목 ${index}:`, item)
        // 추가된 필드 확인
        console.log('following_detail:', item.following_detail)
        console.log('is_following:', item.is_following)
      })
    }

    users.value = response.data
  } catch (error) {
    console.error('팔로잉 사용자 목록 불러오기 오류:', error)
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
// 팔로워 사용자 목록 불러오기
const fetchFollowersUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await api.get('/accounts/follow/followers/')
    console.log('팔로워 사용자 목록 데이터:', response.data)

    // 이제 백엔드에서 직접 is_following 정보를 제공함
    // 기존의 팔로잉 목록을 가져와서 비교하는 로직 제거
    users.value = response.data
  } catch (error) {
    console.error('팔로워 사용자 목록 불러오기 오류:', error)
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
    console.log('이메일 검색 결과:', response.data)

    // 백엔드에서 is_following 값을 제공하므로 별도 요청 필요 없음
    // 응답에 is_following 필드가 없다면 기본값으로 false 설정
    if (response.data && response.data.user_id) {
      if (response.data.is_following === undefined) {
        response.data.is_following = false
        console.log('is_following 필드가 없어 기본값 false로 설정')
      }
    }

    searchResult.value = response.data
    console.log('최종 검색 결과:', searchResult.value)
  } catch (error) {
    console.error('사용자 검색 오류:', error)
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

  console.log(`팔로우/언팔로우 시작: 사용자 ID ${userId}, 현재 팔로우 상태: ${isCurrentlyFollowing}`)
  isFollowLoading.value = true

  try {
    if (isCurrentlyFollowing) {
      // 언팔로우
      console.log(`언팔로우 요청: ${userId}`)
      await api.delete('/accounts/follow/', {
        data: { user_id: userId }
      })
      console.log(`사용자 ID ${userId} 언팔로우 성공`)

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
      console.log(`팔로우 요청: ${userId}`)
      await api.post('/accounts/follow/', {
        user_id: userId
      })
      console.log(`사용자 ID ${userId} 팔로우 성공`)

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
    console.error('팔로우 상태 변경 중 오류:', error)
    console.error('오류 상세:', error.response?.data)
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

    <!-- 탭 네비게이션 -->
    <div class="tabs flex justify-around border-b mb-1">
      <button
        type="button"
        class="py-2 px-4 font-bold"
        :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'search' }"
        @click.prevent="changeTab('search')"
      >
        검색
      </button>
      <button
        type="button"
        class="py-2 px-4 font-bold"
        :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'following' }"
        @click.prevent="changeTab('following')"
      >
        팔로잉
      </button>
      <button
        type="button"
        class="py-2 px-4 font-bold"
        :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'followers' }"
        @click.prevent="changeTab('followers')"
      >
        팔로워
      </button>
    </div>

    <!-- 검색 영역 - 검색 탭에서만 표시 -->
    <div
      v-if="activeTab === 'search'"
      class="p-4"
    >
      <div class="flex mb-4">
        <input
          v-model="searchQuery"
          type="text"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          placeholder="이메일로 검색"
          @keyup.enter="searchUserByEmail"
        >
        <button
          class="px-4 py-2 bg-point-yellow text-dark-gray rounded-r-md hover:bg-yellow-500 focus:outline-none"
          @click="searchUserByEmail"
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

      <!-- 내 정보 보기 버튼
      <button
        class="w-full mb-4 px-4 py-3 bg-base-yellow rounded-md text-dark-gray font-medium hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-point-yellow"
        @click="fetchMyInfo"
      >
        내 정보 보기
      </button> -->
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
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-gray-600">닉네임</span>
            <span class="font-medium">{{ selectedUser.name || '정보 없음' }}</span>
          </div>
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

    <!-- 검색 결과 - 검색 탭에서만 표시 -->
    <div
      v-if="activeTab === 'search' && searchResult && !isLoading && !selectedUser"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-7 w-7 text-gray-500"
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
                {{ searchResult.name || '이름 없음' }}
              </h3>
              <p class="text-sm text-gray-500 mt-1">
                {{ searchQuery }}
              </p>
            </div>
          </div>
          <button
            class="px-4 py-1 rounded-full text-sm font-medium focus:outline-none"
            :class="searchResult.is_following
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-point-yellow text-dark-gray hover:bg-yellow-400'"
            :disabled="isFollowLoading"
            @click="searchResult && searchResult.user_id ? toggleFollow(searchResult.user_id, searchResult.is_following) : errorMessage = '사용자 ID를 찾을 수 없습니다'"
          >
            <span
              v-if="isFollowLoading"
              class="flex items-center"
            >
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              처리중
            </span>
            <span v-else>
              {{ searchResult.is_following ? '언팔로우' : '팔로우' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 팔로잉/팔로워 목록 -->
    <div
      v-if="(activeTab === 'following' || activeTab === 'followers') && !isLoading && users.length > 0"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md">
        <ul class="divide-y divide-gray-100">
          <li
            v-for="user in users"
            :key="user.id || user.following?.user_id || user.follower?.user_id"
            class="p-4"
          >
            <div class="flex items-center justify-between">
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
                    {{ activeTab === 'following' ? (user.following_detail?.name || '이름 없음') : (user.follower_detail?.name || '이름 없음') }}
                  </h3>
                  <p class="text-sm text-gray-500">
                    {{ activeTab === 'following' ? user.following_detail?.email : user.follower_detail?.email }}
                  </p>
                </div>
              </div>

              <!-- 팔로잉 탭에서의 언팔로우 버튼 -->
              <button
                v-if="activeTab === 'following'"
                class="px-4 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none"
                :disabled="isFollowLoading"
                @click="user.following_detail && user.following_detail.user_id ? toggleFollow(user.following_detail.user_id, true) : errorMessage = '사용자 ID를 찾을 수 없습니다'"
              >
                <span
                  v-if="isFollowLoading"
                  class="flex items-center"
                >
                  <svg
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  처리중
                </span>
                <span v-else>
                  언팔로우
                </span>
              </button>

              <!-- 팔로워 탭에서의 팔로우/언팔로우 버튼 -->
              <button
                v-if="activeTab === 'followers'"
                class="px-4 py-1 rounded-full text-sm font-medium focus:outline-none"
                :class="user.is_following ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-point-yellow text-dark-gray hover:bg-yellow-400'"
                :disabled="isFollowLoading"
                @click="user.follower_detail && user.follower_detail.user_id ? toggleFollow(user.follower_detail.user_id, user.is_following) : errorMessage = '사용자 ID를 찾을 수 없습니다'"
              >
                <span
                  v-if="isFollowLoading"
                  class="flex items-center"
                >
                  <svg
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  처리중
                </span>
                <span v-else>
                  {{ user.is_following ? '언팔로우' : '팔로우' }}
                </span>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- 검색 결과나 팔로잉/팔로워가 없을 때 -->
    <div
      v-if="((activeTab === 'following' || activeTab === 'followers') && !isLoading && users.length === 0) ||
        (activeTab === 'search' && !searchResult && !selectedUser && !isLoading)"
      class="p-4 text-center bg-white m-4 rounded-lg shadow-md"
    >
      <p class="text-gray-500 py-8">
        {{ activeTab === 'search' ? '이메일로 사용자를 검색해 보세요.' :
          activeTab === 'following' ? '팔로우하는 사용자가 없습니다.' :
          '팔로워가 없습니다.' }}
      </p>
    </div>

    <!-- 하단 풋바 -->
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
