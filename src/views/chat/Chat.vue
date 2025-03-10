<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'

const CONTEXT = 'Chat'

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
    return true
  }
  return false
}

// 라우터 및 라우트 설정
const router = useRouter()

// 상태 관리
const messages = ref([])
const userAnswer = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const isAuthenticated = ref(false)
const retryCount = ref(0)
const maxRetries = 3
const lastSubmitTime = ref(0)
const debounceTime = 1000 // 1초 디바운스
const chatContainer = ref(null) // 채팅 컨테이너 ref 추가
const userId = ref(null) // 사용자 ID 저장
const hasPregnancyInfo = ref(false) // 임신 정보 유무
const babyName = ref('') // 태명
const pregnancyWeek = ref(0) // 임신 주차
const currentSearchQuery = ref('') // 현재 검색 쿼리 표시

// 시작 시 초기화
onMounted(async () => {
  try {
    // 로컬 스토리지에서 토큰 가져오기
    isAuthenticated.value = getTokenFromStorage()

    // 인증이 필요하지만 토큰이 없는 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated.value) {
      logger.warn(CONTEXT, '인증 토큰이 없습니다. 로그인 페이지로 이동합니다.')
      router.push('/login')
      return
    }

    // 사용자 정보 가져오기
    await getUserInfo()
    
    // 사용자 ID가 없으면 로그인 페이지로 리다이렉트
    if (!userId.value) {
      logger.warn(CONTEXT, '사용자 정보를 가져오지 못했습니다. 로그인 페이지로 이동합니다.')
      router.push('/login')
      return
    }
    
    // 임신 정보 가져오기
    await getPregnancyInfo()
    
    // 임신 정보가 없으면 사용자 정보 페이지로 리다이렉트
    if (!hasPregnancyInfo.value) {
      logger.warn(CONTEXT, '임신 정보가 없습니다. 사용자 정보 페이지로 이동합니다.')
      router.push('/profile')
      return
    }
    
    // 환영 메시지 추가
    messages.value.push({
      id: Date.now(),
      sender: 'bot',
      content: `안녕하세요! 하트비트 AI입니다. ${babyName.value || '태아'}는 현재 ${pregnancyWeek.value}주차네요. 임신과 출산에 관한 궁금한 점을 물어보세요. 일상적인 질문도 답변해 드립니다.`,
      time: getCurrentTime()
    })

    // 메시지가 추가되면 스크롤을 맨 아래로 이동
    scrollToBottom()
  } catch (error) {
    handleError(error, CONTEXT)
  }
})

// 사용자 정보 가져오기
const getUserInfo = async () => {
  try {
    // 올바른 API 엔드포인트로 수정
    const response = await apiClient.get('/v1/accounts/users/me/')
    userId.value = response.data.user_id
    logger.info(CONTEXT, '사용자 정보 로드 완료:', userId.value)
  } catch (error) {
    logger.error(CONTEXT, '사용자 정보 로드 실패:', error)
    if (error.response && error.response.status === 401) {
      router.push('/login')
    }
  }
}

