<script setup>
import { ref, onMounted, computed, watch, nextTick, onUpdated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'

const CONTEXT = 'LlmChat'

// 백엔드 서버 URL 설정
const API_BASE_URL = 'http://127.0.0.1:8000'

// API 클라이언트 설정
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 쿠키를 포함한 요청을 위해 설정
})

// 인증 토큰 설정 함수
const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

// 상태 관리
const router = useRouter()
const isLoading = ref(false)
const errorMessage = ref('')
const userInfo = ref(null)
const chatRooms = ref([])
const selectedChatId = ref(null)
const currentChat = ref(null)
const messages = ref([])
const userInput = ref('')
const isSubmitting = ref(false)
const showNewChatDialog = ref(false)
const lastSubmitTime = ref(0)
const debounceTime = 1000 // 1초 디바운스
const chatContainer = ref(null)
const isSummarizing = ref(false) // 요약 기능 로딩 상태
const chatSummary = ref(null) // 채팅방 요약 정보
const showSummary = ref(false) // 요약 보기 모달 표시 여부
const showChatRoomDropdown = ref(false) // 데스크탑 채팅방 선택 드롭다운 표시 여부
const showMobileChatRoomDropdown = ref(false) // 모바일 채팅방 선택 드롭다운 표시 여부

// 스크롤 위치 감지
const isUserScrolling = ref(false);
const lastScrollTop = ref(0);

// 스크롤 이벤트 핸들러
const handleScroll = (event) => {
  // 현재 스크롤 위치
  const currentScrollTop = event.target.scrollTop;
  
  // 스크롤 방향 (위로/아래로)
  const isScrollingDown = currentScrollTop > lastScrollTop.value;
  
  // 스크롤이 거의 맨 아래에 도달했는지 확인
  const isNearBottom = 
    currentScrollTop + event.target.clientHeight >= 
    event.target.scrollHeight - 50;
    
  // 스크롤이 거의 맨 아래거나 아래로 스크롤 중이면 사용자 스크롤 플래그 해제
  if (isNearBottom || isScrollingDown) {
    isUserScrolling.value = false;
  } else {
    // 위로 스크롤하는 경우 사용자 스크롤 플래그 설정
    isUserScrolling.value = true;
  }
  
  // 마지막 스크롤 위치 저장
  lastScrollTop.value = currentScrollTop;
};

// 로컬 스토리지에서 토큰 가져오기
const getTokenFromStorage = () => {
  // 로컬 스토리지에서 먼저 확인
  let token = localStorage.getItem('accessToken')

  // 로컬 스토리지에 없으면 세션 스토리지에서 확인
  if (!token) {
    token = sessionStorage.getItem('accessToken')
  }

  if (token) {
    setAuthToken(token)
    return token
  }
  return null
}

// 사용자 정보 가져오기
const getUserInfo = async () => {
  try {
    const response = await apiClient.get('/v1/accounts/users/me/')
    userInfo.value = response.data
    return response.data
  } catch (error) {
    logger.error(CONTEXT, '사용자 정보 조회 오류:', error)
    handleError(error, `${CONTEXT}.getUserInfo`)
    return null
  }
}

// 임신 정보 확인하기
const checkPregnancyInfo = async () => {
  try {
    const response = await apiClient.get('/v1/accounts/pregnancies/')
    return response.data && response.data.length > 0
  } catch (error) {
    logger.error(CONTEXT, '임신 정보 조회 오류:', error)
    handleError(error, `${CONTEXT}.checkPregnancyInfo`)
    return false
  }
}

