<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()

// 사용자 정보 (실제 구현 시 스토어나 API에서 가져올 예정)
const userInfo = ref({
  name: '홍길동',
  email: 'user@example.com',
  isPregnant: true,
  dueDate: '2025-06-15',
  pregnancyWeek: 12,
  babyNickname: '콩콩이'
})

// 출산 예정일까지 남은 일수 계산 함수
const getDaysUntilDueDate = () => {
  const today = new Date()
  const dueDate = new Date(userInfo.value.dueDate)
  
  // 날짜 차이 계산 (밀리초 단위)
  const diffTime = dueDate.getTime() - today.getTime()
  
  // 일수로 변환
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays > 0 ? diffDays : 0
}

// 받침 유무에 따라 적절한 조사 선택 함수
const getJosa = (word, josa1, josa2) => {
  if (!word || word.length === 0) return josa1
  
  // 마지막 글자의 유니코드 값
  const charCode = word.charCodeAt(word.length - 1)
  
  // 한글 유니코드 범위 및 받침 유무 확인
  // 한글 유니코드: AC00(가) ~ D7A3(힣)
  // 받침이 있으면 (charCode - AC00) % 28 != 0
  if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
    return (charCode - 0xAC00) % 28 > 0 ? josa1 : josa2
  }
  
  // 한글이 아닌 경우 기본값 반환
  return josa1
}

// 로그아웃 함수 (실제 구현은 나중에)
const handleLogout = () => {
  // 로컬 스토리지에서 사용자 정보 및 토큰 제거
  localStorage.removeItem('rememberMe')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userName')
  localStorage.removeItem('userId')
  localStorage.removeItem('isPregnant')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  
  // 세션 스토리지에서 사용자 정보 및 토큰 제거
  sessionStorage.removeItem('userEmail')
  sessionStorage.removeItem('userName')
  sessionStorage.removeItem('userId')
  sessionStorage.removeItem('isPregnant')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  
  // 로그아웃 메시지 표시
  alert('로그아웃 되었습니다.')
  
  // 로그인 페이지로 이동
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md">
      <h1 class="text-xl font-bold text-center text-dark-gray">마이페이지</h1>
    </div>

    <!-- 사용자 정보 섹션 -->
    <div class="p-4 mt-4">
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <div class="flex items-center mb-4">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-dark-gray">{{ userInfo.name }}</h2>
            <p class="text-sm text-gray-500">{{ userInfo.email }}</p>
          </div>
        </div>

        <div v-if="userInfo.isPregnant" class="bg-base-yellow bg-opacity-20 p-4 rounded-lg mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium text-dark-gray">임신 {{ userInfo.pregnancyWeek }}주차</span>
            <span class="text-sm text-gray-500">{{ userInfo.babyNickname }} 만나기까지 D-{{ getDaysUntilDueDate() }} ♥</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-point-yellow h-2.5 rounded-full" :style="{ width: `${(userInfo.pregnancyWeek / 40) * 100}%` }"></div>
          </div>
        </div>
      </div>

      <!-- 메뉴 섹션 -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <div class="divide-y divide-gray-100">
          <button 
            class="w-full p-4 text-left flex items-center"
            @click="router.push('/user-info-edit')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
            </svg>
            <span class="text-dark-gray">내 정보 관리</span>
          </button>
          
          <button 
            class="w-full p-4 text-left flex items-center"
            @click="router.push('/pregnancy-info-edit')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg>
            <span class="text-dark-gray">임신 정보 입력</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
              <path d="M10 9l1 1-3 3" stroke="currentColor" stroke-width="1" fill="none" />
            </svg>
            <span class="text-dark-gray">오늘의 하루</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
              <path d="M9 11a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span class="text-dark-gray">{{ userInfo.babyNickname }}{{ getJosa(userInfo.babyNickname, '과', '와') }}의 하루</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            <span class="text-dark-gray">비밀번호 변경</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span class="text-dark-gray">공지사항</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <span class="text-dark-gray">자주 묻는 질문</span>
          </button>
          
          <button class="w-full p-4 text-left flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-dark-gray">앱 정보</span>
          </button>
        </div>
      </div>

      <!-- 로그아웃 버튼 -->
      <button 
        @click="handleLogout"
        class="w-full p-4 bg-white rounded-lg shadow-md text-center text-red-500 font-medium"
      >
        로그아웃
      </button>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="profile" />
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