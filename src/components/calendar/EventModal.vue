<script setup>
import { ref, watch, computed } from 'vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  },
  event: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

// 폼 데이터 초기화
const formData = ref({
  title: '',
  description: '',
  start: props.date,
  end: props.date,
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  recurring: 'none'
})

// 반복 일정 수정 옵션 추가
const updateOption = ref('this_and_future')

// 이 이벤트가 반복 일정인지 계산
const isRecurringEvent = computed(() => {
  return props.event && 
    ((props.event.recurring && props.event.recurring !== 'none') || 
    props.event.is_recurring === true)
})

// 이벤트 데이터로 폼 초기화
const initFormData = () => {
  if (props.event) {
    // 수정 모드: 기존 이벤트 데이터로 초기화
    const event = props.event
    formData.value = {
      title: event.title || '',
      description: event.description || '',
      start: event.start?.split('T')[0] || props.date,
      end: event.end?.split('T')[0] || props.date,
      startTime: event.start?.split('T')[1]?.substring(0, 5) || '09:00',
      endTime: event.end?.split('T')[1]?.substring(0, 5) || '10:00',
      allDay: event.allDay || false,
      recurring: event.recurring || 'none'
    }
    
    // 반복 일정 수정 옵션 기본값
    updateOption.value = 'this_and_future'
  } else {
    // 새 이벤트: 기본값으로 초기화
    formData.value = {
      title: '',
      description: '',
      start: props.date,
      end: props.date,
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      recurring: 'none'
    }
  }
}

// props.show가 변경될 때마다 폼 초기화
watch(() => props.show, (newValue) => {
  if (newValue) {
    initFormData()
  }
})

// 저장 처리
const handleSave = () => {
  if (!formData.value.title.trim()) {
    alert('제목을 입력해주세요.')
    return
  }

  // 종일 일정이 아닌 경우 시간 검증
  if (!formData.value.allDay) {
    if (formData.value.startTime >= formData.value.endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }
  }

  const eventData = {
    title: formData.value.title,
    description: formData.value.description,
    start: formData.value.allDay ? 
      formData.value.start : 
      `${formData.value.start}T${formData.value.startTime}:00`,
    end: formData.value.allDay ? 
      formData.value.end : 
      `${formData.value.end}T${formData.value.endTime}:00`,
    allDay: formData.value.allDay,
    recurring: formData.value.recurring,
    startTime: formData.value.startTime,
    endTime: formData.value.endTime,
    // ID가 있는 경우 수정 모드로 처리
    id: props.event?.id,
    // 이벤트 타입 추가 (기본값: general)
    event_type: props.event?.event_type || 'general',
    // 반복 일정 수정 옵션 추가
    updateOption: isRecurringEvent.value ? updateOption.value : null
  }
  
  console.log('이벤트 저장/수정 데이터:', eventData)
  console.log('반복 일정 수정 옵션:', updateOption.value)
  emit('save', eventData)
}

// 시간 선택 옵션 생성
const timeOptions = computed(() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      options.push(`${hourStr}:${minuteStr}`)
    }
  }
  return options
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-ivory rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <div class="bg-point px-6 py-3 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          {{ props.event ? '일정 수정' : '일정 등록' }}
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="$emit('close')"
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

      <div class="p-3 space-y-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            날짜
          </label>
          <input
            type="date"
            v-model="formData.start"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            v-model="formData.title"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            v-model="formData.description"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-32 bg-white"
            placeholder="일정에 대한 설명을 입력하세요"
          />
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            v-model="formData.allDay"
            class="h-4 w-4 text-point focus:ring-point border-gray-300 rounded bg-white"
          />
          <label class="ml-2 text-sm text-gray-700">
            종일 일정
          </label>
        </div>

        <!-- 시간 선택 (종일 일정이 아닌 경우에만 표시) -->
        <div
          v-if="!formData.allDay"
          class="grid grid-cols-2 gap-4"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
            <select
              v-model="formData.startTime"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option
                v-for="time in timeOptions"
                :key="time"
                :value="time"
              >
                {{ time }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
            <select
              v-model="formData.endTime"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option
                v-for="time in timeOptions"
                :key="time"
                :value="time"
              >
                {{ time }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center">
            <label class="block text-sm font-medium text-gray-700">
              반복
            </label>
            <select
              v-model="formData.recurring"
              class="ml-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option value="none">반복 안함</option>
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="yearly">매년</option>
            </select>
          </div>
        </div>
        
        <!-- 반복 일정 수정 시 옵션 선택 UI -->
        <div v-if="props.event && isRecurringEvent" class="space-y-3 mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-700">반복 일정 수정 범위</h4>
          
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateThisOnly"
              v-model="updateOption"
              value="this_only"
              class="text-point focus:ring-point"
            />
            <label for="updateThisOnly" class="text-sm text-gray-700">이 일정만 수정</label>
          </div>
          
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateThisAndFuture"
              v-model="updateOption"
              value="this_and_future"
              class="text-point focus:ring-point"
            />
            <label for="updateThisAndFuture" class="text-sm text-gray-700">이후 모든 일정 수정</label>
          </div>
          
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateAll"
              v-model="updateOption"
              value="all"
              class="text-point focus:ring-point"
            />
            <label for="updateAll" class="text-sm text-gray-700">모든 반복 일정 수정</label>
          </div>
        </div>

        <div class="flex justify-end space-x-2 mt-3 -mx-3 -mb-3 px-4 py-3 bg-white border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="$emit('close')"
          >
            취소
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
            @click="handleSave"
          >
            {{ props.event ? '수정' : '저장' }}
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
.text-point {
  color: #FFD600;
}
.ring-point {
  --tw-ring-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
.bg-ivory {
  background-color: #FFFAE0;
}
</style> 