// 채팅방 목록 가져오기
const getChatRooms = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const userId = userInfo.value?.user_id
    if (!userId) {
      throw new Error('유저 정보가 없습니다')
    }

    const response = await apiClient.get(`/v1/llm/chat/rooms/?user_id=${userId}`)
    chatRooms.value = response.data
    
    // 채팅방이 있으면 첫 번째 채팅방 선택
    if (chatRooms.value.length > 0 && !selectedChatId.value) {
      selectedChatId.value = chatRooms.value[0].chat_id
      await loadChatRoom(selectedChatId.value)
    }
  } catch (error) {
    errorMessage.value = '채팅방 목록을 가져오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '채팅방 목록 조회 오류:', error)
    handleError(error, `${CONTEXT}.getChatRooms`)
  } finally {
    isLoading.value = false
  }
}

// 새 채팅방 생성하기
const createChatRoom = async () => {
  isLoading.value = true
  errorMessage.value = ''
  showNewChatDialog.value = false

  try {
    const userId = userInfo.value?.user_id
    // 임신 정보의 첫 번째 항목 ID 사용
    const pregnancyInfo = await apiClient.get('/v1/accounts/pregnancies/')
    const pregnancyId = pregnancyInfo.data && pregnancyInfo.data.length > 0
      ? pregnancyInfo.data[0].pregnancy_id
      : null

    if (!userId || !pregnancyId) {
      throw new Error('사용자 정보 또는 임신 정보가 없습니다')
    }

    const response = await apiClient.post('/v1/llm/chat/rooms/', {
      user_id: userId,
      pregnancy_id: pregnancyId
    })

    // 새로 생성된 채팅방을 목록에 추가
    chatRooms.value.unshift(response.data)
    
    // 새 채팅방 선택
    selectedChatId.value = response.data.chat_id
    await loadChatRoom(selectedChatId.value)
    
    // 환영 메시지 추가
    messages.value = [{
      id: Date.now(),
      role: 'assistant',
      content: '안녕하세요! 플로렌스 AI 상담사입니다. 임신 및 출산에 관한 질문이 있으시면 언제든지 물어보세요.',
      created_at: getCurrentTime()
    }]
  } catch (error) {
    errorMessage.value = '새 채팅방을 생성하는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '채팅방 생성 오류:', error)
    handleError(error, `${CONTEXT}.createChatRoom`)
  } finally {
    isLoading.value = false
  }
}

// 채팅방 상세 조회
const loadChatRoom = async (chatId) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await apiClient.get(`/v1/llm/chat/rooms/${chatId}/?include_messages=true`)
    currentChat.value = response.data
    
    // 메시지 가공
    messages.value = []
    
    if (response.data.all_messages && response.data.all_messages.length > 0) {
      response.data.all_messages.forEach(msg => {
        // 사용자 질문 추가
        messages.value.push({
          id: msg.id + '-query',
          role: 'user',
          content: msg.query,
          created_at: formatDate(msg.created_at)
        })
        
        // AI 응답 추가
        messages.value.push({
          id: msg.id + '-response',
          role: 'assistant',
          content: msg.response,
          created_at: formatDate(msg.created_at)
        })
      })
    } else {
      // 채팅방에 메시지가 없으면 환영 메시지 추가
      messages.value = [{
        id: Date.now(),
        role: 'assistant',
        content: '안녕하세요! 플로렌스 AI 상담사입니다. 임신 및 출산에 관한 질문이 있으시면 언제든지 물어보세요.',
        created_at: getCurrentTime()
      }]
    }
    
    // 채팅 목록 UI 업데이트 후 스크롤
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  } catch (error) {
    errorMessage.value = '채팅방 정보를 불러오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '채팅방 상세 조회 오류:', error)
    handleError(error, `${CONTEXT}.loadChatRoom`)
  } finally {
    isLoading.value = false
  }
}

// 디바운스 체크 함수
const isDebounced = () => {
  const now = Date.now()
  if (now - lastSubmitTime.value < debounceTime) {
    logger.warn(CONTEXT, '너무 빠른 요청이 감지되었습니다. 요청이 무시됩니다.')
    return true
  }
  lastSubmitTime.value = now
  return false
}

