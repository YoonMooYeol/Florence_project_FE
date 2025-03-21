<script setup>
import { ref, onMounted, computed, watch, nextTick, onUpdated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'

const CONTEXT = 'LlmChat'

// 백엔드 서버 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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
const chatSummary = ref(null) // 채팅방 요약 정보
const showSummary = ref(false) // 요약 보기 모달 표시 여부

// 스크롤 위치 감지
const isUserScrolling = ref(false)
const lastScrollTop = ref(0)

// 스크롤 이벤트 핸들러
const handleScroll = (event) => {
  // 현재 스크롤 위치
  const currentScrollTop = event.target.scrollTop

  // 스크롤 방향 (위로/아래로)
  const isScrollingDown = currentScrollTop > lastScrollTop.value

  // 스크롤이 거의 맨 아래에 도달했는지 확인
  const isNearBottom =
    currentScrollTop + event.target.clientHeight >=
    event.target.scrollHeight - 50

  // 스크롤이 거의 맨 아래거나 아래로 스크롤 중이면 사용자 스크롤 플래그 해제
  if (isNearBottom || isScrollingDown) {
    isUserScrolling.value = false
  } else {
    // 위로 스크롤하는 경우 사용자 스크롤 플래그 설정
    isUserScrolling.value = true
  }

  // 마지막 스크롤 위치 저장
  lastScrollTop.value = currentScrollTop
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
    return token
  }
  return null
}

// 사용자 정보 가져오기
const getUserInfo = async () => {
  try {
    // 사용자 기본 정보 조회
    const userResponse = await apiClient.get('/accounts/users/me/')

    // 임신 정보 조회
    const pregnancyResponse = await apiClient.get('/accounts/pregnancies/')

    // 임신 주차 정보와 태명 추출
    let pregnancyWeek = 0
    let babyName = '아기'
    if (pregnancyResponse.data && pregnancyResponse.data.length > 0) {
      pregnancyWeek = pregnancyResponse.data[0].current_week || 0
      babyName = pregnancyResponse.data[0].baby_name || '아기'
    }

    // 통합된 사용자 정보 저장
    userInfo.value = {
      ...userResponse.data,
      pregnancy_week: pregnancyWeek,
      baby_name: babyName
    }

    return userInfo.value
  } catch (error) {
    logger.error(CONTEXT, '사용자 정보 조회 오류:', error)
    handleError(error, `${CONTEXT}.getUserInfo`)
    return null
  }
}

