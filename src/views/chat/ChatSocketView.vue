<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import * as chatService from '@/services/chatService'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiSend, mdiPlus } from '@mdi/js'
import BabyIcon from '@/components/icons/BabyIcon.vue'

const CONTEXT = 'ChatSocketView'
const sendIconPath = mdiSend // 전송 아이콘 경로 설정

// 라우터 및 기본 상태 설정
const router = useRouter()
const userInfo = ref(null)
const userInput = ref('')
const chatContainer = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')
const showNewChatDialog = ref(false)
const lastTypingTime = ref(0)
const lastSubmitTime = ref(0)
const debounceTime = 1000 // 1초 디바운스

// 메시지 전송 핸들러
const handleSendMessage = async () => {
  if (!userInput.value.trim() || isSubmitting.value || isDebounced()) {
    return
  }

  const query = userInput.value.trim()
  userInput.value = ''
  isSubmitting.value = true

  try {
    if (!chatService.selectedConversation.value) {
      // 선택된 대화가 없는 경우, 새 대화 생성
      await chatService.createConversation(userInfo.value.id)
    }

    // 클라이언트 최적화 UI - 사용자 메시지 미리 추가 (임시 ID로)
    const tempMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: query,
      created_at: getCurrentTime(),
      conversationId: chatService.selectedConversation.value.id,
      isRead: false,
      isPending: true // 전송 중인 상태 표시
    }
    
    // 임시 메시지가 포함된 렌더링을 위해 현재 대화의 메시지에 추가
    if (!chatService.selectedConversation.value.messages) {
      chatService.selectedConversation.value.messages = []
    }
    chatService.selectedConversation.value.messages.push(tempMessage)
    
    // 스크롤 아래로
    scrollToBottom()
    
    // 타이핑 중지 이벤트 발송
    chatService.sendTypingStatus(chatService.selectedConversation.value.id)
    
    // 메시지 전송
    const result = await chatService.sendMessage(chatService.selectedConversation.value.id, query)
    
    if (result) {
      // 임시 메시지 제거 및 실제 메시지로 교체
      chatService.selectedConversation.value.messages = chatService.selectedConversation.value.messages.filter(msg => msg.id !== tempMessage.id)
      
      // 스크롤 아래로 (응답이 오면 자동으로 new_message 이벤트가 발생하여 메시지가 추가됨)
      scrollToBottom()
    }
  } catch (error) {
    errorMessage.value = '메시지를 전송하는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '메시지 전송 오류:', error)
    handleError(error, `${CONTEXT}.handleSendMessage`)
  } finally {
    isSubmitting.value = false
  }
}

// 로컬 스토리지에서 토큰 가져오기
const getTokenFromStorage = () => {
  // 로컬 스토리지에서 먼저 확인
  let token = localStorage.getItem('accessToken')

  // 로컬 스토리지에 없으면 세션 스토리지에서 확인
  if (!token) {
    token = sessionStorage.getItem('accessToken')
  }

  return token
}

// 사용자 정보 가져오기
const getUserInfo = async () => {
  const token = getTokenFromStorage()
  
  if (!token) {
    router.push('/login?redirect=/chat-socket')
    return null
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/profile/`, {
      method: 'GET',
      headers,
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('사용자 정보를 가져오는 데 실패했습니다.')
    }
    
    const userData = await response.json()
    userInfo.value = userData
    return userData
  } catch (error) {
    logger.error(CONTEXT, '사용자 정보 조회 오류:', error)
    handleError(error, `${CONTEXT}.getUserInfo`)
    return null
  }
}

// 임신 정보 확인하기
const checkPregnancyInfo = async () => {
  const token = getTokenFromStorage()
  
  if (!token) return false
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/pregnancy-info/`, {
      method: 'GET',
      headers,
      credentials: 'include'
    })
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    return data && data.length > 0
  } catch (error) {
    logger.error(CONTEXT, '임신 정보 조회 오류:', error)
    handleError(error, `${CONTEXT}.checkPregnancyInfo`)
    return false
  }
}

// 대화 선택하기
const selectConversation = async (conversationId) => {
  try {
    await chatService.getConversation(conversationId)
    scrollToBottom()
  } catch (error) {
    errorMessage.value = '대화를 불러오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '대화 선택 오류:', error)
    handleError(error, `${CONTEXT}.selectConversation`)
  }
}

// 새 대화 생성하기
const createNewConversation = async () => {
  try {
    showNewChatDialog.value = false
    const newConversation = await chatService.createConversation(userInfo.value.id)
    if (newConversation) {
      await selectConversation(newConversation.id)
    }
  } catch (error) {
    errorMessage.value = '새 대화를 생성하는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '대화 생성 오류:', error)
    handleError(error, `${CONTEXT}.createNewConversation`)
  }
}

// 메시지 입력 시 타이핑 상태 업데이트
const updateTypingStatus = () => {
  if (!chatService.selectedConversation.value) return
  
  const now = Date.now()
  lastTypingTime.value = now
  
  // 마지막 타이핑 이벤트로부터 3초가 지났으면 타이핑 이벤트 발송
  if (!isSubmitting.value) {
    chatService.handleTyping(chatService.selectedConversation.value.id)
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

// 키보드 이벤트 핸들러
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    const inputText = userInput.value.trim()
    if (inputText) {
      setTimeout(() => {
        handleSendMessage()
      }, 10)
    }
  }
}