// 메시지 전송 함수
const sendMessage = async () => {
  // 메시지가 비어있거나 이미 제출 중이거나 디바운스 적용 중이면 무시
  if (!userInput.value.trim() || isSubmitting.value || isDebounced()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  const userMessage = userInput.value.trim()
  userInput.value = ''

  try {
    if (!selectedChatId.value) {
      throw new Error('선택된 채팅방이 없습니다')
    }

    // 사용자 메시지 추가
    const userMessageObj = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: getCurrentTime()
    }
    messages.value.push(userMessageObj)
    
    // 스크롤 아래로 - 강제 스크롤 사용
    forceScrollToBottom()
    
    // 응답 대기 메시지 추가
    const waitingId = `waiting-${Date.now()}`
    messages.value.push({
      id: waitingId,
      role: 'assistant',
      content: '',
      isTyping: true,
      created_at: getCurrentTime()
    })
    
    // 스크롤 아래로 - 강제 스크롤 사용
    forceScrollToBottom()

    // API 호출
    const response = await apiClient.post(`/v1/llm/chat/rooms/${selectedChatId.value}/messages/`, {
      query: userMessage
    })

    // 응답 대기 메시지 제거
    messages.value = messages.value.filter(m => m.id !== waitingId)

    // AI 응답 추가
    messages.value.push({
      id: response.data.id,
      role: 'assistant',
      content: response.data.response,
      created_at: getCurrentTime()
    })
    
    // 채팅방 목록 새로고침
    await getChatRooms()
    
    // 스크롤 아래로 - 강제 스크롤 사용
    forceScrollToBottom()
  } catch (error) {
    // 응답 대기 메시지를 에러 메시지로 변경
    const waitingMsg = messages.value.find(m => m.isTyping)
    if (waitingMsg) {
      waitingMsg.content = '메시지를 전송하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      waitingMsg.isTyping = false
      waitingMsg.isError = true
    } else {
      messages.value.push({
        id: `error-${Date.now()}`,
        role: 'system',
        content: '메시지를 전송하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        isError: true,
        created_at: getCurrentTime()
      })
    }
    
    errorMessage.value = '메시지를 전송하는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '메시지 전송 오류:', error)
    handleError(error, `${CONTEXT}.sendMessage`)
  } finally {
    isSubmitting.value = false
    // 마지막으로 한번 더 스크롤
    forceScrollToBottom()
  }
}

// 스크롤을 맨 아래로 이동 - 코드 수정
const scrollToBottom = () => {
  // 사용자가 위로 스크롤 중이면 스크롤 안함
  if (isUserScrolling.value) {
    return;
  }
  
  nextTick(() => {
    if (chatContainer.value) {
      // 약간의 지연 후 스크롤 적용 (DOM 업데이트 완료 보장)
      setTimeout(() => {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight + 1000;
      }, 50);
    }
  });
};

// 메시지 전송 후 무조건 스크롤
const forceScrollToBottom = () => {
  // 사용자 스크롤 상태 무시하고 강제로 스크롤
  isUserScrolling.value = false;
  
  nextTick(() => {
    if (chatContainer.value) {
      // 더 긴 지연 시간으로 스크롤 적용
      setTimeout(() => {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight + 1000;
      }, 100);
    }
  });
};

// 메시지 배열 변경 감시
watch(messages, () => {
  // 메시지가 변경되면 스크롤 맨 아래로
  scrollToBottom();
  
  // 메시지가 추가되면 시간차를 두고 한 번 더 스크롤 (애니메이션 등 완료 후)
  if (messages.value.length > 0) {
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }
}, { deep: true });

// 메시지 전송 키보드 이벤트 처리
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    const inputText = userInput.value.trim()
    if (inputText) {
      setTimeout(() => {
        sendMessage()
      }, 10)
    }
  }
}

// 채팅방 선택 함수
const selectChatRoom = async (chatId) => {
  if (selectedChatId.value !== chatId) {
    selectedChatId.value = chatId
    await loadChatRoom(chatId)
  }
}

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}

