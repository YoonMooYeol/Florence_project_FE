<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiBabyFaceOutline, mdiMenu } from '@mdi/js'
import api from '@/utils/axios'

const CONTEXT = 'Chat'
const path = mdiBabyFaceOutline
const menuIcon = mdiMenu

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

// 채팅방 관련 상태
const todayChatRoom = ref(null) // 오늘 채팅방
const chatRooms = ref([]) // 모든 채팅방 목록
const isMenuOpen = ref(false) // 햄버거 메뉴 상태
const selectedChatRoomId = ref(null) // 현재 선택된 채팅방 ID

// 하루의 시작은 자정(0시)부터 그날 저녁 11시 59분 59초까지
const getTodayKey = () => {
  const now = new Date()
  // 자정(0시)부터 저녁 11시 59분 59초까지를 하루로 간주
  return now.toISOString().split('T')[0]
}

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

    // 채팅방 목록 가져오기
    await getChatRooms()

    // 오늘 채팅방 확인 및 생성
    await checkTodayChatRoom()

    // 메시지가 없을 경우만 환영 메시지 추가
    if (messages.value.length === 0) {
      messages.value.push({
        id: Date.now(),
        sender: 'bot',
        content: `안녕하세요. AI에이전트 플로렌스입니다. 나이팅게일의 풀네임은 플로렌스 나이팅게일이라고 하네요. 그 분의 정신을 닮아 성심성의껏 도움을 드리겠습니다.  ${babyName.value || '아이'}는 현재 ${pregnancyWeek.value}주차이군요! 임신과 출산에 관한 궁금한 점을 물어보세요!`,
        parsedContent: parseMarkdown(`안녕하세요. AI에이전트 플로렌스입니다. 나이팅게일의 풀네임은 플로렌스 나이팅게일이라고 하네요. 그 분의 정신을 닮아 성심성의껏 도움을 드리겠습니다.  ${babyName.value || '아이'}는 현재 ${pregnancyWeek.value}주차이군요! 임신과 출산에 관한 궁금한 점을 물어보세요!`),
        time: getCurrentTime()
      })
      // 환영 메시지도 로컬 스토리지에 저장
      saveMessagesToLocalStorage()
    }

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
    const response = await apiClient.get('/accounts/users/me/')
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
    const response = await apiClient.get('/accounts/pregnancies/')
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

// 채팅방 목록 가져오기
const getChatRooms = async () => {
  try {
    // 올바른 API 엔드포인트 사용
    const response = await apiClient.get(`/llm/chat/rooms/?user_id=${userId.value}`)
    if (response.data && Array.isArray(response.data)) {
      // 생성일 기준 내림차순 정렬 (최신순)
      chatRooms.value = response.data.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })
      logger.info(CONTEXT, '채팅방 목록 로드 완료:', chatRooms.value.length)
    }
  } catch (error) {
    logger.error(CONTEXT, '채팅방 목록 로드 실패:', error)
  }
}

// 오늘 채팅방 확인 및 생성
const checkTodayChatRoom = async () => {
  // 현재 날짜의 키 가져오기 (새벽 3시 기준)
  const todayKey = getTodayKey()
  const today = new Date(todayKey + 'T00:00:00')
  logger.info(CONTEXT, `현재 날짜 키: ${todayKey}`)
  
  // 오늘 날짜로 생성된 채팅방이 있는지 확인
  let todayRoom = null
  
  for (const room of chatRooms.value) {
    const roomDate = new Date(room.created_at)
    
    // 날짜 비교를 위해 시간을 제외한 날짜만 비교 (YYYY-MM-DD 형식)
    const roomDateStr = roomDate.toISOString().split('T')[0]
    
    if (roomDateStr === todayKey) {
      logger.info(CONTEXT, `오늘(${todayKey})의 채팅방 찾음: ${room.chat_id}, 생성일: ${roomDateStr}`)
      todayRoom = room
      break
    }
  }
  
  if (todayRoom) {
    // 오늘 채팅방이 있으면 선택
    logger.info(CONTEXT, `오늘의 채팅방 선택: ${todayRoom.chat_id}`)
    todayChatRoom.value = todayRoom
    selectedChatRoomId.value = todayRoom.chat_id
    
    // 채팅방 메시지 로딩
    loadMessagesFromLocalStorage()
  } else {
    // 오늘 채팅방이 없으면 생성
    logger.info(CONTEXT, '오늘의 채팅방이 없어 새로 생성합니다.')
    await createChatRoom()
  }
}

