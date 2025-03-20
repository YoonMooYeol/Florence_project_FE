import { io } from 'socket.io-client'
import { ref } from 'vue'

// 소켓 관련 상태 관리
export const socketStatus = ref('disconnected')
export const isConnected = ref(false)

// 백엔드 서버 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// 소켓 인스턴스 생성
const socket = io(API_BASE_URL, {
  autoConnect: false,
  withCredentials: true
})

// 소켓 연결 관리
export const connectSocket = (token) => {
  if (token) {
    // 인증 토큰 설정
    socket.auth = { token }
    
    // 연결이 되어 있지 않은 경우에만 연결
    if (!isConnected.value) {
      socket.connect()
    }
  }
}

// 소켓 연결 해제
export const disconnectSocket = () => {
  socket.disconnect()
  isConnected.value = false
  socketStatus.value = 'disconnected'
}

// 이벤트 리스너 등록
socket.on('connect', () => {
  console.log('Socket connected')
  isConnected.value = true
  socketStatus.value = 'connected'
})

socket.on('disconnect', () => {
  console.log('Socket disconnected')
  isConnected.value = false
  socketStatus.value = 'disconnected'
})

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message)
  socketStatus.value = 'error'
})

// 소켓 인스턴스 내보내기
export default socket 