<script setup>
import { watch, ref } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'

const props = defineProps({
  event: {
    type: Object,
    default: () => ({
      title: '',
      start: '',
      end: '',
      allDay: false,
      description: '',
      recurring: 'none'
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

const deleteOption = ref('all')
const untilDate = ref('')

const closeModal = () => {
  console.log('일정 상세 모달 닫기 버튼 클릭')
  emit('close')
}

const handleDelete = () => {
  try {
    console.log('EventDetailModal: 삭제 시도', {
      eventId: props.event.id,
      isRecurring: props.event.recurring && props.event.recurring !== 'none',
      deleteOptions: {
        option: deleteOption.value,
        untilDate: untilDate.value
      }
    })

    if (deleteOption.value === 'until' && !untilDate.value) {
      alert('유지할 마지막 날짜를 선택해주세요.')
      return
    }

    emit('delete', props.event.id, 
      props.event.recurring && props.event.recurring !== 'none',
      {
        option: deleteOption.value,
        untilDate: untilDate.value
      }
    )
  } catch (error) {
    console.error('EventDetailModal: 삭제 중 오류 발생', error)
    alert('일정 삭제 중 오류가 발생했습니다.')
  }
}

// 반복 주기 텍스트 변환 함수
const getRecurringText = (recurring) => {
  switch (recurring) {
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

// 이벤트 날짜 포맷팅
const formatEventDate = (event) => {
  if (!event || !event.start) {
    return '';
  }
  
  try {
    if (event.allDay) {
      return formatDate(event.start);
    }
    
    // 날짜 형식이 ISO 문자열인지 확인 (T를 포함하는지)
    const hasTimeStart = typeof event.start === 'string' && event.start.includes('T');
    const hasTimeEnd = typeof event.end === 'string' && event.end && event.end.includes('T');
    
    if (hasTimeStart && hasTimeEnd) {
      // 시간이 있는 경우 시작 날짜와 시간, 종료 시간을 표시
      const startTimePart = event.start.split('T')[1];
      const endTimePart = event.end.split('T')[1];
      
      if (startTimePart && endTimePart) {
        const startTime = startTimePart.substring(0, 5);
        const endTime = endTimePart.substring(0, 5);
        return `${formatDate(event.start)} ${startTime} - ${endTime}`;
      }
    }
    
    // 기본적으로 시작 날짜만 표시
    return formatDate(event.start);
  } catch (error) {
    console.error('날짜 포맷팅 중 오류 발생:', error);
    return formatDate(event.start) || '';
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">일정 상세</h3>
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
      <div class="p-6 space-y-4">
        <div>
          <h4 class="font-medium text-gray-700">{{ event.title }}</h4>
          <p class="text-sm text-gray-500">
            {{ formatEventDate(event) }}
          </p>
          <p v-if="event.description" class="mt-2 text-gray-600">
            {{ event.description }}
          </p>
        </div>

        <!-- 반복 일정인 경우 삭제 옵션 -->
        <div v-if="event.recurring && event.recurring !== 'none'" class="space-y-4">
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="deleteAll"
              v-model="deleteOption"
              value="all"
              class="text-point focus:ring-point"
            />
            <label for="deleteAll" class="text-sm text-gray-700">모든 반복 일정 삭제</label>
          </div>
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="deleteUntil"
              v-model="deleteOption"
              value="until"
              class="text-point focus:ring-point"
            />
            <label for="deleteUntil" class="text-sm text-gray-700">특정 날짜까지만 유지</label>
          </div>
          
          <!-- 날짜 선택 (deleteUntil 선택 시에만 표시) -->
          <div v-if="deleteOption === 'until'" class="mt-2">
            <label class="block text-sm text-gray-700 mb-1">유지할 마지막 날짜 선택</label>
            <input
              type="date"
              v-model="untilDate"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
              :min="event && event.start && typeof event.start === 'string' && event.start.includes('T') ? event.start.split('T')[0] : event.start"
            />
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
        <button
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          @click="handleDelete"
        >
          삭제
        </button>
        <button
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          @click="closeModal"
        >
          닫기
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
.text-point {
  color: #FFD600;
}
</style>
