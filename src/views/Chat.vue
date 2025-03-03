<script setup>
import { ref } from 'vue'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

// 대화 메시지 목록 (실제 구현 시 API에서 가져올 예정)
const messages = ref([
  {
    id: 1,
    sender: 'bot',
    content: '안녕하세요! 하트비트 AI 상담사입니다. 무엇을 도와드릴까요?',
    time: '09:30'
  },
  {
    id: 2,
    sender: 'user',
    content: '임신 초기에 주의해야 할 음식이 뭐가 있을까요?',
    time: '09:31'
  },
  {
    id: 3,
    sender: 'bot',
    content: '임신 초기에는 다음과 같은 음식을 피하는 것이 좋습니다:\n\n1. 날 생선이나 덜 익힌 생선\n2. 알코올 음료\n3. 카페인이 많은 음료\n4. 가공육\n5. 살균되지 않은 유제품\n\n대신 신선한 과일, 채소, 단백질이 풍부한 음식을 섭취하는 것이 좋습니다.',
    time: '09:32'
  }
])

// 새 메시지 입력
const newMessage = ref('')

// 메시지 전송 함수 (실제 구현은 나중에)
const sendMessage = () => {
  if (!newMessage.value.trim()) return
  
  // UI 데모용 메시지 추가
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  
  messages.value.push({
    id: messages.value.length + 1,
    sender: 'user',
    content: newMessage.value,
    time: `${hours}:${minutes}`
  })
  
  newMessage.value = ''
  
  // 스크롤을 맨 아래로 이동 (실제 구현 시)
  setTimeout(() => {
    const chatContainer = document.querySelector('.chat-messages')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, 100)
}
</script>

<template>
  <div class="min-h-screen bg-ivory flex flex-col">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-center relative">
      <h1 class="text-xl font-bold text-center text-dark-gray">AI 상담사</h1>
    </div>

    <!-- 대화 메시지 영역 -->
    <div class="flex-1 p-4 overflow-y-auto chat-messages pb-16">
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-dark-gray" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8 5a1 1 0 100-2 1 1 0 000 2zm-2-7.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
              </svg>
            </div>
            <div>
              <div class="bg-white p-3 rounded-lg shadow-sm whitespace-pre-wrap">
                {{ message.content }}
              </div>
              <div class="text-xs text-gray-500 mt-1 ml-1">{{ message.time }}</div>
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
            <div class="text-xs text-gray-500 mt-1 mr-1">{{ message.time }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 메시지 입력 영역 -->
    <div class="bg-white p-3 border-t border-gray-200 fixed bottom-16 left-0 right-0 z-10">
      <div class="flex items-center">
        <button class="p-2 text-gray-500 rounded-full hover:bg-gray-100 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <input
          v-model="newMessage"
          type="text"
          placeholder="메시지를 입력하세요"
          class="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-point-yellow"
          @keyup.enter="sendMessage"
        >
        <button 
          class="p-2 ml-2 bg-point-yellow text-dark-gray rounded-full hover:bg-yellow-400 focus:outline-none"
          @click="sendMessage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
  height: calc(100vh - 180px);
  padding-bottom: 60px;
}
</style> 