// 임신 정보 확인하기
const checkPregnancyInfo = async () => {
  try {
    const response = await apiClient.get('/accounts/pregnancies/')
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

    const response = await apiClient.get(`/llm/chat/rooms/?user_id=${userId}`)
    chatRooms.value = response.data

    // 오늘 생성된 채팅방이 있는지 확인
    const today = new Date().toISOString().split('T')[0]
    const todayChatRoom = chatRooms.value.find(room => {
      const roomDate = new Date(room.created_at).toISOString().split('T')[0]
      return roomDate === today
    })

    // 이미 선택된 채팅방이 있는지 확인
    const hasChatSelected = selectedChatId.value &&
      chatRooms.value.some(room => room.chat_id === selectedChatId.value)

    if (hasChatSelected) {
      // 이미 채팅방이 선택되어 있으면 유지
      await loadChatRoom(selectedChatId.value, false) // 메시지 로드만 하고 UI 깜빡임 방지
    } else if (todayChatRoom) {
      // 오늘 생성된 채팅방이 있으면 해당 채팅방 선택
      selectedChatId.value = todayChatRoom.chat_id
      await loadChatRoom(selectedChatId.value)
    } else if (chatRooms.value.length > 0) {
      // 오늘 생성된 채팅방은 없지만 다른 채팅방이 있는 경우, 새 채팅방 생성 필요
      await createChatRoom()
    } else {
      // 채팅방이 전혀 없는 경우 새 채팅방 생성
      await createChatRoom()
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

    // 오늘 생성된 채팅방이 있는지 확인
    const today = new Date().toISOString().split('T')[0]
    const todayChatRoom = chatRooms.value.find(room => {
      const roomDate = new Date(room.created_at).toISOString().split('T')[0]
      return roomDate === today
    })

    // 오늘 이미 채팅방이 생성되었으면 해당 채팅방 사용
    if (todayChatRoom) {
      selectedChatId.value = todayChatRoom.chat_id
      await loadChatRoom(selectedChatId.value)
      return
    }

    // 임신 정보의 첫 번째 항목 ID 사용
    const pregnancyInfo = await apiClient.get('/accounts/pregnancies/')
    const pregnancyId = pregnancyInfo.data && pregnancyInfo.data.length > 0
      ? pregnancyInfo.data[0].pregnancy_id
      : null

    if (!userId || !pregnancyId) {
      throw new Error('사용자 정보 또는 임신 정보가 없습니다')
    }

    const response = await apiClient.post('/llm/chat/rooms/', {
      user_id: userId,
      pregnancy_id: pregnancyId
    })

    // 새로 생성된 채팅방을 목록에 추가
    chatRooms.value.unshift(response.data)

    // 새 채팅방 선택
    selectedChatId.value = response.data.chat_id
    await loadChatRoom(selectedChatId.value)

    // 임신 주차 가져오기
    const pregnancyWeek = userInfo.value?.pregnancy_week || 0
    const babyName = userInfo.value?.baby_name || '아기'
    const weekText = pregnancyWeek > 0 ? `현재 임신 ${pregnancyWeek}주차에 관한 정보를 제공해 드릴 수 있습니다.` : ''
    const babyText = babyName !== '아기' ? `${babyName}(이)와 ` : ''

    // 환영 메시지 추가
    messages.value = [{
      id: Date.now(),
      role: 'assistant',
      content: `안녕하세요! 플로렌스 임신정보 어시스턴트입니다. ${weekText} ${babyText}함께하는 임신 및 출산에 관한 질문이 있으시면 언제든지 물어보세요. RAG 기반 검색과 웹 검색을 활용하여 정확한 정보를 제공해 드립니다.`,
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

// 채팅방 상세 조회 (forceReset 옵션 추가)
const loadChatRoom = async (chatId, forceReset = true) => {
  if (forceReset) {
    isLoading.value = true
  }
  errorMessage.value = ''

  try {
    const response = await apiClient.get(`/llm/chat/rooms/${chatId}/?include_messages=true`)
    currentChat.value = response.data

    // forceReset가 true인 경우에만 메시지 목록을 초기화
    if (forceReset) {
      messages.value = []
    } else if (messages.value.length > 0) {
      // 이미 메시지가 있는 경우 새 메시지만 추가하기 위해 기존 ID 목록 생성
      const existingMsgIds = messages.value
        .filter(m => m.id.includes('-'))
        .map(m => m.id.split('-')[0])

      // 기존 메시지가 아닌 경우에만 새 메시지로 처리
      if (response.data.all_messages && response.data.all_messages.length > 0) {
        let hasNewMessages = false

        response.data.all_messages.forEach(msg => {
          if (!existingMsgIds.includes(String(msg.id))) {
            hasNewMessages = true

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
          }
        })

        // 새 메시지가 있으면 스크롤
        if (hasNewMessages) {
          // 채팅 목록 UI 업데이트 후 스크롤
          setTimeout(() => {
            scrollToBottom()
          }, 100)
        }

        // 여기서 함수 종료 (메시지가 있는 경우)
        return
      }
    }

    // 기존 메시지가 없거나 forceReset이 true인 경우 모든 메시지 로드
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
      // 임신 주차 가져오기
      const pregnancyWeek = userInfo.value?.pregnancy_week || 0
      const babyName = userInfo.value?.baby_name || '아기'
      const weekText = pregnancyWeek > 0 ? `현재 임신 ${pregnancyWeek}주차에 관한 정보를 제공해 드릴 수 있습니다.` : ''
      const babyText = babyName !== '아기' ? `${babyName}(이)와 ` : ''

      // 채팅방에 메시지가 없으면 환영 메시지 추가
      messages.value = [{
        id: Date.now(),
        role: 'assistant',
        content: `안녕하세요! 플로렌스 임신정보 어시스턴트입니다. ${weekText} ${babyText}함께하는 임신 및 출산에 관한 질문이 있으시면 언제든지 물어보세요. RAG 기반 검색과 웹 검색을 활용하여 정확한 정보를 제공해 드립니다.`,
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
    if (forceReset) {
      isLoading.value = false
    }
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

    // 고유 메시지 ID 생성
    const messageId = Date.now()

    // 사용자 메시지 추가
    const userMessageObj = {
      id: `user-${messageId}`,
      role: 'user',
      content: userMessage,
      created_at: getCurrentTime()
    }
    messages.value.push(userMessageObj)

    // 스크롤 아래로 - 강제 스크롤 사용
    forceScrollToBottom()

    // 응답 대기 메시지 추가
    const waitingId = `waiting-${messageId}`
    messages.value.push({
      id: waitingId,
      role: 'assistant',
      content: '',
      isTyping: true,
      created_at: getCurrentTime()
    })

    // 스크롤 아래로 - 강제 스크롤 사용
    forceScrollToBottom()

    // 임신 정보 가져오기
    const userId = userInfo.value?.user_id
    const pregnancyInfo = userInfo.value?.pregnancy_week || 0
    const babyName = userInfo.value?.baby_name || '아기'

    // Florence 에이전트 API 호출 (서버에서 자동으로 메시지 저장됨)
    const response = await apiClient.post('/llm/florence/', {
      user_id: userId,
      query_text: userMessage,
      pregnancy_week: pregnancyInfo,
      baby_name: babyName,
      thread_id: selectedChatId.value // 채팅방 ID를 thread_id로 전달
    })

    // 응답 대기 메시지 제거
    messages.value = messages.value.filter(m => m.id !== waitingId)

    // AI 응답 추가
    messages.value.push({
      id: `florence-${messageId}`,
      role: 'assistant',
      content: response.data.response,
      created_at: getCurrentTime()
    })

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
    return
  }

  nextTick(() => {
    if (chatContainer.value) {
      // 약간의 지연 후 스크롤 적용 (DOM 업데이트 완료 보장)
      setTimeout(() => {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight + 1000
      }, 50)
    }
  })
}

// 메시지 전송 후 무조건 스크롤
const forceScrollToBottom = () => {
  // 사용자 스크롤 상태 무시하고 강제로 스크롤
  isUserScrolling.value = false

  nextTick(() => {
    if (chatContainer.value) {
      // 더 긴 지연 시간으로 스크롤 적용
      setTimeout(() => {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight + 1000
      }, 100)
    }
  })
}

// 메시지 배열 변경 감시
watch(messages, () => {
  // 메시지가 변경되면 스크롤 맨 아래로
  scrollToBottom()

  // 메시지가 추가되면 시간차를 두고 한 번 더 스크롤 (애니메이션 등 완료 후)
  if (messages.value.length > 0) {
    setTimeout(() => {
      scrollToBottom()
    }, 300)
  }
}, { deep: true })

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

// 채팅방 자동 갱신 인터벌
let chatRefreshInterval = null

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

    // 창 크기 변경 이벤트 처리
    window.addEventListener('resize', scrollToBottom)

    // 초기 로딩 후 스크롤 처리
    setTimeout(() => {
      scrollToBottom()
    }, 500)

    // 30초마다 현재 채팅방 내용 갱신 (optional)
    chatRefreshInterval = setInterval(async () => {
      if (selectedChatId.value) {
        try {
          const currentMessages = messages.value.length
          const response = await apiClient.get(`/llm/chat/rooms/${selectedChatId.value}/?include_messages=true`)

          // 새 메시지가 있는지 확인
          if (response.data.all_messages &&
              response.data.all_messages.length > currentMessages / 2) { // 사용자+응답 메시지 각각 카운트되므로 2로 나눔
            // 저장된 메시지 ID 목록 생성
            const existingMsgIds = messages.value
              .filter(m => m.id.includes('-'))
              .map(m => m.id.split('-')[0])

            // 새 메시지만 추가
            response.data.all_messages.forEach(msg => {
              if (!existingMsgIds.includes(String(msg.id))) {
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
              }
            })

            // 새 메시지가 추가되었으면 스크롤
            if (messages.value.length > currentMessages) {
              forceScrollToBottom()
            }
          }
        } catch (error) {
          console.warn('채팅방 자동 갱신 중 오류 (무시됨):', error)
        }
      }
    }, 30000) // 30초마다 갱신
  } catch (error) {
    errorMessage.value = '데이터를 불러오는 중 오류가 발생했습니다.'
    logger.error(CONTEXT, '초기화 오류:', error)
    handleError(error, `${CONTEXT}.onMounted`)
  }
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  window.removeEventListener('resize', scrollToBottom)

  // 자동 갱신 인터벌 정리
  if (chatRefreshInterval) {
    clearInterval(chatRefreshInterval)
    chatRefreshInterval = null
  }
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

// 요약 모달 닫기
const closeSummary = () => {
  showSummary.value = false
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- 채팅방 목록 사이드바 (데스크톱) -->
    <div
      class="hidden sm:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-200 overflow-y-auto"
    >
      <div class="p-4 border-b border-gray-200">
        <button
          class="w-full px-4 py-2 bg-point-yellow text-dark-gray rounded-xl hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow"
          @click="createChatRoom"
        >
          새 채팅
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="room in chatRooms"
          :key="room.chat_id"
          class="p-3 cursor-pointer hover:bg-gray-50"
          :class="{ 'bg-gray-100': selectedChatId === room.chat_id }"
          @click="selectChatRoom(room.chat_id)"
        >
          <div class="text-sm font-medium text-gray-900 truncate">
            {{ formatDate(room.created_at) }}
          </div>
          <div class="text-xs text-gray-500 mt-1 truncate">
            {{ room.last_message || '새로운 대화를 시작하세요' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 메인 채팅 영역 -->
    <div class="flex-1 sm:ml-64">
      <!-- 모바일 헤더 -->
      <div class="sm:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button
          class="p-2 hover:bg-gray-100 rounded-lg"
          @click="showChatList = true"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="text-lg font-semibold text-gray-900">
          {{ formatDate(currentChat?.created_at) }}
        </div>
        <button
          class="p-2 hover:bg-gray-100 rounded-lg"
          @click="showSummary = true"
        >
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <!-- 채팅 메시지 영역 -->
      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4 pb-20 sm:pb-24"
        @scroll="handleScroll"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          :class="[
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              'max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 break-words',
              message.role === 'user'
                ? 'bg-base-yellow text-dark-gray'
                : 'bg-white shadow-sm border border-gray-200'
            ]"
          >
            <div class="prose max-w-none text-sm sm:text-base">
              {{ message.content }}
            </div>
            <div
              :class="[
                'text-[10px] mt-1',
                message.role === 'user' ? 'text-right text-gray-600' : 'text-left text-gray-500'
              ]"
            >
              {{ message.created_at }}
            </div>
          </div>
        </div>
      </div>

      <!-- 입력 영역 -->
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe sm:left-64">
        <div class="max-w-screen-md mx-auto flex space-x-2">
          <textarea
            v-model="userInput"
            class="flex-1 resize-none rounded-xl border border-gray-300 p-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-point-yellow"
            :rows="1"
            placeholder="메시지를 입력하세요..."
            @keydown.enter.prevent="handleEnterKey"
          />
          <button
            class="px-4 py-2 bg-point-yellow text-dark-gray rounded-xl hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow disabled:bg-gray-300 disabled:cursor-not-allowed"
            :disabled="!userInput.trim() || isSubmitting"
            @click="sendMessage"
          >
            전송
          </button>
        </div>
      </div>
    </div>

    <!-- 모바일 채팅방 목록 사이드바 -->
    <div
      v-if="showChatList"
      class="fixed inset-0 z-50 sm:hidden"
    >
      <div
        class="absolute inset-0 bg-black bg-opacity-50"
        @click="showChatList = false"
      />
      <div class="absolute inset-y-0 left-0 w-3/4 max-w-sm bg-white">
        <div class="p-4 border-b border-gray-200">
          <button
            class="w-full px-4 py-2 bg-point-yellow text-dark-gray rounded-xl hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @click="createChatRoom"
          >
            새 채팅
          </button>
        </div>
        <div class="overflow-y-auto h-full">
          <div
            v-for="room in chatRooms"
            :key="room.chat_id"
            class="p-3 cursor-pointer hover:bg-gray-50"
            :class="{ 'bg-gray-100': selectedChatId === room.chat_id }"
            @click="selectChatRoomMobile(room.chat_id)"
          >
            <div class="text-sm font-medium text-gray-900 truncate">
              {{ formatDate(room.created_at) }}
            </div>
            <div class="text-xs text-gray-500 mt-1 truncate">
              {{ room.last_message || '새로운 대화를 시작하세요' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 채팅 요약 모달 -->
    <div
      v-if="showSummary"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        @click="showSummary = false"
      />
      <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h3 class="text-lg font-semibold text-dark-gray mb-4">
          대화 요약
        </h3>
        <div class="prose max-w-none text-sm sm:text-base">
          {{ chatSummary || '아직 요약이 없습니다.' }}
        </div>
        <button
          class="mt-4 w-full px-4 py-2 bg-base-yellow text-dark-gray rounded-xl hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow"
          @click="showSummary = false"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 스크롤바 스타일링 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  textarea {
    font-size: 16px; /* iOS에서 자동 확대 방지 */
  }

  .prose {
    font-size: 14px;
  }

  /* 아이폰 하단 safe area 대응 */
  .pb-safe {
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
  }
}

/* 마크다운 스타일링 */
.prose {
  line-height: 1.6;
}

.prose p {
  margin-bottom: 0.5em;
}

.prose p:last-child {
  margin-bottom: 0;
}

.prose ul,
.prose ol {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 1.5em;
}

.prose li {
  margin-bottom: 0.25em;
}

.prose a {
  color: #2563eb;
  text-decoration: underline;
}

.prose code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-size: 0.9em;
}

.prose pre {
  background-color: #f3f4f6;
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
  margin: 0.5em 0;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
</style>
