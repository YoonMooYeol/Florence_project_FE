<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const CONTEXT = 'Feedback'

// 마크다운 텍스트에서 번호 형식을 처리하는 함수
const processMarkdownNumbering = (text) => {
  if (!text) return ''

  // 먼저 줄바꿈 처리 (한 줄 바꿈을 두 줄 바꿈으로 변환하여 마크다운 단락으로 만듦)
  let processed = text.replace(/\n(?!\n)/g, '\n\n')

  // 불릿 포인트 처리 (•, * 등으로 시작하는 항목)
  processed = processed.replace(/^[•*]\s*/gm, '- ')

  // 숫자 목록 처리 (숫자. 으로 시작하는 항목)
  // 숫자와 점을 완전히 제거하고 내용만 유지
  processed = processed.replace(/^\d+\.\s*/gm, '')

  // 굵은 텍스트 유지
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '**$1**')

  return processed
}

// 마크다운을 HTML로 변환하는 함수
const renderMarkdown = (text) => {
  if (!text) return ''
  try {
    // 마크다운을 HTML로 변환하고 보안을 위해 DOMPurify로 정화
    const rawHtml = marked.parse(text)
    return DOMPurify.sanitize(rawHtml)
  } catch (error) {
    logger.error(CONTEXT, '마크다운 변환 오류:', error)
    return text // 오류 발생 시 원본 텍스트 반환
  }
}

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
const route = useRoute()
const router = useRouter()

// 상태 관리
const conversationId = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const isAuthenticated = ref(false)
const feedback = ref(null)
const conversation = ref(null)

// 대화 및 피드백 불러오기
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

    if (route.params.conversationId) {
      conversationId.value = route.params.conversationId
      await loadConversationWithFeedback()
    } else {
      errorMessage.value = '대화 ID가 유효하지 않습니다.'
      logger.error(CONTEXT, '대화 ID가 없습니다.')
    }
  } catch (error) {
    handleError(error, CONTEXT)
  }
})

// 대화 및 피드백 불러오기
const loadConversationWithFeedback = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // conversationId가 유효한지 확인
    if (!conversationId.value) {
      throw new Error('대화 ID가 유효하지 않습니다.')
    }

    logger.info(CONTEXT, '대화 및 피드백 불러오기:', conversationId.value)
    const response = await apiClient.get(`/healthcare/conversations/${conversationId.value}/`)

    conversation.value = response.data

    if (response.data.has_feedback && response.data.feedback) {
      feedback.value = response.data.feedback

      // 감정 분석, 건강 팁, 의료 정보에서 마크다운 형식 전처리
      if (feedback.value.emotional_analysis) {
        // 감정 분석에서 번호 목록이 있다면 처리
        feedback.value.emotional_analysis = processMarkdownNumbering(feedback.value.emotional_analysis)
      }

      if (feedback.value.health_tips) {
        // 건강 팁이 배열이면 각 항목을 처리
        if (Array.isArray(feedback.value.health_tips)) {
          feedback.value.health_tips = feedback.value.health_tips.map(tip => processMarkdownNumbering(tip))
        } else if (typeof feedback.value.health_tips === 'string') {
          feedback.value.health_tips = processMarkdownNumbering(feedback.value.health_tips)
        }
      }

      if (feedback.value.medical_info) {
        // 의료 정보가 배열이면 각 항목을 처리
        if (Array.isArray(feedback.value.medical_info)) {
          feedback.value.medical_info = feedback.value.medical_info.map(info => processMarkdownNumbering(info))
        } else if (typeof feedback.value.medical_info === 'string') {
          feedback.value.medical_info = processMarkdownNumbering(feedback.value.medical_info)
        }
      }

      logger.info(CONTEXT, '피드백 데이터 로드 완료')
    } else {
      errorMessage.value = '피드백 데이터가 없습니다.'
      logger.warn(CONTEXT, '피드백 데이터가 없습니다.')
    }
  } catch (error) {
    errorMessage.value = '피드백을 불러오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '피드백 불러오기 오류:', error)
    handleError(error, `${CONTEXT}.loadConversationWithFeedback`)

    // 인증 오류인 경우 로그인 페이지로 리다이렉트
    if (error.response && error.response.status === 401) {
      logger.warn(CONTEXT, '인증이 필요합니다. 로그인 페이지로 이동합니다.')
      router.push('/login')
    }
  } finally {
    isLoading.value = false
  }
}

