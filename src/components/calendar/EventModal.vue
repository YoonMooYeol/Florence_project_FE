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
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          일정 등록
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="emit('close')"
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

      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            날짜
          </label>
          <input
            type="date"
            v-model="eventData.start"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            v-model="eventData.title"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            v-model="eventData.description"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-32"
            placeholder="일정에 대한 설명을 입력하세요"
          />
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            v-model="eventData.allDay"
            class="h-4 w-4 text-point focus:ring-point border-gray-300 rounded"
          />
          <label class="ml-2 text-sm text-gray-700">
            종일 일정
          </label>
        </div>

        <div class="space-y-2">
          <div class="flex items-center">
            <input
              type="checkbox"
              v-model="isRecurring"
              class="h-4 w-4 text-point focus:ring-point border-gray-300 rounded"
            />
            <label class="ml-2 text-sm text-gray-700">
              반복 일정
            </label>
          </div>

          <div v-if="isRecurring" class="mt-2">
            <select
              v-model="recurrenceType"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            >
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="yearly">매년</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="emit('close')"
          >
            취소
          </button>
          <button
            class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
            @click="handleSave"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-point {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style> 