// 스크롤을 맨 아래로 이동
const scrollToBottom = () => {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }, 50)
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
    // 사용자 정보 가져오기
    const user = await getUserInfo()
    if (!user) {
      router.push('/login?redirect=/chat-socket')
      return
    }
    
    // 임신 정보 확인
    const hasPregnancyInfo = await checkPregnancyInfo()
    if (!hasPregnancyInfo) {
      alert('임신 정보를 먼저 등록해주세요.')
      router.push('/profile')
      return
    }
    
    // 소켓 연결
    const token = getTokenFromStorage()
    connectSocket(token)
    
    // 소켓 연결 상태 확인
    if (!isSocketConnected.value) {
      // 소켓 연결까지 대기
      await new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (isSocketConnected.value) {
            clearInterval(checkConnection)
            resolve()
          }
        }, 100)
      })
    }
    
    // 채팅 서비스 초기화
    chatService.initChatService(user.id)
    
    // 대화 목록 가져오기
    await chatService.getConversations(user.id)
    
    // 대화가 있는 경우 첫 번째 대화 선택
    if (chatService.conversations.value.length > 0) {
      await selectConversation(chatService.conversations.value[0].id)
    }
  } catch (error) {
    errorMessage.value = '초기화 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '컴포넌트 마운트 오류:', error)
    handleError(error, `${CONTEXT}.onMounted`)
  }
})

// 컴포넌트 언마운트 시 실행
onUnmounted(() => {
  // 선택된 대화가 있으면 해당 대화방 나가기
  if (chatService.selectedConversation.value) {
    chatService.cleanupChat(chatService.selectedConversation.value.id)
  }
  
  // 채팅 서비스 정리
  chatService.destroyChatService()
})

// userInput 변경 감시
watch(userInput, () => {
  if (userInput.value.trim()) {
    updateTypingStatus()
  }
})

// 대화 ID 변경 감시 (다른 대화 선택 시)
watch(() => chatService.selectedConversation.value?.id, (newId, oldId) => {
  if (oldId && newId !== oldId) {
    // 이전 대화방 나가기
    chatService.cleanupChat(oldId)
  }
  
  if (newId) {
    // 새 대화방 스크롤 처리
    scrollToBottom()
  }
})
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- 헤더 -->
    <div class="flex items-center justify-between p-3 sm:p-4 bg-white border-b border-gray-200">
      <div class="flex items-center space-x-2 sm:space-x-3">
        <button
          @click="showNewChatDialog = true"
          class="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
        >
          <svg-icon
            type="mdi"
            :path="mdiPlus"
            :size="24"
            class="text-gray-600"
          ></svg-icon>
        </button>
        <h1 class="text-lg sm:text-xl font-bold text-gray-900">채팅</h1>
      </div>
    </div>

    <!-- 채팅 컨테이너 -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4"
    >
      <!-- 메시지 목록 -->
      <div
        v-for="message in chatService.selectedConversation?.messages || []"
        :key="message.id"
        class="flex"
        :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] sm:max-w-[70%] rounded-lg p-3 sm:p-4"
          :class="message.sender === 'user' ? 'bg-point-yellow text-dark-gray' : 'bg-white text-gray-900'"
        >
          <div class="text-sm sm:text-base whitespace-pre-wrap">{{ message.content }}</div>
          <div class="text-xs text-gray-500 mt-1">{{ message.created_at }}</div>
        </div>
      </div>

      <!-- 타이핑 중 표시 -->
      <div
        v-if="chatService.isTyping"
        class="flex justify-start"
      >
        <div class="bg-white rounded-lg p-3 sm:p-4">
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 입력 영역 -->
    <div class="p-3 sm:p-4 bg-white border-t border-gray-200">
      <div class="flex items-center space-x-2 sm:space-x-3">
        <textarea
          v-model="userInput"
          @keydown="handleKeyDown"
          @input="updateTypingStatus"
          placeholder="메시지를 입력하세요..."
          class="flex-1 p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow resize-none"
          rows="1"
        ></textarea>
        <button
          @click="handleSendMessage"
          :disabled="isSubmitting || !userInput.trim()"
          class="p-2.5 sm:p-3 text-point-yellow hover:text-yellow-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <svg-icon
            type="mdi"
            :path="sendIconPath"
            :size="24"
          ></svg-icon>
        </button>
      </div>
    </div>

    <!-- 새 대화 다이얼로그 -->
    <div
      v-if="showNewChatDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div class="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full">
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4">새 대화 시작하기</h2>
        <p class="text-sm sm:text-base text-gray-600 mb-6">
          새로운 대화를 시작하시겠습니까?
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showNewChatDialog = false"
            class="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-700 hover:text-gray-900"
          >
            취소
          </button>
          <button
            @click="createNewConversation"
            class="px-4 sm:px-6 py-2 bg-point-yellow text-sm sm:text-base text-dark-gray font-bold rounded-md hover:bg-yellow-400"
          >
            시작하기
          </button>
        </div>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div
      v-if="errorMessage"
      class="fixed bottom-20 left-0 right-0 mx-auto w-full max-w-md p-3 sm:p-4 bg-red-100 text-red-700 rounded-lg shadow-lg"
    >
      {{ errorMessage }}
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar />
  </div>
</template>

<style scoped>
.bg-point-yellow {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}

/* iOS에서 자동 확대 방지 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  input, textarea {
    font-size: 16px;
  }
}

/* 스크롤바 스타일링 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #CBD5E0 #EDF2F7;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #EDF2F7;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #CBD5E0;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #A0AEC0;
}
</style>