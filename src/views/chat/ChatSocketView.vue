<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import socket, { connectSocket, isConnected } from '@/utils/socket'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import * as chatService from '@/services/chatService'

const CONTEXT = 'ChatSocketView'

// 라우터 및 기본 상태 설정
const router = useRouter()
const userInfo = ref(null)
const userInput = ref('')
const chatContainer = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')
const showNewChatDialog = ref(false)
const lastTypingTime = ref(0)
const typingTimerLength = 3000 // 타이핑 타이머 길이(ms)
const lastSubmitTime = ref(0)
const debounceTime = 1000 // 1초 디바운스

// 컴퓨티드 프로퍼티
const isSocketConnected = computed(() => isConnected.value)
const hasUnreadMessages = computed(() => {
  return Object.values(chatService.unreadMessages.value).some(count => count > 0)
})

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
    
    const response = await fetch('http://127.0.0.1:8000/v1/users/profile/', {
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
    
    const response = await fetch('http://127.0.0.1:8000/v1/users/pregnancy-info/', {
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
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between fixed top-0 left-0 right-0 z-20">
      <h1 class="text-xl font-bold text-dark-gray">
        실시간 대화
      </h1>
      <div class="flex items-center">
        <!-- 소켓 연결 상태 표시 -->
        <div
          :class="[
            'w-3 h-3 rounded-full mr-3',
            isSocketConnected ? 'bg-green-500' : 'bg-red-500'
          ]"
          :title="isSocketConnected ? '연결됨' : '연결 끊김'"
        />
        
        <!-- 새 대화 버튼 -->
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
      v-if="chatService.isLoading.value"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50"
    >
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4" />
    </div>

    <!-- 메인 컨텐츠 영역 -->
    <div class="flex flex-1 mt-16 mb-16">
      <!-- 대화 목록 - 데스크탑 -->
      <div class="w-1/3 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
        <div class="p-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-dark-gray">
              대화 목록
            </h2>
            <button
              class="p-1 rounded-full bg-point-yellow hover:bg-yellow-400 focus:outline-none"
              @click="createNewConversation"
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
              v-for="conversation in chatService.conversations.value"
              :key="conversation.id"
              class="p-3 rounded-lg cursor-pointer relative"
              :class="chatService.selectedConversation.value?.id === conversation.id ? 'bg-base-yellow' : 'bg-gray-100 hover:bg-gray-200'"
              @click="selectConversation(conversation.id)"
            >
              <div class="font-medium text-dark-gray truncate">
                {{ conversation.name || '대화 ' + conversation.id.slice(0, 8) }}
              </div>
              <div class="text-xs text-gray-500 mt-1 flex items-center">
                <span>{{ new Date(conversation.updated_at).toLocaleDateString() }}</span>
                
                <!-- 타이핑 표시 -->
                <span
                  v-if="chatService.typingUsers.value[conversation.id]"
                  class="ml-2 text-gray-600 italic"
                >
                  입력 중...
                </span>
                
                <!-- 읽지 않은 메시지 수 -->
                <span
                  v-if="chatService.unreadMessages.value[conversation.id]"
                  class="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {{ chatService.unreadMessages.value[conversation.id] }}
                </span>
              </div>
              
              <!-- 최근 대화 내용 미리보기 -->
              <div
                v-if="conversation.query"
                class="text-xs text-gray-600 mt-1 truncate"
              >
                {{ conversation.query }}
              </div>
            </div>
            
            <!-- 대화 없음 메시지 -->
            <div
              v-if="chatService.conversations.value.length === 0"
              class="p-4 text-center text-gray-500"
            >
              대화가 없습니다. 새 대화를 시작해보세요.
            </div>
          </div>
        </div>
      </div>

      <!-- 대화 내용 영역 -->
      <div class="flex-1 flex flex-col">
        <!-- 모바일 대화 선택기 -->
        <div class="bg-white p-2 border-b border-gray-200 md:hidden flex items-center">
          <select
            v-model="chatService.selectedConversation.value.id"
            class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @change="selectConversation($event.target.value)"
          >
            <option
              v-for="conversation in chatService.conversations.value"
              :key="conversation.id"
              :value="conversation.id"
            >
              {{ conversation.name || '대화 ' + conversation.id.slice(0, 8) }}
              {{ chatService.unreadMessages.value[conversation.id] ? `(${chatService.unreadMessages.value[conversation.id]})` : '' }}
            </option>
          </select>
          
          <button
            class="p-2 ml-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none"
            @click="createNewConversation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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

        <!-- 채팅 메시지 영역 -->
        <div
          v-if="chatService.selectedConversation.value"
          ref="chatContainer"
          class="flex-1 p-4 overflow-y-auto chat-messages pb-24"
        >
          <div class="flex flex-col space-y-4">
            <!-- 환영 메시지 -->
            <div v-if="!chatService.selectedConversation.value.messages || chatService.selectedConversation.value.messages.length === 0" class="flex justify-start">
              <div class="flex max-w-[80%]">
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
                <div>
                  <div class="bg-white p-3 rounded-lg shadow-sm whitespace-pre-wrap">
                    안녕하세요! 플로렌스 AI 상담사입니다. 임신 및 출산에 관한 질문이 있으시면 언제든지 물어보세요.
                  </div>
                  <div class="text-xs text-gray-500 mt-1 ml-1">
                    {{ getCurrentTime() }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 메시지 목록 -->
            <template v-for="(message, index) in chatService.selectedConversation.value.messages" :key="message.id">
              <!-- 날짜 구분선 (날짜가 바뀌는 경우) -->
              <div
                v-if="index === 0 || new Date(message.created_at).toDateString() !== new Date(chatService.selectedConversation.value.messages[index-1].created_at).toDateString()"
                class="flex justify-center my-4"
              >
                <div class="px-4 py-1 bg-gray-200 rounded-full text-xs text-gray-700">
                  {{ new Date(message.created_at).toLocaleDateString() }}
                </div>
              </div>
              
              <!-- 메시지 아이템 -->
              <div
                class="flex"
                :class="message.sender === 'user' || message.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <!-- AI 메시지 -->
                <div
                  v-if="message.sender === 'assistant' || message.role === 'assistant'"
                  class="flex max-w-[80%]"
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
                  <div>
                    <div
                      class="bg-white p-3 rounded-lg shadow-sm whitespace-pre-wrap"
                      :class="{
                        'typing-message': message.isTyping
                      }"
                    >
                      {{ message.content || message.response }}
                      <span
                        v-if="message.isTyping"
                        class="typing-indicator"
                      >
                        <span class="typing-dot" />
                        <span class="typing-dot" />
                        <span class="typing-dot" />
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 ml-1 flex items-center">
                      <span>{{ typeof message.created_at === 'string' ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : message.created_at }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 사용자 메시지 -->
                <div
                  v-else-if="message.sender === 'user' || message.role === 'user'"
                  class="flex flex-col items-end max-w-[80%]"
                >
                  <div 
                    class="bg-base-yellow p-3 rounded-lg shadow-sm whitespace-pre-wrap"
                    :class="{ 'opacity-70': message.isPending }"
                  >
                    {{ message.content || message.query }}
                    <span
                      v-if="message.isPending"
                      class="ml-2 inline-block"
                    >
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1 mr-1 flex items-center">
                    <span>{{ typeof message.created_at === 'string' ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : message.created_at }}</span>
                    
                    <!-- 읽음 표시 -->
                    <svg
                      v-if="message.isRead"
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 ml-1 text-blue-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- 타이핑 상태 표시 -->
            <div
              v-if="chatService.typingUsers.value[chatService.selectedConversation.value?.id]"
              class="flex justify-start"
            >
              <div class="flex max-w-[80%]">
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
                <div>
                  <div class="bg-gray-100 p-3 rounded-lg shadow-sm whitespace-pre-wrap">
                    <span class="typing-indicator">
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 대화 선택 안내 (대화가 선택되지 않은 경우) -->
        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center p-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p class="text-gray-600 text-center mb-4">
            대화를 선택하거나 새 대화를 시작하세요.
          </p>
          <button
            class="px-4 py-2 bg-point-yellow text-dark-gray rounded-md hover:bg-yellow-400 focus:outline-none"
            @click="createNewConversation"
          >
            새 대화 시작하기
          </button>
        </div>

        <!-- 메시지 입력 영역 -->
        <div
          v-if="chatService.selectedConversation.value"
          class="bg-white p-3 border-t border-gray-200 fixed bottom-16 left-0 right-0 z-10"
        >
          <div class="flex items-center">
            <textarea
              v-model="userInput"
              placeholder="메시지를 입력하세요"
              class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-point-yellow resize-none"
              rows="1"
              @keydown="handleKeyDown"
            />
            <button
              class="p-2 ml-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSubmitting || !userInput.trim()"
              @click="handleSendMessage"
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

    <!-- 새 대화 생성 다이얼로그 -->
    <div
      v-if="showNewChatDialog"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h3 class="text-lg font-bold text-dark-gray mb-4">
          새 대화 생성
        </h3>
        <p class="mb-6 text-gray-600">
          새 대화를 시작하시겠습니까? 새로운 대화에서는 이전 대화 내용이 포함되지 않습니다.
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
            @click="createNewConversation"
          >
            생성
          </button>
        </div>
      </div>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="chat" />
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

.chat-messages {
  height: calc(100vh - 170px); /* 헤더 높이 고려하여 조정 */
  padding-bottom: 120px; /* 하단 입력창 가려지지 않도록 패딩 증가 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 스크롤 개선 */
  scroll-behavior: smooth; /* 부드러운 스크롤 효과 */
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
    height: calc(100vh - 160px);
    padding-bottom: 120px; /* 모바일에서도 충분한 하단 패딩 */
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