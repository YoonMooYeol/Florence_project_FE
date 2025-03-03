<script setup>
import { defineProps, defineEmits, watch, ref } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    default: null
  },
  events: {
    type: Array,
    default: () => []
  },
  llmSummary: {
    type: Object,
    default: null
  }
})

// 모달이 열린 직후 클릭 방지를 위한 플래그
const isClickable = ref(false)

// show prop이 변경될 때마다 콘솔에 로그 출력하고 클릭 가능 상태 관리
watch(() => props.show, (newValue) => {
  if (newValue) {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 열렸습니다:', props.date, '이벤트 수:', props.events.length)
    // 모달이 열리면 클릭 방지 설정 (300ms 동안)
    isClickable.value = false
    setTimeout(() => {
      isClickable.value = true
      console.log('DayEventsModal - 이제 이벤트 클릭 가능')
    }, 300)
  } else {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 닫혔습니다')
  }
})

const emit = defineEmits(['close', 'add-event', 'view-event', 'view-llm-summary'])

const closeModal = () => {
  console.log('일일 일정 모달 닫기 버튼 클릭')
  emit('close')
}

const openAddEventModal = () => {
  console.log('일정 등록 버튼 클릭')
  emit('add-event')
}

const openEventDetailModal = (event) => {
  // 클릭 가능 상태가 아니면 무시
  if (!isClickable.value) {
    console.log('모달 열린 직후 클릭 무시됨')
    return
  }

  console.log('일정 상세 보기 클릭:', event)
  console.log('사용자가 직접 클릭: 이벤트 상세 모달 표시 요청')
  emit('view-event', event)
}

const openLLMDetailModal = (summary) => {
  console.log('LLM 요약 상세 보기 클릭:', summary)
  emit('view-llm-summary', summary)
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center day-events-modal p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          {{ date ? formatDate(date) : '' }}
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="closeModal"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- 모달 내용 -->
      <div class="p-6 bg-ivory">
        <!-- 일정 섹션 -->
        <div class="mb-6">
          <h4 class="text-md font-bold text-dark-gray mb-3">
            일정
          </h4>
          <div
            v-if="events.length === 0"
            class="text-center py-4 text-gray-500"
          >
            이 날짜에 등록된 일정이 없습니다.
          </div>
          <div v-else>
            <div
              v-for="event in events"
              :key="event.id"
              class="mb-4 p-4 bg-white rounded-xl shadow-sm border-l-4 border-point cursor-pointer hover:shadow-md transition-shadow"
              @click="openEventDetailModal(event)"
            >
              <div class="flex justify-between items-start">
                <div class="font-bold text-dark-gray text-lg mb-2">
                  {{ event.title }}
                </div>
                <div class="bg-point text-dark-gray text-xs px-2 py-1 rounded-full">
                  {{ event.allDay ? '종일' : formatTime(event.start) }}
                </div>
              </div>
              <div
                v-if="!event.allDay"
                class="text-sm text-gray-600 mt-2"
              >
                {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
              </div>
            </div>
          </div>
        </div>

        <!-- LLM 대화 요약 섹션 -->
        <div>
          <h4 class="text-md font-bold text-dark-gray mb-3">
            대화 요약
          </h4>
          <div
            v-if="!llmSummary"
            class="text-center py-4 text-gray-500"
          >
            이 날짜에 대화 내용이 없습니다.
          </div>
          <div
            v-else
            class="p-4 bg-white rounded-xl shadow-sm border-l-4 border-blue-400 cursor-pointer hover:shadow-md transition-shadow"
            @click="openLLMDetailModal(llmSummary)"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="font-bold text-dark-gray text-lg">
                대화 요약
              </div>
              <div class="bg-blue-400 text-white text-xs px-2 py-1 rounded-full">
                AI
              </div>
            </div>
            <p class="text-sm text-gray-600">
              {{ llmSummary.summary }}
            </p>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
        <button
          class="px-4 py-2 bg-point text-dark-gray rounded-full hover:bg-yellow-500 transition-colors font-medium"
          @click="openAddEventModal"
        >
          일정등록
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-point {
  background-color: #FFD600;
}
.bg-ivory {
  background-color: #FFFAE0;
}
.text-dark-gray {
  color: #353535;
}
</style>
