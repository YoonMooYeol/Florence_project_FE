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
const hasExplicitlyFollowed = ref(false)

// 성공한 API 경로 캐싱
const successfulPaths = ref({
  following: '',
  followers: '',
  follow: '',
  unfollow: ''
})

const changeTab = (tab) => {
  activeTab.value = tab
  searchQuery.value = ''
  selectedUser.value = null
  
  // 탭에 따라 적절한 사용자 목록 불러오기
  if (tab === 'search') {
    fetchAllUsers()
  } else if (tab === 'following') {
    if (hasExplicitlyFollowed.value) {
      fetchFollowingUsers()
    } else {
      users.value = []
      isLoading.value = false
    }
  } else if (tab === 'followers') {
    fetchFollowersUsers()
  }
}

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

// 팔로잉 사용자 목록 불러오기
const fetchFollowingUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    console.log('팔로잉 목록 API 호출 시작')
    const response = await api.get('/accounts/follow/following/')
    console.log('팔로잉 사용자 목록 데이터:', response.data)
    users.value = response.data
    successfulPaths.value.following = '/accounts/follow/following/' // 성공한 경로 저장
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
const fetchFollowersUsers = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    console.log('팔로워 목록 API 호출 시작')
    const response = await api.get('/accounts/follow/followers/')
    console.log('팔로워 사용자 목록 데이터:', response.data)
    users.value = response.data
    successfulPaths.value.followers = '/accounts/follow/followers/' // 성공한 경로 저장
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