// 로컬 스토리지에 메시지 저장
const saveMessagesToLocalStorage = () => {
  if (selectedChatRoomId.value) {
    const storageKey = `chat_messages_${selectedChatRoomId.value}`
    localStorage.setItem(storageKey, JSON.stringify(messages.value))
    logger.info(CONTEXT, `메시지 로컬 저장 완료: ${storageKey}, 메시지 수: ${messages.value.length}`)
  }
}

// 로컬 스토리지에서 메시지 불러오기
const loadMessagesFromLocalStorage = () => {
  if (!selectedChatRoomId.value) {
    logger.warn(CONTEXT, '선택된 채팅방 ID가 없어 메시지를 로드할 수 없습니다.')
    messages.value = []
    return
  }
  
  const storageKey = `chat_messages_${selectedChatRoomId.value}`
  const savedMessagesJson = localStorage.getItem(storageKey)
  
  if (savedMessagesJson) {
    try {
      const savedMessages = JSON.parse(savedMessagesJson)
      if (Array.isArray(savedMessages) && savedMessages.length > 0) {
        // 메시지를 id 기준으로 정렬 (id는 타임스탬프 기반이므로 시간순)
        messages.value = savedMessages.sort((a, b) => a.id - b.id)
        logger.info(CONTEXT, `메시지 로컬 로드 완료: ${selectedChatRoomId.value}, 메시지 수: ${messages.value.length}`)
      } else {
        logger.info(CONTEXT, `채팅방 ${selectedChatRoomId.value}에 저장된 메시지가 없거나 비어 있습니다.`)
        messages.value = []
      }
    } catch (error) {
      logger.error(CONTEXT, `메시지 로드 중 오류 발생: ${error.message}`)
      messages.value = []
    }
  } else {
    logger.info(CONTEXT, `채팅방 ${selectedChatRoomId.value}에 저장된 메시지가 없습니다.`)
    messages.value = []
  }
}

// 새 채팅방 생성
const createChatRoom = async () => {
  try {
    // 이미 오늘의 채팅방이 있는지 다시 한번 확인
    const todayKey = getTodayKey()
    const today = new Date(todayKey + 'T00:00:00')
    
    let existingTodayRoom = null
    for (const room of chatRooms.value) {
      const roomDate = new Date(room.created_at)
      const roomDateStr = roomDate.toISOString().split('T')[0]
      
      if (roomDateStr === todayKey) {
        existingTodayRoom = room
        break
      }
    }
    
    // 이미 오늘의 채팅방이 있으면 그것을 사용
    if (existingTodayRoom) {
      logger.info(CONTEXT, `이미 오늘의 채팅방이 있습니다: ${existingTodayRoom.chat_id}`)
      todayChatRoom.value = existingTodayRoom
      selectedChatRoomId.value = existingTodayRoom.chat_id
      
      // 현재 선택된 채팅방이 있고 그게 오늘 채팅방이 아니면 메시지 저장
      if (selectedChatRoomId.value && selectedChatRoomId.value !== existingTodayRoom.chat_id && messages.value.length > 0) {
        saveMessagesToLocalStorage()
      }
      
      // 메시지 로드
      loadMessagesFromLocalStorage()
      return
    }
    
    // 현재 채팅방이 있고 메시지가 있으면 저장
    if (selectedChatRoomId.value && messages.value.length > 0) {
      saveMessagesToLocalStorage()
    }
    
    const formattedDate = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    // 올바른 API 엔드포인트 사용
    const response = await apiClient.post('/llm/chat/rooms/', {
      user_id: userId.value,
      topic: `${babyName.value || '아이'}와의 대화 (${formattedDate})`
    })
    
    if (response.data) {
      todayChatRoom.value = response.data
      selectedChatRoomId.value = response.data.chat_id
      
      // 새로 생성된 채팅방을 목록 최상단에 추가
      chatRooms.value.unshift(response.data)
      logger.info(CONTEXT, `새 채팅방 생성 완료: ${response.data.chat_id}`)
      
      // 새 채팅방이므로 메시지 초기화
      messages.value = []
    }
  } catch (error) {
    logger.error(CONTEXT, `채팅방 생성 실패: ${error.message}`)
  }
}