// 채팅 페이지로 돌아가기
const goBackToChat = () => {
  router.push('/chat')
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between">
      <button
        class="text-dark-gray"
        @click="goBackToChat"
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
      <h1 class="text-xl font-bold text-center text-dark-gray">
        상담 피드백
      </h1>
      <div class="w-6" /> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 에러 메시지 -->
    <div
      v-if="errorMessage"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2"
    >
      <p>{{ errorMessage }}</p>
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center p-4"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-point-yellow" />
    </div>

    <!-- 피드백 내용 -->
    <div
      v-if="feedback && !isLoading"
      class="flex-1 p-4 overflow-y-auto"
    >
      <!-- 건강 팁 섹션 -->
      <div class="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 class="text-lg font-semibold text-dark-gray mb-2 border-b pb-2 border-gray-200">
          건강 팁
        </h2>
        <div class="text-gray-700">
          <template v-if="typeof feedback.health_tips === 'string'">
            <!-- 마크다운 형식으로 표시 -->
            <div class="health-tips-list">
              <!-- 문자열을 줄 단위로 분리하고 각 줄을 별도 항목으로 처리 -->
              <div
                v-for="(line, index) in feedback.health_tips.split('\n').filter(line => line.trim())"
                :key="index"
                class="health-tip-item"
              >
                <div class="tip-number">{{ index + 1 }}</div>
                <div class="tip-content markdown-content" v-html="renderMarkdown(processMarkdownNumbering(line))"></div>
              </div>
            </div>
          </template>
          <template v-else-if="Array.isArray(feedback.health_tips) && feedback.health_tips.length > 0">
            <div class="health-tips-list">
              <div
                v-for="(tip, index) in feedback.health_tips"
                :key="index"
                class="health-tip-item"
              >
                <div class="tip-number">{{ index + 1 }}</div>
                <div class="tip-content markdown-content" v-html="renderMarkdown(processMarkdownNumbering(tip))"></div>
              </div>
            </div>
          </template>
          <template v-else>
            <p>건강 팁 정보를 찾을 수 없습니다.</p>
          </template>
        </div>
      </div>

      <!-- 의료 정보 섹션 -->
      <div class="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 class="text-lg font-semibold text-dark-gray mb-2 border-b pb-2 border-gray-200">
          의료 정보
        </h2>
        <div class="text-gray-700">
          <template v-if="feedback.medical_info">
            <!-- 의료 정보가 객체인 경우 (tips와 sources가 있는 경우) -->
            <template v-if="typeof feedback.medical_info === 'object' && feedback.medical_info !== null && !Array.isArray(feedback.medical_info)">
              <!-- 팁 정보 표시 -->
              <div v-if="Array.isArray(feedback.medical_info.tips) && feedback.medical_info.tips.length > 0">
                <h3 class="font-semibold text-dark-gray mt-2 mb-3">건강 및 의료 팁</h3>
                <div class="health-tips-list">
                  <div
                    v-for="(tip, index) in feedback.medical_info.tips"
                    :key="'tip-' + index"
                    class="health-tip-item"
                  >
                    <div class="tip-number">{{ index + 1 }}</div>
                    <div class="tip-content markdown-content" v-html="renderMarkdown(processMarkdownNumbering(tip))"></div>
                  </div>
                </div>
              </div>

              <!-- 출처 정보 표시 -->
              <div v-if="Array.isArray(feedback.medical_info.sources) && feedback.medical_info.sources.length > 0" class="mt-4">
                <h3 class="font-semibold text-dark-gray mt-2 mb-2">참고 자료</h3>
                <ul class="list-disc pl-5">
                  <li
                    v-for="(source, index) in feedback.medical_info.sources"
                    :key="'source-' + index"
                    class="mb-1"
                  >
                    <div class="markdown-content" v-html="renderMarkdown(processMarkdownNumbering(source))"></div>
                  </li>
                </ul>
              </div>
            </template>

            <!-- 의료 정보가 배열인 경우 (기존 코드) -->
            <template v-else-if="Array.isArray(feedback.medical_info) && feedback.medical_info.length > 0">
              <div class="health-tips-list">
                <div
                  v-for="(info, index) in feedback.medical_info"
                  :key="index"
                  class="health-tip-item"
                >
                  <div class="tip-number">{{ index + 1 }}</div>
                  <div class="tip-content markdown-content" v-html="renderMarkdown(processMarkdownNumbering(info))"></div>
                </div>
              </div>
            </template>
            <template v-else>
              <p>관련 의료 정보를 찾을 수 없습니다. 궁금한 점이 있으시면 의료 전문가와 상담하세요.</p>
            </template>
          </template>
          <template v-else>
            <p>관련 의료 정보를 찾을 수 없습니다. 궁금한 점이 있으시면 의료 전문가와 상담하세요.</p>
          </template>
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

/* 건강 팁 리스트 스타일 */
.health-tips-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 12px 0;
}

.health-tip-item {
  display: flex;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.health-tip-item:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.tip-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  background-color: #FFD600;
  color: #353535;
  font-weight: bold;
  font-size: 16px;
  padding: 12px 8px;
}

.tip-content {
  flex: 1;
  padding: 12px 16px;
}

.tip-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* 마크다운 스타일 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(h1) {
  font-size: 1.5rem;
}

.markdown-content :deep(h2) {
  font-size: 1.25rem;
}

.markdown-content :deep(h3) {
  font-size: 1.125rem;
}

.markdown-content :deep(p) {
  margin-bottom: 0.75rem;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
}

.markdown-content :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(a) {
  color: #3498db;
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #FFD600;
  padding-left: 1rem;
  margin-left: 0;
  color: #555;
  font-style: italic;
}

.markdown-content :deep(code) {
  background-color: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #eee;
  margin: 1.5rem 0;
}
</style>