// 사용자 검색 함수
const searchUsers = async () => {
  if (!searchQuery.value.trim()) {
    if (activeTab.value === 'search') {
      await fetchAllUsers()
    } else if (activeTab.value === 'following') {
      await fetchFollowingUsers()
    } else if (activeTab.value === 'followers') {
      await fetchFollowersUsers()
    }
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    let response
    if (activeTab.value === 'search') {
      response = await api.get('/accounts/users/')
    } else if (activeTab.value === 'following') {
      // 팔로잉 목록 가져오기
      response = await api.get('/accounts/follow/following/')
    } else if (activeTab.value === 'followers') {
      // 팔로워 목록 가져오기
      response = await api.get('/accounts/follow/followers/')
    }
    
    console.log('검색 결과 데이터:', response.data)
    const allUsers = response.data

    // 아이디(username)에 검색어가 포함된 사용자 필터링
    users.value = allUsers.filter(user => {
      if (searchQuery.value.includes('@')) {
        return user.email?.toLowerCase() === searchQuery.value.toLowerCase()
      }
      return user.username?.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
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

// 팔로우 상태 체크 함수 추가
const isFollowing = (user) => {
  // 팔로잉 여부를 확인하는 로직
  // 서버에서 제공하는 데이터에 팔로잉 상태 정보가 있다면 그것을 사용
  // 없다면 별도로 관리해야 함
  return user.is_following || false
}

// 팔로우/언팔로우 함수 추가
const toggleFollow = async (user, event) => {
  // 이벤트 버블링 방지 (사용자 상세 정보로 넘어가지 않도록)
  if (event) event.stopPropagation()
  
  if (!user.email) {
    errorMessage.value = '사용자 이메일이 없어 팔로우할 수 없습니다.'
    return
  }
  
  // 로딩 상태 활성화
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 현재 팔로우 상태 확인
    const isCurrentlyFollowing = isFollowing(user)
    
    // 정확한 API 엔드포인트 사용
    const apiEndpoint = `/accounts/follow/${user.email}/`
    
    console.log(`팔로우 API 요청: POST ${apiEndpoint} (현재 상태: ${isCurrentlyFollowing ? '팔로잉중' : '팔로우안함'})`)
    
    // 팔로우/언팔로우 모두 POST 요청 사용
    await api.post(apiEndpoint)
    
    console.log(`사용자 ${user.email} ${isCurrentlyFollowing ? '언팔로우' : '팔로우'} 성공`)
    
    // 팔로우 상태 업데이트
    user.is_following = !isCurrentlyFollowing
    
    // 팔로우 탭에 있을 때 팔로잉 사용자 목록 갱신
    if (activeTab.value === 'following') {
      await fetchFollowingUsers()
    } else if (activeTab.value === 'followers') {
      await fetchFollowersUsers()
    }
    
    hasExplicitlyFollowed.value = true // 명시적으로 팔로우 액션을 수행했음을 기록
  } catch (error) {
    console.error(`사용자 ${user.email} ${isFollowing(user) ? '언팔로우' : '팔로우'} 오류:`, error)
    
    // 오류 응답 세부 정보 로깅
    if (error.response) {
      console.error('오류 상태 코드:', error.response.status)
      console.error('오류 응답 데이터:', error.response.data)
      
      // 데이터베이스 오류 감지 (HTML 응답에서 오류 메시지 추출)
      const responseText = error.response.data.toString()
      const isDatabaseError = responseText.includes('relation') && responseText.includes('does not exist')
      const isProgrammingError = responseText.includes('ProgrammingError')
      
      if (isDatabaseError || isProgrammingError) {
        console.error('데이터베이스 오류 감지됨')
        errorMessage.value = '서버 데이터베이스 설정에 문제가 있습니다. 관리자에게 문의하세요.'
        
        // 개발 모드에서는 UI 반응을 시뮬레이션 (사용자 경험 유지)
        if (process.env.NODE_ENV !== 'production') {
          console.log('개발 모드: 팔로우 상태 변경 시뮬레이션')
          const isCurrentlyFollowing = isFollowing(user)
          user.is_following = !isCurrentlyFollowing
        }
        
        isLoading.value = false
        return
      }
    }
    
    let errorMsg = `${isFollowing(user) ? '언팔로우' : '팔로우'} 중 오류가 발생했습니다.`
    
    if (error.response) {
      if (error.response.status === 404) {
        errorMsg = '팔로우 기능을 위한 API 엔드포인트를 찾을 수 없습니다.'
      } else if (error.response.status === 500) {
        errorMsg = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.response.status === 400) {
        errorMsg = '잘못된 요청 형식입니다.'
      } else if (error.response.status === 401) {
        errorMsg = '인증이 필요합니다. 다시 로그인해주세요.'
      } else if (error.response.data?.detail) {
        errorMsg = error.response.data.detail
      }
    }
    
    errorMessage.value = errorMsg
  } finally {
    isLoading.value = false
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

    <!-- 탭 네비게이션 -->
    <div class="tabs flex justify-around border-b mb-1">
      <button type="button" @click.prevent="changeTab('search')" class="py-2 px-4 font-bold" :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'search' }">
        검색
      </button>
      <button type="button" @click.prevent="changeTab('following')" class="py-2 px-4 font-bold" :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'following' }">
        팔로잉
      </button>
      <button type="button" @click.prevent="changeTab('followers')" class="py-2 px-4 font-bold" :class="{ 'border-b-2 border-yellow-500 font-extrabold text-yellow-700': activeTab === 'followers' }">
        팔로워
      </button>
    </div>

    <!-- 검색 영역 -->
    <div class="p-4">
      <div class="flex mb-4">
        <input
          v-model="searchQuery"
          type="text"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
          placeholder="이메일로 검색"
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
        v-if="activeTab === 'search'"
        class="w-full mb-4 px-4 py-3 bg-base-yellow rounded-md text-dark-gray font-medium hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-point-yellow"
        @click="fetchMyInfo"
      >
        내 정보 보기
      </button>
    </div>

    <template v-if="activeTab === 'search' || activeTab === 'following' || activeTab === 'followers'">
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
                      {{ user.name || '이름 없음' }}
                    </h3>
                    <p class="text-sm text-gray-500">
                      {{ user.username || '아이디 없음' }}
                    </p>
                  </div>
                </div>
                <button
                  @click.stop="toggleFollow(user)"
                  class="px-4 py-1 rounded-full text-sm font-medium focus:outline-none"
                  :class="isFollowing(user) 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-point-yellow text-dark-gray hover:bg-yellow-400'"
                >
                  {{ isFollowing(user) ? '팔로잉' : '팔로우' }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>

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