// 다른 채팅방 선택
const selectChatRoom = (chatRoomId) => {
  if (selectedChatRoomId.value === chatRoomId) {
    // 이미 선택된 채팅방이면 메뉴만 닫기
    isMenuOpen.value = false
    return
  }
  
  // 이전 채팅방의 메시지 저장
  if (selectedChatRoomId.value && messages.value.length > 0) {
    saveMessagesToLocalStorage()
  }
  
  // 새 채팅방 선택
  logger.info(CONTEXT, `채팅방 선택: ${chatRoomId}`)
  selectedChatRoomId.value = chatRoomId
  
  // 선택한 채팅방의 메시지 로드
  loadMessagesFromLocalStorage()
  
  // 메뉴 닫기
  isMenuOpen.value = false
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
  
  // 채팅방이 없으면 먼저 생성
  if (!selectedChatRoomId.value) {
    logger.warn(CONTEXT, '선택된 채팅방이 없어 새 채팅방을 생성합니다.')
    await createChatRoom()
  }

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
    parsedContent: parseMarkdown(currentAnswer), // 사용자 메시지도 마크다운 파싱 적용
    time: getCurrentTime()
  }
  messages.value.push(userMessage)
  scrollToBottom()

  // 로컬 스토리지에 메시지 저장
  saveMessagesToLocalStorage()

  // 로딩(typing) 표시용 메시지 추가
  const loadingMessageId = Date.now() + 1
  messages.value.push({
    id: loadingMessageId,
    sender: 'bot',
    content: '',
    parsedContent: '', // 마크다운 파싱된 HTML 저장 필드 추가
    isLoading: true,
    isTyping: true,
    isTypingComplete: false,
    time: getCurrentTime()
  })
  scrollToBottom()

  try {
    // 3) SSE로 백엔드 호출 (fetch + ReadableStream)
    const response = await fetch(`${API_BASE_URL}llm/agent/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({
        user_id: userId.value,
        query_text: currentAnswer,
        baby_name: babyName.value || '태아',
        pregnancy_week: pregnancyWeek.value || 0,
        chat_id: selectedChatRoomId.value // 선택된 채팅방 ID 전달 (thread_id에서 변경)
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
            
            // 메시지 완료 후 로컬 스토리지에 저장
            saveMessagesToLocalStorage()
            
            // 메시지 완료 처리
            const botMsg = messages.value.find(m => m.id === loadingMessageId)
            if (botMsg) {
              botMsg.isTypingComplete = true
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('submitStreamAnswer error:', error)
    errorMessage.value = '스트리밍 도중 오류가 발생했습니다.'
    
    // 에러 발생 시 로딩 메시지 제거 
    const errorIndex = messages.value.findIndex(m => m.id === loadingMessageId)
    if (errorIndex !== -1) {
      messages.value.splice(errorIndex, 1)
    }
    
    // 로컬 스토리지에 저장
    saveMessagesToLocalStorage()
  } finally {
    // 로딩/타이핑 해제
    isSubmitting.value = false
    isStreaming.value = false

    // 해당 로딩메시지를 찾아서 isLoading/isTyping 해제
    const botMsg = messages.value.find(m => m.id === loadingMessageId)
    if (botMsg) {
      botMsg.isLoading = false
      botMsg.isTyping = false
      botMsg.isTypingComplete = true
    }

    scrollToBottom()
  }
}

// 스트리밍 중간에 봇 메시지(content)를 업데이트
function updateBotMessage(msgId, newContent) {
  const botMsg = messages.value.find(m => m.id === msgId)
  if (botMsg) {
    botMsg.content = newContent
    
    // 실시간 마크다운 파싱 적용
    try {
      botMsg.parsedContent = parseMarkdown(newContent)
    } catch (error) {
      console.error('Markdown parsing error:', error)
      botMsg.parsedContent = newContent // 오류 시 원본 텍스트 사용
    }
    
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

// 채팅방 이름 포맷팅 (간단한 형태로 변경)
const formatChatRoomName = (room) => {
  // 날짜 포맷팅
  const date = new Date(room.created_at)
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric'
  })
  const formattedDate = formatter.format(date)
  
  // 주제가 있으면 주제 사용, 없으면 날짜만 표시
  if (room.topic) {
    // 주제에서 첫 10자만 가져오고 나머지는 '...'으로 표시
    const shortTopic = room.topic.length > 15 ? room.topic.substring(0, 15) + '...' : room.topic
    return shortTopic
  }
  
  // 기본 이름: 사용자 이름과 날짜 표시
  return `${room.user_name || '사용자'}님의 대화`
}

// 햄버거 메뉴 토글
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// 선택된 채팅방 ID가 변경될 때마다 메시지 로드
watch(selectedChatRoomId, () => {
  loadMessagesFromLocalStorage()
})

// 새 채팅 버튼 클릭 핸들러
const createNewChat = async () => {
  try {
    // 새 채팅방 생성
    await createChatRoom()
    
    // 메뉴 닫기
    isMenuOpen.value = false
    
    // 메시지 초기화 (환영 메시지 추가)
    if (messages.value.length === 0) {
      messages.value.push({
        id: Date.now(),
        sender: 'bot',
        content: `안녕하세요. AI에이전트 플로렌스입니다. 나이팅게일의 풀네임은 플로렌스 나이팅게일이라고 하네요. 그 분의 정신을 닮아 성심성의껏 도움을 드리겠습니다.  ${babyName.value || '아이'}는 현재 ${pregnancyWeek.value}주차이군요! 임신과 출산에 관한 궁금한 점을 물어보세요!`,
        parsedContent: parseMarkdown(`안녕하세요. AI에이전트 플로렌스입니다. 나이팅게일의 풀네임은 플로렌스 나이팅게일이라고 하네요. 그 분의 정신을 닮아 성심성의껏 도움을 드리겠습니다.  ${babyName.value || '아이'}는 현재 ${pregnancyWeek.value}주차이군요! 임신과 출산에 관한 궁금한 점을 물어보세요!`),
        time: getCurrentTime()
      })
      // 환영 메시지도 로컬 스토리지에 저장
      saveMessagesToLocalStorage()
    }
    
    // 스크롤을 맨 아래로 이동
    scrollToBottom()
  } catch (error) {
    logger.error(CONTEXT, `새 채팅방 생성 실패: ${error.message}`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 (햄버거 메뉴 추가) -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between fixed top-0 left-0 right-0 z-20">
      <button
        class="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
        @click="toggleMenu"
      >
        <svg-icon
          type="mdi"
          :path="menuIcon"
          :size="24"
          :fill="'#353535'"
        />
      </button>
      
      <h1 class="text-xl font-bold text-center text-dark-gray">
        플로렌스
      </h1>
      
      <!-- 빈 요소로 균형 맞추기 -->
      <div class="w-[24px]"></div>
    </div>

    <!-- 햄버거 메뉴 (슬라이드 사이드 바) -->
    <div
      v-if="isMenuOpen"
      class="fixed inset-0 z-30 flex"
      @click.self="isMenuOpen = false"
    >
      <!-- 오버레이 -->
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>
      
      <!-- 사이드바 - ChatGPT 스타일 -->
      <div class="relative w-4/5 max-w-[300px] bg-white h-full flex flex-col overflow-hidden shadow-xl animate-slide-in">
        <!-- 헤더 -->
        <div class="p-4 bg-point-yellow flex justify-between items-center">
          <h2 class="text-lg font-bold text-dark-gray">채팅 기록</h2>
          <button 
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-400 transition-colors"
            aria-label="메뉴 닫기"
            @click="isMenuOpen = false"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              class="h-6 w-6 text-dark-gray" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        

        
        <!-- 채팅방 목록 (스크롤 가능) -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-2 space-y-1">
            <!-- 채팅방이 있는 경우 -->
            <div v-if="chatRooms.length > 0">
              <button
                v-for="room in chatRooms"
                :key="room.chat_id"
                class="w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 transition-colors flex items-center"
                :class="{ 'bg-gray-100 font-bold': selectedChatRoomId === room.chat_id }"
                @click="selectChatRoom(room.chat_id)"
              >
                <!-- 채팅 아이콘 -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-3 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                
                <div class="flex-1 truncate">
                  <div class="text-dark-gray text-sm font-medium">{{ formatChatRoomName(room) }}</div>
                  <div class="text-xs text-gray-500">{{ new Date(room.created_at).toLocaleDateString() }}</div>
                </div>
              </button>
            </div>
            
            <!-- 채팅방이 없을 경우 메시지 -->
            <div
              v-else
              class="py-4 text-center text-gray-500"
            >
              채팅 기록이 없습니다.
            </div>
          </div>
        </div>
      </div>
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
      class="flex-2 p-4 overflow-y-auto chat-messages"
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
            <div class="flex items-end">
              <div
                class="bg-white p-3 rounded-lg shadow-sm markdown-content"
                :class="{
                  'loading-message': message.isLoading,
                  'typing-message': message.isTyping,
                  'typing-complete': message.isTypingComplete
                }"
              >
                <!-- 마크다운 렌더링 -->
                <div
                  v-if="!message.isLoading"
                  v-html="message.parsedContent || parseMarkdown(message.content)"
                />
                <!-- 로딩 표시는 기존대로 유지 -->
                <template v-else>
                  <!-- 타이핑 중인 경우에도 마크다운 렌더링 -->
                  <div v-if="message.isTyping && message.content" v-html="message.parsedContent || parseMarkdown(message.content)"></div>
                  <!-- 로딩만 있을 때 -->
                  <template v-else>
                    {{ message.content }}
                    <span
                      v-if="message.isLoading && !message.isTyping"
                      class="loading-dots"
                    >
                      <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                    </span>
                    <span
                      v-if="message.isTyping && !message.content"
                      class="typing-indicator"
                    >
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                      <span class="typing-dot" />
                    </span>
                  </template>
                </template>
              </div>
              <div class="text-xs text-gray-500 ml-1 mb-1">
                {{ message.time }}
              </div>
            </div>
          </div>
          <!-- 사용자 메시지 -->
          <div
            v-else
            class="flex flex-col items-end max-w-[80%]"
          >
            <div class="flex items-end">
              <div class="text-xs text-gray-500 mr-1 mb-1">
                {{ message.time }}
              </div>
              <div class="bg-base-yellow p-3 rounded-lg shadow-sm">
                <div v-html="message.parsedContent || parseMarkdown(message.content)"></div>
              </div>
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
  height: calc(100vh - 170px);
  padding-bottom: 80px; /* 하단 패딩 감소 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  margin-top: 50px;
}

textarea {
  max-height: 100px;
  min-height: 20px;
  -webkit-appearance: none; /* iOS 입력 필드 스타일 개선 */
  appearance: none;
  font-size: 16px; /* iOS에서 자동 확대 방지 */
}

/* 모바일 환경 최적화 */
@media (max-width: 768px) {
  .chat-messages {
    height: calc(100vh - 160px);
    margin-top: 40px;
    padding-bottom: 50px; /* 모바일에서도 하단 패딩 감소 */
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

/* 사이드바 애니메이션 */
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out forwards;
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

/* 사용자 메시지의 마크다운 스타일링 */
.bg-base-yellow :deep(a) {
  color: #0056b3;
  text-decoration: underline;
}

.bg-base-yellow :deep(code) {
  background-color: rgba(255, 255, 255, 0.5);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.bg-base-yellow :deep(pre) {
  background-color: rgba(255, 255, 255, 0.5);
  padding: 0.5rem;
  border-radius: 0.25rem;
  overflow-x: auto;
}

/* 타이핑 중인 메시지에 커서 효과 추가 */
.typing-message:not(.loading-message) :deep(p:last-child::after) {
  content: "";
  display: inline-block;
  width: 6px;
  height: 15px;
  background-color: #666;
  animation: cursor-blink 0.8s infinite;
  margin-left: 2px;
  vertical-align: middle;
}

/* 메시지가 완료되면 커서를 보이지 않게 함 */
.typing-message.typing-complete :deep(p:last-child::after) {
  display: none;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