// 임신 정보 가져오기
const getPregnancyInfo = async () => {
  try {
    const response = await apiClient.get('/v1/accounts/pregnancies/')
    // 임신 정보가 하나 이상 있는지 확인
    if (response.data && response.data.length > 0) {
      hasPregnancyInfo.value = true
      // 첫 번째 임신 정보 사용
      const pregnancy = response.data[0]
      babyName.value = pregnancy.baby_name || ''
      pregnancyWeek.value = pregnancy.current_week || 0
      logger.info(CONTEXT, '임신 정보 로드 완료:', {
        babyName: babyName.value,
        week: pregnancyWeek.value
      })
    } else {
      hasPregnancyInfo.value = false
    }
  } catch (error) {
    logger.error(CONTEXT, '임신 정보 로드 실패:', error)
    hasPregnancyInfo.value = false
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

// 답변 제출
const submitAnswer = async () => {
  // 빈 답변이거나 이미 제출 중이거나 디바운스 시간 내에 있으면 무시
  if (!userAnswer.value.trim() || isSubmitting.value || isDebounced()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  currentSearchQuery.value = '' // 검색 쿼리 초기화
  const currentAnswer = userAnswer.value.trim()
  retryCount.value = 0

  // 입력 필드 초기화 (API 호출 전에 초기화하여 중복 제출 방지)
  userAnswer.value = ''

  // 입력 필드에 포커스 유지
  setTimeout(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.focus()
    }
  }, 50)

  try {
    // 사용자 ID 확인
    if (!userId.value) {
      throw new Error('사용자 ID가 없습니다.')
    }

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: currentAnswer,
      time: getCurrentTime()
    }
    messages.value.push(userMessage)

    // 메시지가 추가되면 즉시 스크롤을 맨 아래로 이동
    scrollToBottom()

    // 로딩 메시지 추가
    const loadingMessageId = Date.now() + 1
    messages.value.push({
      id: loadingMessageId,
      sender: 'bot',
      isLoading: true,
      isTyping: true,
      time: getCurrentTime()
    })
    scrollToBottom()

    // 새 LLM 에이전트 API 호출 - 태명과 임신 주차 정보 추가
    logger.info(CONTEXT, 'LLM 에이전트 API 호출')
    const response = await apiClient.post('/v1/llm/agent/', {
      user_id: userId.value,
      query_text: currentAnswer,
      baby_name: babyName.value || '태아',
      pregnancy_week: pregnancyWeek.value || 0
    })
    logger.info(CONTEXT, 'LLM 에이전트 응답:', response.data)

    // 검색 쿼리 정보 저장 (응답에 포함되어 있다면)
    if (response.data.search_queries && response.data.search_queries.length > 0) {
      currentSearchQuery.value = response.data.search_queries[0]
    }

    // 로딩 메시지 제거
    messages.value = messages.value.filter(msg => msg.id !== loadingMessageId)

    // 봇 응답 메시지 추가
    messages.value.push({
      id: Date.now() + 2,
      sender: 'bot',
      content: response.data.response,
      time: getCurrentTime()
    })

    // 스크롤 처리
    scrollToBottom()
  } catch (error) {
    // 로딩 메시지 제거
    messages.value = messages.value.filter(msg => msg.isLoading)

    errorMessage.value = '답변을 생성하는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, 'LLM 에이전트 API 오류:', error)
    handleError(error, `${CONTEXT}.submitAnswer`)

    // 서버 오류(500)인 경우 재시도 로직 실행
    if (error.response && error.response.status === 500 && retryCount.value < maxRetries) {
      retryCount.value++
      errorMessage.value = `서버 오류가 발생했습니다. 자동으로 재시도합니다. (${retryCount.value}/${maxRetries})`
      logger.warn(CONTEXT, `LLM 에이전트 호출 재시도 중 (${retryCount.value}/${maxRetries})`)
      // 1초 후 재시도
      setTimeout(() => {
        submitAnswerRetry(currentAnswer)
      }, 1000)
      return
    }

    // 인증 오류인 경우 로그인 페이지로 리다이렉트
    if (error.response && error.response.status === 401) {
      logger.warn(CONTEXT, '인증이 필요합니다. 로그인 페이지로 이동합니다.')
      router.push('/login')
    }
  } finally {
    isSubmitting.value = false
    // 최종적으로 한번 더 스크롤 처리
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }
}

// 답변 제출 재시도 (메시지 추가 없이)
const submitAnswerRetry = async (answer) => {
  try {
    logger.info(CONTEXT, 'LLM 에이전트 API 재시도')
    const response = await apiClient.post('/v1/llm/agent/', {
      user_id: userId.value,
      query_text: answer,
      baby_name: babyName.value || '태아',
      pregnancy_week: pregnancyWeek.value || 0
    })
    logger.info(CONTEXT, 'LLM 에이전트 API 재시도 응답:', response.data)

    errorMessage.value = ''

    // 검색 쿼리 정보 저장 (응답에 포함되어 있다면)
    if (response.data.search_queries && response.data.search_queries.length > 0) {
      currentSearchQuery.value = response.data.search_queries[0]
    }

    // 봇 응답 메시지 추가
    messages.value.push({
      id: Date.now(),
      sender: 'bot',
      content: response.data.response,
      time: getCurrentTime()
    })

    // 스크롤 처리
    scrollToBottom()
  } catch (error) {
    errorMessage.value = '답변을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.'
    logger.error(CONTEXT, 'LLM 에이전트 API 재시도 오류:', error)
    handleError(error, `${CONTEXT}.submitAnswerRetry`)
  } finally {
    isSubmitting.value = false
  }
}

// 현재 시간 포맷팅
const getCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 스크롤을 맨 아래로 이동
const scrollToBottom = () => {
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    } else {
      // 폴백: ref가 없는 경우 querySelector 사용
      const container = document.querySelector('.chat-messages')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, 50) // 스크롤 타이밍을 늘려 DOM 업데이트 후 스크롤이 적용되도록 함
}

// 메시지 전송 함수 (엔터키 처리)
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    // 입력값을 별도 변수에 저장하여 처리
    const inputText = userAnswer.value.trim()
    if (inputText) {
      // 입력 필드 초기화를 지연시켜 한글 입력 문제 해결
      setTimeout(() => {
        submitAnswer()
      }, 10)
    }
  }
}

