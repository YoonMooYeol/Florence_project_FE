<script setup>
import { ref } from 'vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const eventData = ref({
  title: '',
  start: props.date,
  end: props.date,
  allDay: true,
  description: '',
  recurring: 'none'
})

const isRecurring = ref(false)
const recurrenceType = ref('daily')

// 반복 주기 텍스트 가져오기
const getRecurringText = (type) => {
  switch (type) {
    case 'daily':
      return '매일'
    case 'weekly':
      return '매주'
    case 'monthly':
      return '매월'
    case 'yearly':
      return '매년'
    default:
      return ''
  }
}

const handleSave = () => {
  console.log('이벤트 저장 시작')
  
  // 필수 입력값 검증
  if (!eventData.value.title.trim()) {
    alert('일정 제목을 입력해주세요.')
    return
  }

  // 시작 시간이 종료 시간보다 늦은 경우 검증
  if (!eventData.value.allDay && eventData.value.start >= eventData.value.end) {
    alert('종료 시간은 시작 시간보다 늦어야 합니다.')
    return
  }

  // 이벤트 데이터 생성
  const newEvent = {
    ...eventData.value,
    recurring: isRecurring.value ? recurrenceType.value : 'none'
  }

  // 반복 일정인 경우 제목에 표시
  if (isRecurring.value) {
    newEvent.title = `[${getRecurringText(recurrenceType.value)}] ${newEvent.title}`
  }

  console.log('저장할 이벤트:', newEvent)
  emit('save', newEvent)

  // 폼 초기화 및 모달 닫기
  resetForm()
  emit('close')
}

const resetForm = () => {
  eventData.value.title = ''
  eventData.value.start = props.date
  eventData.value.end = props.date
  eventData.value.allDay = true
  eventData.value.description = ''
  eventData.value.recurring = 'none'
  isRecurring.value = false
  recurrenceType.value = 'daily'
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
    <!-- 배경 오버레이 -->
    <div
      class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
      @click="emit('close')"
    />

    <!-- 모달 컨테이너 -->
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
        <h2 class="text-base sm:text-lg font-semibold text-dark-gray">
          일정 등록
        </h2>
        <button
          class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-point-yellow rounded-lg"
          @click="emit('close')"
        >
          <svg
            class="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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

      <!-- 모달 컨텐츠 -->
      <div class="modal-content p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
        <div class="space-y-3 sm:space-y-4">
          <!-- 날짜 선택 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <input
              type="date"
              v-model="eventData.start"
              class="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow"
            />
          </div>

          <!-- 제목 입력 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              v-model="eventData.title"
              class="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="일정 제목을 입력하세요"
            />
          </div>

          <!-- 설명 입력 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              v-model="eventData.description"
              class="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow resize-none h-24"
              placeholder="일정에 대한 설명을 입력하세요"
            />
          </div>

          <!-- 종일 일정 체크박스 -->
          <div class="flex items-center">
            <input
              type="checkbox"
              v-model="eventData.allDay"
              class="w-5 h-5 sm:w-4 sm:h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            />
            <label class="ml-2 text-base sm:text-sm text-gray-700">
              종일 일정
            </label>
          </div>

          <!-- 반복 일정 설정 -->
          <div class="space-y-2">
            <div class="flex items-center">
              <input
                type="checkbox"
                v-model="isRecurring"
                class="w-5 h-5 sm:w-4 sm:h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
              />
              <label class="ml-2 text-base sm:text-sm text-gray-700">
                반복 일정
              </label>
            </div>

            <div v-if="isRecurring">
              <select
                v-model="recurrenceType"
                class="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow"
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
                <option value="yearly">매년</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="flex justify-end space-x-2 p-3 sm:p-4 border-t border-gray-200">
        <button
          class="px-4 py-2.5 text-base sm:text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          @click="emit('close')"
        >
          취소
        </button>
        <button
          class="px-4 py-2.5 text-base sm:text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
          @click="handleSave"
        >
          저장하기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 스크롤바 스타일링 */
.modal-content {
  scrollbar-width: thin;
  scrollbar-color: #FFD600 #F3F4F6;
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #F3F4F6;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #FFD600;
  border-radius: 3px;
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  .max-w-md {
    max-width: 100%;
    margin: 0;
  }

  input[type="text"],
  input[type="date"],
  select,
  textarea {
    font-size: 16px; /* iOS에서 자동 확대 방지 */
  }

  .space-y-3 {
    margin-top: 0.75rem;
  }

  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
}
</style> 