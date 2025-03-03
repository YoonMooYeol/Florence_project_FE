<script setup>
import { defineProps, defineEmits, watch } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'

const props = defineProps({
  event: {
    type: Object,
    default: () => ({
      title: '',
      start: '',
      end: '',
      allDay: false,
      description: ''
    })
  },
  show: {
    type: Boolean,
    default: false
  }
})

// show prop이 변경될 때마다 콘솔에 로그 출력
watch(() => props.show, (newValue) => {
  if (newValue) {
    console.log('EventDetailModal 컴포넌트에서 - 일정 상세 모달이 열렸습니다:', props.event)
  } else {
    console.log('EventDetailModal 컴포넌트에서 - 일정 상세 모달이 닫혔습니다')
  }
})

const emit = defineEmits(['close', 'delete'])

const closeModal = () => {
  console.log('일정 상세 모달 닫기 버튼 클릭')
  emit('close')
}

const deleteEvent = () => {
  if (props.event && props.event.id) {
    console.log('일정 삭제 버튼 클릭:', props.event.id)
    emit('delete', props.event.id)
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 flex items-center justify-center detail-modal p-4 pointer-events-none"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden pointer-events-auto">
      <!-- 모달 헤더 -->
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          일정 상세
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
        <div class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              일정 제목
            </h4>
            <p class="text-lg font-bold text-dark-gray">
              {{ event.title }}
            </p>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              날짜
            </h4>
            <p class="text-dark-gray">
              {{ formatDate(event.start) }}
            </p>
          </div>

          <div v-if="!event.allDay">
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              시간
            </h4>
            <p class="text-dark-gray">
              {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
            </p>
          </div>

          <div v-else>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              시간
            </h4>
            <p class="text-dark-gray">
              종일
            </p>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              메모
            </h4>
            <p class="text-dark-gray bg-white p-3 rounded-lg border border-gray-200">
              {{ event.description || '일정에 관한 상세 메모가 여기에 표시됩니다.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
        <button
          class="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
          @click="deleteEvent"
        >
          삭제
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