// 메시지 변경 감시 및 스크롤 처리
const watchMessages = () => {
  // messages 배열이 변경될 때마다 스크롤을 맨 아래로 이동
  if (messages.value.length > 0) {
    scrollToBottom()
  }
}

// 메시지 배열 변경 감시
watch(messages, watchMessages, { deep: true })

// 메시지 전송 버튼 클릭 핸들러 (명시적으로 분리)
const handleSendClick = () => {
  const inputText = userAnswer.value.trim()
  if (inputText && !isSubmitting.value) {
    // 입력 필드 초기화를 지연시켜 한글 입력 문제 해결
    setTimeout(() => {
      submitAnswer()
    }, 10)
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-center fixed top-0 left-0 right-0 z-20">
      <h1 class="text-xl font-bold text-center text-dark-gray">
        AI 상담사 - 검색 기능
      </h1>
    </div>

    <!-- 에러 메시지 -->
    <div
      v-if="errorMessage"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 mt-14"
    >
      <p>{{ errorMessage }}</p>
    </div>

    <!-- 대화 메시지 영역 -->
    <div
      ref="chatContainer"
      class="flex-1 p-4 overflow-y-auto chat-messages pb-24 mt-14"
    >
      <div class="flex flex-col space-y-4">
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"
        >
          <!-- 봇 메시지 -->
          <div
            v-if="message.sender === 'bot'"
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
                  'loading-message': message.isLoading,
                  'typing-message': message.isTyping
                }"
              >
                {{ message.content }}
                <span
                  v-if="message.isLoading && !message.isTyping"
                  class="loading-dots"
                >
                  <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                </span>
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
                {{ message.time }}
              </div>
            </div>
          </div>
          <!-- 사용자 메시지 -->
          <div
            v-else
            class="flex flex-col items-end max-w-[80%]"
          >
            <div class="bg-base-yellow p-3 rounded-lg shadow-sm whitespace-pre-wrap">
              {{ message.content }}
            </div>
            <div class="text-xs text-gray-500 mt-1 mr-1">
              {{ message.time }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 전체 화면 오버레이 (답변 생성 중 표시) -->
    <div
      v-if="isSubmitting"
      class="fixed inset-0 bg-gray-800 bg-opacity-70 flex flex-col items-center justify-center z-50"
    >
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4" />
      <p class="text-white text-xl font-semibold">
        답변을 생성 중입니다...
      </p>
      
      <!-- 검색 쿼리 표시 -->
      <div class="text-white text-center max-w-md px-4 mt-3">
        <p v-if="currentSearchQuery" class="text mb-2">
          <span class="font-medium">검색 중:</span> "{{ currentSearchQuery }}"
        </p>
        <p v-else class="text-sm mb-2">
          정보를 찾는 중입니다...
        </p>
      </div>
      
      <p class="text-white text-sm mt-4">
        사용자 질문을 분석하고 신뢰할 수 있는 정보를 찾고 있습니다
      </p>
    </div>

    <!-- 메시지 입력 영역 -->
    <div class="bg-white p-3 border-t border-gray-200 fixed bottom-16 left-0 right-0 z-10">
      <div class="flex items-center">
        <textarea
          v-model="userAnswer"
          placeholder="임신과 출산에 관한 질문을 입력하세요"
          class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-point-yellow resize-none"
          rows="1"
          @keydown="handleKeyDown"
        />
        <button
          class="p-2 ml-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting || !userAnswer.trim()"
          @click="handleSendClick"
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
  margin-top: 50px; /* 헤더 높이만큼 여백 축소 */
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
    margin-top: 50px; /* 모바일에서 헤더 높이 조정 */
    padding-bottom: 120px; /* 모바일에서도 충분한 하단 패딩 */
  }
}

/* 로딩 메시지 스타일 */
.loading-message {
  background-color: #f8f9fa !important;
  border-left: 3px solid #FFD600;
}

/* 로딩 애니메이션 */
.loading-dots {
  display: inline-block;
}

.dot {
  animation: wave 1.3s linear infinite;
  display: inline-block;
}

.dot:nth-child(2) {
  animation-delay: -1.1s;
}

.dot:nth-child(3) {
  animation-delay: -0.9s;
}

@keyframes wave {
  0%, 60%, 100% {
    transform: initial;
    opacity: 0.6;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
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

/* 진행 막대 애니메이션 */
@keyframes pulse-width {
  0% {
    width: 20%;
    opacity: 0.6;
  }
  50% {
    width: 100%;
    opacity: 1;
  }
  100% {
    width: 20%;
    opacity: 0.6;
  }
}

.animate-pulse-width {
  animation: pulse-width 2s ease-in-out infinite;
}
</style>