// 현재 시간 포맷팅
const getCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 컴포넌트 마운트 시 실행
onMounted(async () => {
  try {
    // 토큰 가져오기
    const token = getTokenFromStorage()
    
    if (!token) {
      // 로그인 페이지로 이동
      router.push('/login?redirect=/llm-chat')
      return
    }
    
    // 사용자 정보 가져오기
    const user = await getUserInfo()
    if (!user) {
      // 사용자 정보가 없으면 로그인 페이지로 이동
      router.push('/login?redirect=/llm-chat')
      return
    }
    
    // 임신 정보 확인
    const hasPregnancyInfo = await checkPregnancyInfo()
    if (!hasPregnancyInfo) {
      // 임신 정보가 없으면 프로필 페이지로 이동
      alert('임신 정보를 먼저 등록해주세요.')
      router.push('/profile')
      return
    }
    
    // 채팅방 목록 가져오기
    await getChatRooms()
    
    // 채팅방이 없으면 새 채팅방 생성
    if (chatRooms.value.length === 0) {
      await createChatRoom()
    }

    // 창 크기 변경 이벤트 처리
    window.addEventListener('resize', scrollToBottom)
    
    // 초기 로딩 후 스크롤 처리
    setTimeout(() => {
      scrollToBottom();
    }, 500);
  } catch (error) {
    errorMessage.value = '데이터를 불러오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '초기화 오류:', error)
    handleError(error, `${CONTEXT}.onMounted`)
  }
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  window.removeEventListener('resize', scrollToBottom)
})

// 컴포넌트 업데이트 시 스크롤 처리
onUpdated(() => {
  scrollToBottom()
})

// 채팅방 이름 컴퓨티드 프로퍼티
const getChatRoomName = (room, index) => {
  // 채팅방에 topic이 있으면 우선 표시
  if (room.topic) {
    return room.topic.length > 25
      ? room.topic.substring(0, 25) + '...'
      : room.topic
  }
  
  // 첫 번째 메시지가 있는 경우
  const allMessages = currentChat.value?.all_messages || []
  if (room.chat_id === selectedChatId.value && allMessages.length > 0) {
    return allMessages[0].query.length > 20
      ? allMessages[0].query.substring(0, 20) + '...'
      : allMessages[0].query
  }
  
  return `새 대화 ${index + 1}`
}

// 채팅방 요약 함수
const summarizeChat = async () => {
  if (!selectedChatId.value || isSummarizing.value) return
  
  isSummarizing.value = true
  errorMessage.value = ''
  
  try {
    const response = await apiClient.post(`/v1/llm/chat/rooms/${selectedChatId.value}/summarize/`)
    chatSummary.value = response.data
    
    // 요약 모달 표시
    showSummary.value = true
    
    // 채팅방 정보 업데이트 (요약이 업데이트되었을 경우)
    if (chatSummary.value.is_updated && currentChat.value) {
      currentChat.value.topic = chatSummary.value.topic
      
      // 채팅방 목록도 업데이트
      const chatRoom = chatRooms.value.find(room => room.chat_id === selectedChatId.value)
      if (chatRoom) {
        chatRoom.topic = chatSummary.value.topic
      }
    }
  } catch (error) {
    errorMessage.value = '채팅방 요약 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '채팅방 요약 오류:', error)
    handleError(error, `${CONTEXT}.summarizeChat`)
  } finally {
    isSummarizing.value = false
  }
}

