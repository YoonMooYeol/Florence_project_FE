import socket from '@/utils/socket'
import { ref, watch } from 'vue'
import * as logger from '@/utils/logger'

const CONTEXT = 'ChatService'

// 상태 관리
export const conversations = ref([])
export const selectedConversation = ref(null)
export const isLoading = ref(false)
export const error = ref(null)
export const typingUsers = ref({}) // 타이핑 중인 사용자
export const unreadMessages = ref({}) // 읽지 않은 메시지 수

// 초기화 함수
export const initChatService = (userId) => {
  if (!userId) {
    logger.warn(CONTEXT, '사용자 ID가 없습니다.')
    return
  }

  // 대화 목록 요청 이벤트 등록
  socket.emit('join_user_room', { userId })
  
  // 실시간 대화 목록 업데이트 이벤트 리스너
  socket.on('conversations_updated', (data) => {
    logger.info(CONTEXT, '대화 목록 업데이트:', data)
    conversations.value = data
  })
  
  // 새 메시지 이벤트 리스너
  socket.on('new_message', (message) => {
    logger.info(CONTEXT, '새 메시지 수신:', message)
    
    // 현재 선택된 대화가 있고, 해당 대화에 대한 메시지인 경우
    if (selectedConversation.value && message.conversationId === selectedConversation.value.id) {
      // 현재 대화의 메시지 배열에 추가
      selectedConversation.value.messages.push(message)
    } else {
      // 현재 보고 있지 않은 대화라면 읽지 않은 메시지 카운트 증가
      if (!unreadMessages.value[message.conversationId]) {
        unreadMessages.value[message.conversationId] = 0
      }
      unreadMessages.value[message.conversationId]++
    }
    
    // 대화 목록에서 해당 대화를 찾아 최신 메시지 업데이트
    const conversationIndex = conversations.value.findIndex(conv => conv.id === message.conversationId)
    if (conversationIndex !== -1) {
      conversations.value[conversationIndex].lastMessage = message
      
      // 대화 목록 재정렬 (최신 메시지가 있는 대화가 상단에 위치)
      const conversation = conversations.value.splice(conversationIndex, 1)[0]
      conversations.value.unshift(conversation)
    }
  })
  
  // 타이핑 상태 이벤트 리스너
  socket.on('typing', (data) => {
    typingUsers.value[data.conversationId] = data.username
    
    // 5초 후 타이핑 상태 제거 (타이머 사용)
    setTimeout(() => {
      if (typingUsers.value[data.conversationId] === data.username) {
        delete typingUsers.value[data.conversationId]
      }
    }, 3000)
  })
  
  // 타이핑 종료 이벤트 리스너
  socket.on('stop_typing', (data) => {
    if (typingUsers.value[data.conversationId] === data.username) {
      delete typingUsers.value[data.conversationId]
    }
  })
  
  // 읽음 상태 업데이트 이벤트 리스너
  socket.on('message_read', (data) => {
    if (selectedConversation.value && selectedConversation.value.id === data.conversationId) {
      // 현재 선택된 대화의 메시지 중에서 읽음 상태 업데이트
      selectedConversation.value.messages.forEach(msg => {
        if (msg.id === data.messageId) {
          msg.isRead = true
        }
      })
    }
  })
}

// 대화 목록 가져오기
export const getConversations = async (userId) => {
  try {
    isLoading.value = true
    error.value = null
    
    // 소켓 이벤트로 대화 목록 요청
    socket.emit('get_conversations', { userId })
    
    // 이벤트 리스너를 통해 받은 데이터가 conversations.value에 설정됨
  } catch (err) {
    logger.error(CONTEXT, '대화 목록 가져오기 오류:', err)
    error.value = '대화 목록을 가져오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 특정 대화 가져오기
export const getConversation = async (conversationId) => {
  try {
    isLoading.value = true
    error.value = null
    
    // 소켓 이벤트로 특정 대화 요청
    socket.emit('get_conversation', { conversationId })
    
    // 해당 대화 조회 및 읽음 상태 업데이트를 위한 이벤트 리스너
    return new Promise((resolve) => {
      socket.once('conversation_details', (data) => {
        selectedConversation.value = data
        
        // 해당 대화의 읽지 않은 메시지 카운트 초기화
        unreadMessages.value[conversationId] = 0
        
        // 소켓 이벤트로 해당 대화방 입장 알림
        socket.emit('join_conversation', { conversationId })
        
        // 읽음 상태 업데이트
        socket.emit('mark_as_read', { conversationId })
        
        resolve(data)
      })
    })
  } catch (err) {
    logger.error(CONTEXT, '대화 상세 가져오기 오류:', err)
    error.value = '대화를 가져오는 중 오류가 발생했습니다.'
    return null
  } finally {
    isLoading.value = false
  }
}

// 새 대화 생성하기
export const createConversation = async (userId) => {
  try {
    isLoading.value = true
    error.value = null
    
    // 소켓 이벤트로 새 대화 생성 요청
    socket.emit('create_conversation', { userId })
    
    // 생성된 대화 정보를 위한 이벤트 리스너
    return new Promise((resolve) => {
      socket.once('conversation_created', (data) => {
        // 새 대화를 목록 맨 앞에 추가
        conversations.value.unshift(data)
        selectedConversation.value = data
        resolve(data)
      })
    })
  } catch (err) {
    logger.error(CONTEXT, '대화 생성 오류:', err)
    error.value = '새 대화를 생성하는 중 오류가 발생했습니다.'
    return null
  } finally {
    isLoading.value = false
  }
}

// 메시지 전송하기
export const sendMessage = async (conversationId, query) => {
  try {
    if (!conversationId || !query.trim()) {
      return null
    }
    
    // 타이핑 중지 이벤트 발송
    socket.emit('stop_typing', { conversationId })
    
    // 소켓 이벤트로 메시지 전송
    socket.emit('send_message', { conversationId, query })
    
    // 메시지 전송 확인을 위한 이벤트 리스너
    return new Promise((resolve) => {
      socket.once('message_sent', (data) => {
        resolve(data)
      })
    })
  } catch (err) {
    logger.error(CONTEXT, '메시지 전송 오류:', err)
    error.value = '메시지를 전송하는 중 오류가 발생했습니다.'
    return null
  }
}

// 타이핑 상태 알림
export const sendTypingStatus = (conversationId) => {
  socket.emit('typing', { conversationId })
}

// 타이핑 상태 관리 (디바운스 처리)
let typingTimeout = null
export const handleTyping = (conversationId) => {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  
  sendTypingStatus(conversationId)
  
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', { conversationId })
  }, 3000)
}

// 채팅방 종료 시 클린업
export const cleanupChat = (conversationId) => {
  if (conversationId) {
    socket.emit('leave_conversation', { conversationId })
  }
  selectedConversation.value = null
}

// 소켓 서비스 초기화 해제
export const destroyChatService = () => {
  socket.off('conversations_updated')
  socket.off('new_message')
  socket.off('typing')
  socket.off('stop_typing')
  socket.off('message_read')
} 