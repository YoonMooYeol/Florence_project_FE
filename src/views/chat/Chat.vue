<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiBabyFaceOutline } from '@mdi/js'

const CONTEXT = 'Chat'
const path = mdiBabyFaceOutline

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
      content: `안녕하세요. AI에이전트 플로렌스입니다. 나이팅게일의 풀네임은 플로렌스 나이팅게일이라고 하네요. 그 분의 정신을 닮아 성심성의껏 도움을 드리겠습니다.  ${babyName.value || '아이'}는 현재 ${pregnancyWeek.value}주차이군요! 임신과 출산에 관한 궁금한 점을 물어보세요!`,
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

// 상태 선언
const isStreaming = ref(false)        // 스트리밍 진행 중인지 표시
const streamedBotContent = ref('')    // 스트리밍 중간 누적(봇 응답)

// SSE 요청 함수
async function submitStreamAnswer() {
  // 1) 요청 전 체크
  if (!userAnswer.value.trim() || isSubmitting.value) {
    return
  }
  // 디바운스 etc. 필요하다면 isDebounced() 호출

  isSubmitting.value = true
  isStreaming.value = true
  errorMessage.value = ''
  currentSearchQuery.value = ''
  streamedBotContent.value = ''

  // 사용자의 입력값
  const currentAnswer = userAnswer.value.trim()
  userAnswer.value = '' // 입력창 비우기
  setTimeout(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) textarea.focus()
  }, 50)

  // 2) 사용자 메시지를 먼저 messages에 추가
  const userMessage = {
    id: Date.now(),
    sender: 'user',
    content: currentAnswer,
    time: getCurrentTime()
  }
  messages.value.push(userMessage)
  scrollToBottom()

  // 로딩(typing) 표시용 메시지 추가
  const loadingMessageId = Date.now() + 1
  messages.value.push({
    id: loadingMessageId,
    sender: 'bot',
    content: '',
    isLoading: true,
    isTyping: true,
    time: getCurrentTime()
  })
  scrollToBottom()

  try {
    // 3) SSE로 백엔드 호출 (fetch + ReadableStream)
    const response = await fetch(`${API_BASE_URL}/v1/llm/agent/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 필요하다면 인증 토큰:
        // 'Authorization': `Bearer ${토큰}`
      },
      body: JSON.stringify({
        user_id: userId.value,
        query_text: currentAnswer,
        baby_name: babyName.value || '태아',
        pregnancy_week: pregnancyWeek.value || 0
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 4) 스트리밍 응답(body) 처리
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    const done = false
    let accumulatedText = '' // 최종 답변 누적

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      if (doneReading) {
        break
      }

      // chunk -> 문자열 변환
      const chunk = decoder.decode(value, { stream: true })
      // SSE 라인은 일반적으로 "data: {...}\n\n" 형태
      const lines = chunk.split('\n')

      for (let line of lines) {
        line = line.trim()
        if (!line.startsWith('data: ')) continue

        const jsonStr = line.substring('data: '.length)
        if (!jsonStr) continue
        // json 파싱
        let payload
        try {
          payload = JSON.parse(jsonStr)
        } catch (err) {
          console.warn('JSON parse error:', err, jsonStr)
          continue
        }

        // 에러 필드가 있다면 표시
        if (payload.error) {
          console.error('SSE Error:', payload.error)
          errorMessage.value = payload.error
          continue
        }

        // delta(토큰)가 있으면 누적
        if (payload.delta && payload.complete === false) {
          accumulatedText += payload.delta
          updateBotMessage(loadingMessageId, accumulatedText)
          await nextTick()
          scrollToBottom()
        }
        // 완결된 응답
        if (payload.complete) {
          if (payload.response) {
            accumulatedText = payload.response
            updateBotMessage(loadingMessageId, accumulatedText)
            await nextTick()
            scrollToBottom()
          }
        }
      }
    }
  } catch (error) {
    console.error('submitStreamAnswer error:', error)
    errorMessage.value = '스트리밍 도중 오류가 발생했습니다.'
  } finally {
    // 로딩/타이핑 해제
    isSubmitting.value = false
    isStreaming.value = false

    // 해당 로딩메시지를 찾아서 isLoading/isTyping 해제
    const botMsg = messages.value.find(m => m.id === loadingMessageId)
    if (botMsg) {
      botMsg.isLoading = false
      botMsg.isTyping = false
    }

    scrollToBottom()
  }
}

// 스트리밍 중간에 봇 메시지(content)를 업데이트
function updateBotMessage(msgId, newContent) {
  const botMsg = messages.value.find(m => m.id === msgId)
  if (botMsg) {
    botMsg.content = newContent
    // 메시지 업데이트 후 스크롤을 아래로 내림
    scrollToBottom()
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
        submitStreamAnswer()
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
      submitStreamAnswer()
    }, 10)
  }
}

// 마크다운을 HTML로 안전하게 변환하는 함수
const parseMarkdown = (text) => {
  if (!text) return ''
  try {
    // marked 옵션 설정을 통해 취소선 기능 비활성화
    const options = {
      breaks: true, // 줄바꿈 허용
      gfm: true // GitHub Flavored Markdown 활성화
    }

    // ~ 문자 이스케이프 처리
    const processedText = text.replace(/~/g, '\\~')

    // 마크다운을 HTML로 변환한 후 XSS 공격 방지를 위해 정화
    const parsed = marked(processedText, options)
    return DOMPurify.sanitize(parsed)
  } catch (error) {
    logger.error(CONTEXT, '마크다운 파싱 오류:', error)
    return text // 오류 발생 시 원본 텍스트 반환
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-center fixed top-0 left-0 right-0 z-20">
      <h1 class="text-xl font-bold text-center text-dark-gray">
        플로렌스
      </h1>
    </div>

    <!-- 에러 메시지 -->
    <!-- <div
      v-if="errorMessage"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 mt-14"
    >
      <p>{{ errorMessage }}</p>
    </div> -->

    <!-- 대화 메시지 영역 -->
    <div
      ref="chatContainer"
      class="flex-1 p-4 overflow-y-auto chat-messages pb-24 mt-16"
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
            class="flex flex-col max-w-[80%] mt-5"
          >
            <div class="w-10 h-10 flex items-center justify-start mb-1">
              <svg-icon
                type="mdi"
                :path="path"
                :size="40"
                :fill="'#353535'"
              />
            </div>
            <div>
              <div
                class="bg-white p-3 rounded-lg shadow-sm markdown-content"
                :class="{
                  'loading-message': message.isLoading,
                  'typing-message': message.isTyping
                }"
              >
                <!-- 마크다운 렌더링 -->
                <div
                  v-if="!message.isLoading"
                  v-html="parseMarkdown(message.content)"
                />
                <!-- 로딩 표시는 기존대로 유지 -->
                <template v-else>
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
                </template>
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

/* 마크다운 콘텐츠 스타일 */
:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

:deep(.markdown-content h2) {
  font-size: 1.3rem;
  font-weight: 600;
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
}

:deep(.markdown-content h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.6rem;
  margin-bottom: 0.3rem;
}

:deep(.markdown-content p) {
  margin-bottom: 0.75rem;
}

:deep(.markdown-content ul, .markdown-content ol) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.markdown-content li) {
  margin-bottom: 0.25rem;
}

:deep(.markdown-content pre) {
  background-color: #f8f9fa;
  padding: 0.75rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

:deep(.markdown-content code) {
  font-family: monospace;
  background-color: #f8f9fa;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

:deep(.markdown-content blockquote) {
  border-left: 4px solid #e2e8f0;
  padding-left: 1rem;
  color: #4a5568;
  font-style: italic;
  margin-bottom: 0.75rem;
}

:deep(.markdown-content a) {
  color: #3182ce;
  text-decoration: underline;
}

:deep(.markdown-content table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

:deep(.markdown-content th, .markdown-content td) {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
}

:deep(.markdown-content img) {
  max-width: 100%;
  height: auto;
}
</style>