// 요약 모달 닫기
const closeSummary = () => {
  showSummary.value = false
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="chat" />

    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between fixed top-0 left-0 right-0 z-20">
      <div class="flex items-center">
        <h1 class="text-xl font-bold text-dark-gray">
          하트비트 AI 채팅
        </h1>
      </div>
      <div class="flex items-center space-x-2">
        <button
          class="p-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none"
          @click="showNewChatDialog = true"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div
      v-if="errorMessage"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 mt-16"
    >
      <p>{{ errorMessage }}</p>
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50"
    >
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4" />
    </div>

    <!-- 메인 컨텐츠 영역 -->
    <div class="flex flex-1 mt-16 relative">
      <!-- 채팅방 목록 (데스크탑) -->
      <div class="w-1/3 bg-white border-r border-gray-200 overflow-y-auto hidden md:block fixed top-16 bottom-0 left-0 z-10 md:w-1/4">
        <div class="p-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-dark-gray">
              채팅 목록
            </h2>
            <button
              class="p-1 rounded-full bg-point-yellow hover:bg-yellow-400 focus:outline-none"
              @click="createChatRoom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-dark-gray"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="(room, index) in chatRooms"
              :key="room.chat_id"
              class="p-3 rounded-lg cursor-pointer"
              :class="selectedChatId === room.chat_id ? 'bg-base-yellow' : 'bg-gray-100 hover:bg-gray-200'"
              @click="selectChatRoom(room.chat_id)"
            >
              <div class="font-medium text-dark-gray truncate">
                {{ getChatRoomName(room, index) }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ new Date(room.updated_at).toLocaleDateString() }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 채팅 내용 영역 -->
      <div class="flex-1 flex flex-col md:pl-1/4 w-full">
        <!-- 현재 채팅방 제목 (MD 이상 화면에서만 표시) -->
        <div 
          v-if="selectedChatId && currentChat" 
          class="bg-white p-3 border-b border-gray-200 hidden md:flex items-center justify-between fixed top-16 left-1/4 right-0 z-10"
        >
          <h2 class="font-semibold text-dark-gray">
            {{ currentChat.topic || '새 대화' }}
          </h2>
          <!-- 데스크탑 채팅방 선택 드롭다운 -->
          <div class="relative">
            <button
              class="p-2 bg-white border border-point-yellow text-dark-gray rounded-lg hover:bg-gray-100 focus:outline-none flex items-center"
              @click="() => showChatRoomDropdown = !showChatRoomDropdown"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5 mr-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              <span class="text-sm">채팅방 선택</span>
            </button>
            
            <!-- 채팅방 선택 드롭다운 메뉴 -->
            <div 
              v-if="showChatRoomDropdown"
              class="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg z-50 max-h-80 overflow-y-auto border border-gray-200"
            >
              <div class="p-2">
                <div
                  v-for="(room, index) in chatRooms"
                  :key="room.chat_id"
                  class="p-2 rounded-md cursor-pointer hover:bg-gray-100 mb-1"
                  :class="selectedChatId === room.chat_id ? 'bg-base-yellow' : ''"
                  @click="selectChatRoom(room.chat_id); showChatRoomDropdown = false"
                >
                  <div class="text-sm font-medium text-dark-gray truncate">
                    {{ getChatRoomName(room, index) }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ new Date(room.updated_at).toLocaleDateString() }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 모바일 채팅방 선택 드롭다운 - 상단에 고정 -->
        <div 
          v-if="selectedChatId" 
          class="bg-ivory py-2 px-3 border-b border-gray-200 flex md:hidden items-center justify-between fixed top-16 left-0 right-0 z-10"
        >
          <div class="text-sm font-medium text-gray-600">
            {{ currentChat?.topic || '새 대화' }}
          </div>
          <button
            class="flex items-center py-1.5 px-3 bg-white border border-point-yellow text-dark-gray rounded-full hover:bg-gray-100 focus:outline-none shadow-sm text-sm"
            @click="() => showMobileChatRoomDropdown = !showMobileChatRoomDropdown"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              class="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            <span>채팅방 선택</span>
          </button>
          
          <!-- 모바일 채팅방 선택 드롭다운 메뉴 -->
          <div 
            v-if="showMobileChatRoomDropdown"
            class="absolute top-full left-0 right-0 mt-1 bg-white rounded-b-md shadow-lg z-50 max-h-60 overflow-y-auto border-t border-gray-200"
          >
            <div class="p-2">
              <div
                v-for="(room, index) in chatRooms"
                :key="room.chat_id"
                class="p-2 rounded-md cursor-pointer hover:bg-gray-100 mb-1"
                :class="selectedChatId === room.chat_id ? 'bg-base-yellow' : ''"
                @click="selectChatRoom(room.chat_id); showMobileChatRoomDropdown = false"
              >
                <div class="text-sm font-medium text-dark-gray truncate">
                  {{ getChatRoomName(room, index) }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ new Date(room.updated_at).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 채팅 메시지 영역 -->
        <div
          ref="chatContainer"
          class="chat-messages-container"
          @scroll="handleScroll"
        >
          <div class="flex flex-col space-y-4 p-4 pb-10">
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex"
              :class="message.role === 'user' ? 'justify-end' : (message.role === 'system' ? 'justify-center' : 'justify-start')"
            >
              <!-- AI 메시지 -->
              <div
                v-if="message.role === 'assistant'"
                class="flex max-w-[85%] md:max-w-[75%]"
              >
                <div class="w-8 h-8 bg-point-yellow rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-dark-gray"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8 5a1 1 0 100-2 1 1 0 000 2zm-2-7.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
                  </svg>
                </div>
                <div class="assistant-message">
                  <div
                    class="bg-white p-3 rounded-lg shadow-sm whitespace-pre-wrap"
                    :class="{
                      'typing-message': message.isTyping
                    }"
                  >
                    {{ message.content }}
                    <span
                      v-if="message.isTyping"
                      class="typing-indicator"
                    >
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1 ml-1">
                    {{ message.created_at }}
                  </div>
                </div>
              </div>
              
              <!-- 사용자 메시지 -->
              <div
                v-else-if="message.role === 'user'"
                class="flex flex-col items-end max-w-[85%] md:max-w-[75%]"
              >
                <div class="bg-base-yellow p-3 rounded-lg shadow-sm whitespace-pre-wrap">
                  {{ message.content }}
                </div>
                <div class="text-xs text-gray-500 mt-1 mr-1">
                  {{ message.created_at }}
                </div>
              </div>
              
              <!-- 시스템 메시지 (에러 등) -->
              <div
                v-else
                class="max-w-[90%] mx-auto"
              >
                <div 
                  class="p-2 px-4 rounded-lg text-sm whitespace-pre-wrap text-center"
                  :class="message.isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'"
                >
                  {{ message.content }}
                </div>
              </div>
            </div>
            <!-- 하단 여백 -->
            <div class="h-10"></div>
          </div>
        </div>

        <!-- 메시지 입력 영역 -->
        <div class="message-input-area">
          <div class="input-container">
            <textarea
              v-model="userInput"
              placeholder="메시지를 입력하세요"
              class="chat-input flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-point-yellow resize-none"
              rows="1"
              @keydown="handleKeyDown"
            />
            <button
              class="send-button p-2 ml-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              :disabled="isSubmitting || !userInput.trim()"
              @click="sendMessage"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 채팅 요약 모달 -->
    <div
      v-if="showSummary"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h3 class="text-lg font-bold text-dark-gray mb-4">
          대화 요약
        </h3>
        <div v-if="chatSummary" class="mb-6">
          <div class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-gray-800 font-medium mb-2">주제</p>
            <p class="text-gray-700">{{ chatSummary.topic }}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg text-gray-600 text-sm">
            <p>메시지 수: {{ chatSummary.message_count }}개</p>
          </div>
        </div>
        <div class="flex justify-end">
          <button
            class="px-4 py-2 bg-point-yellow text-dark-gray rounded-md hover:bg-yellow-400 focus:outline-none"
            @click="closeSummary"
          >
            확인
          </button>
        </div>
      </div>
    </div>

    <!-- 새 채팅방 생성 다이얼로그 -->
    <div
      v-if="showNewChatDialog"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h3 class="text-lg font-bold text-dark-gray mb-4">
          새 채팅방 생성
        </h3>
        <p class="mb-6 text-gray-600">
          새 채팅방을 생성하시겠습니까?
        </p>
        <div class="flex justify-end space-x-3">
          <button
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none"
            @click="showNewChatDialog = false"
          >
            취소
          </button>
          <button
            class="px-4 py-2 bg-point-yellow text-dark-gray rounded-md hover:bg-yellow-400 focus:outline-none"
            @click="createChatRoom"
          >
            생성
          </button>
        </div>
      </div>
    </div>
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

/* 채팅방 목록 레이아웃 */
@media (min-width: 768px) {
  .md\:pl-1\/4 {
    padding-left: 25%;
  }
  
  .md\:w-1\/4 {
    width: 25%;
  }
  
  .left-1\/4 {
    left: 25%;
  }
}

.chat-messages-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 스크롤 개선 */
  scroll-behavior: smooth; /* 부드러운 스크롤 효과 */
  position: fixed;
  top: 64px; /* 헤더 높이 */
  bottom: 56px; /* 입력 필드 + 하단 네비게이션 바 */
  width: 100%;
  left: 0;
  right: 0;
  z-index: 5; /* 채팅 메시지 영역의 z-index 조정 */
  background-color: #FFFAE0; /* 배경색 추가 */
}

.message-input-area {
  position: fixed;
  bottom: 56px; /* 하단 네비게이션 바 높이 */
  left: 0;
  right: 0;
  background-color: white;
  padding: 8px 0;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 20;
  height: 56px; /* 높이 고정 */
  display: flex;
  justify-content: center; /* 중앙 정렬 */
  align-items: center;
}

.input-container {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 640px; /* 최대 너비 설정 */
  padding: 0 16px; /* 좌우 패딩 */
  margin: 0 auto; /* 중앙 정렬 */
}

.chat-input {
  border-radius: 18px;
  min-height: 40px;
  max-height: 80px;
  overflow-y: auto;
  -webkit-appearance: none;
  appearance: none;
  line-height: 1.5;
  outline: none;
}

.send-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 채팅 메시지 스타일 개선 */
.assistant-message {
  max-width: 100%;
}

/* 모바일 환경 최적화 */
@media (max-width: 767px) {
  .chat-messages-container {
    top: 104px; /* 헤더 + 모바일 요약 버튼 높이 */
    padding-top: 10px;
  }
  
  .input-container {
    padding: 0 12px; /* 모바일에서는 좁은 패딩 */
  }
}

/* 데스크탑 레이아웃 조정 */
@media (min-width: 768px) {
  .chat-messages-container {
    left: 25%; /* 채팅방 목록 너비만큼 오른쪽으로 이동 */
    top: 104px; /* 헤더 + 채팅방 제목 높이 */
  }
  
  .message-input-area {
    left: 25%; /* 채팅방 목록 너비만큼 오른쪽으로 이동 */
  }
  
  .input-container {
    padding: 0; /* 데스크탑에서는 패딩 제거 */
  }
}

textarea {
  max-height: 100px;
  min-height: 40px;
  -webkit-appearance: none; /* iOS 입력 필드 스타일 개선 */
  appearance: none;
  font-size: 16px; /* iOS에서 자동 확대 방지 */
}

/* 모바일 환경 최적화 */
@media (max-width: 768px) {
  .chat-messages {
    padding-bottom: 260px; /* 모바일에서 더 큰 하단 패딩 */
    height: calc(100vh - 170px);
  }
  
  .message-input-area {
    bottom: 56px; /* 모바일에서의 하단 네비게이션 바 높이 */
  }
}

/* 타이핑 메시지 스타일 */
.typing-message {
  background-color: #f8f9fa !important;
  border-left: 3px solid #FFD600;
}

/* 타이핑 인디케이터 */
.typing-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 5px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  margin: 0 2px;
  background-color: #666;
  border-radius: 50%;
  opacity: 0;
  animation: typingAnimation 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingAnimation {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}
</style> 