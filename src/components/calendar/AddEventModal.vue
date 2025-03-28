<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
})

const emit = defineEmits(['close', 'save'])

// 폼 데이터
const title = ref('')
const startDate = ref(props.selectedDate || new Date().toISOString().split('T')[0]) // 시작 날짜
const endDate = ref(props.selectedDate || new Date().toISOString().split('T')[0])   // 종료 날짜
const isAllDay = ref(false)
const startTime = ref('09:00')
const endTime = ref('10:00')
const notification = ref('none')
const memo = ref('')
const isRecurring = ref(false)
const recurrenceType = ref('none')
const eventColor = ref('#FFD600')  // 기본 색상 추가

// 드롭다운 상태
const showStartTimeDropdown = ref(false)
const showEndTimeDropdown = ref(false)

// 시간 옵션 생성 (00:00부터 23:30까지 30분 간격)
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = (i % 2) * 30
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

// 색상 옵션 정의
const colorOptions = [
  { value: '#FFD600', label: '노랑' },
  { value: '#FF6B6B', label: '빨강' },
  { value: '#4ECDC4', label: '청록' },
  { value: '#45B7D1', label: '하늘' },
  { value: '#96CEB4', label: '민트' },
  { value: '#FFEEAD', label: '연한 노랑' },
  { value: '#D4A5A5', label: '연한 빨강' },
  { value: '#9B59B6', label: '보라' },
  { value: '#3498DB', label: '파랑' },
  { value: '#2ECC71', label: '초록' }
]

// 드롭다운 토글 함수
const toggleStartTimeDropdown = () => {
  showStartTimeDropdown.value = !showStartTimeDropdown.value
  showEndTimeDropdown.value = false
}

const toggleEndTimeDropdown = () => {
  showEndTimeDropdown.value = !showEndTimeDropdown.value
  showStartTimeDropdown.value = false
}

// 시간 선택 함수
const selectStartTime = (time) => {
  startTime.value = time
  showStartTimeDropdown.value = false
}

const selectEndTime = (time) => {
  endTime.value = time
  showEndTimeDropdown.value = false
}

// 선택된 날짜가 변경되면 폼 데이터 업데이트
watch(() => props.selectedDate, (newDate) => {
  if (newDate) {
    startDate.value = newDate.split('T')[0]
    endDate.value = newDate.split('T')[0]
  }
}, { immediate: true })

// 반복 설정 체크박스 변경 감지
watch(isRecurring, (newValue) => {
  if (newValue) {
    recurrenceType.value = 'daily'
  } else {
    recurrenceType.value = 'none'
  }
})

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

// 일정 저장
const saveEvent = () => {
  // 필수 입력값 검증
  if (!title.value || !startDate.value || !endDate.value) {
    alert('제목과 날짜는 필수 입력 항목입니다.')
    return
  }

  // 시작 날짜가 종료 날짜보다 이후인 경우 검증
  if (startDate.value > endDate.value) {
    alert('종료 날짜는 시작 날짜 이후여야 합니다.')
    return
  }

  // 시작 시간이 종료 시간보다 이른 경우 검증 (같은 날짜일 경우만)
  if (!isAllDay.value && startDate.value === endDate.value && startTime.value > endTime.value) {
    alert('종료 시간이 시작 시간 이후여야 합니다.')
    return
  }

  console.log('일정 저장 시작:', {
    title: title.value,
    startDate: startDate.value,
    endDate: endDate.value,
    isAllDay: isAllDay.value,
    startTime: startTime.value,
    endTime: endTime.value
  })

  // 반복 텍스트 추가
  const recurringText = isRecurring.value ? `[${getRecurringText(recurrenceType.value)}] ` : ''
  
  // 이벤트 생성
  const newEvent = {
    title: `${recurringText}${title.value}`,
    allDay: isAllDay.value,
    description: memo.value,
    backgroundColor: eventColor.value,
    borderColor: eventColor.value,
    textColor: '#353535',
    display: 'block',
    recurring: isRecurring.value ? recurrenceType.value : 'none',
    event_time: isAllDay.value ? null : startTime.value,
    startTime: isAllDay.value ? '00:00' : startTime.value,
    endTime: isAllDay.value ? '23:59' : endTime.value,
    event_color: eventColor.value,
    start_date: startDate.value,
    end_date: endDate.value
  }

  // 시간 정보 설정
  if (isAllDay.value) {
    newEvent.start = `${startDate.value}T00:00:00`
    newEvent.end = `${endDate.value}T23:59:59`
  } else {
    newEvent.start = `${startDate.value}T${startTime.value}:00`
    newEvent.end = `${endDate.value}T${endTime.value}:00`
  }

  // 알림 설정 추가
  newEvent.notification = notification.value

  console.log('생성된 이벤트:', newEvent)
  
  // 부모 컴포넌트로 이벤트 전달
  emit('save', newEvent)

  // 폼 초기화 및 모달 닫기
  resetForm()
  emit('close')
}

// 폼 초기화
const resetForm = () => {
  title.value = ''
  startDate.value = props.selectedDate ? props.selectedDate.split('T')[0] : new Date().toISOString().split('T')[0]
  endDate.value = props.selectedDate ? props.selectedDate.split('T')[0] : new Date().toISOString().split('T')[0]
  isAllDay.value = false
  startTime.value = '09:00'
  endTime.value = '10:00'
  notification.value = 'none'
  memo.value = ''
  isRecurring.value = false
  recurrenceType.value = 'none'
  eventColor.value = '#FFD600'  // 색상 초기화 추가
}

// 모달 닫기
const closeModal = () => {
  resetForm()
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center detail-modal p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          일정 등록
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="closeModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 18 24"
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
      <div class="p-5 bg-ivory">
        <!-- 일정 제목 입력 -->
        <div class="mb-2">
          <label
            for="event-title"
            class="block text-dark-gray font-medium mb-2"
          >일정 제목</label>
          <input
            id="event-title"
            v-model="title"
            type="text"
            class="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            placeholder="일정 제목을 입력하세요"
          >
        </div>

        <!-- 날짜 선택 -->
        <div class="mb-1">
          <label class="block text-dark-gray font-medium mb-2">날짜</label>
          <div class="flex items-center mb-2">
            <input
              :id="'event-start-date'"
              v-model="startDate"
              type="date"
              class="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            >
            <span class="mx-2">-</span>
            <input
              :id="'event-end-date'"
              v-model="endDate"
              type="date"
              class="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            >
          </div>
        </div>

        <!-- 시간 선택 -->
        <div class="mb-2">
          <div class="flex items-center mb-2">
            <input
              id="all-day"
              v-model="isAllDay"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="all-day"
              class="text-dark-gray font-medium"
            >하루 종일</label>
          </div>

          <div
            v-if="!isAllDay"
            class="grid grid-cols-2 gap-4"
          >
            <div>
              <label
                for="start-time"
                class="block text-dark-gray font-medium mb-1"
              >시작 시간</label>
              <div class="relative">
                <div
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point cursor-pointer bg-white"
                  @click="toggleStartTimeDropdown"
                >
                  {{ startTime }}
                </div>
                <div
                  v-if="showStartTimeDropdown"
                  class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[180px] overflow-y-auto"
                >
                  <div
                    v-for="time in timeOptions"
                    :key="time"
                    class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    @click="selectStartTime(time)"
                  >
                    {{ time }}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label
                for="end-time"
                class="block text-dark-gray font-medium mb-1"
              >종료 시간</label>
              <div class="relative">
                <div
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point cursor-pointer bg-white"
                  @click="toggleEndTimeDropdown"
                >
                  {{ endTime }}
                </div>
                <div
                  v-if="showEndTimeDropdown"
                  class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[180px] overflow-y-auto"
                >
                  <div
                    v-for="time in timeOptions"
                    :key="time"
                    class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    @click="selectEndTime(time)"
                  >
                    {{ time }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 반복 설정 -->
        <div class="mb-2">
          <div class="flex items-center mb-2">
            <input
              id="recurring"
              v-model="isRecurring"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="recurring"
              class="text-dark-gray font-medium"
            >반복</label>
          </div>

          <div v-if="isRecurring" class="mt-2">
            <select
              v-model="recurrenceType"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            >
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="yearly">매년</option>
            </select>
          </div>
        </div>

        <!-- 알림 설정 -->
        <div class="mb-2">
          <label
            for="notification"
            class="block text-dark-gray font-medium mb-2"
          >알림</label>
          <select
            id="notification"
            v-model="notification"
            class="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
          >
            <option value="none">
              알림 없음
            </option>
            <option value="10min">
              10분 전
            </option>
            <option value="30min">
              30분 전
            </option>
            <option value="1hour">
              1시간 전
            </option>
            <option value="1day">
              1일 전
            </option>
          </select>
        </div>

        <!-- 색상 선택 -->
        <div class="mb-2">
          <label class="block text-dark-gray font-medium mb-2">일정 색상</label>
          <div class="grid grid-cols-10 gap-1">
            <div
              v-for="color in colorOptions"
              :key="color.value"
              class="relative cursor-pointer"
              @click="eventColor = color.value"
            >
              <div
                class="w-full h-6 rounded-lg border-2 transition-all"
                :style="{ backgroundColor: color.value }"
                :class="{ 'border-point': eventColor === color.value }"
              />
              <div
                class="absolute inset-0 flex items-center justify-center text-xs text-white font-medium"
                v-if="eventColor === color.value"
              >
                ✓
              </div>
            </div>
          </div>
        </div>

        <!-- 메모 입력 -->
        <div class="mb-1">
          <label
            for="event-memo"
            class="block text-dark-gray font-medium mb-1"
          >메모</label>
          <textarea
            id="event-memo"
            v-model="memo"
            class="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point h-18"
            placeholder="메모를 입력하세요..."
          />
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-5 py-2.5 bg-white border-t border-gray-200 flex justify-end">
        <button
          class="px-6 py-2 bg-point text-dark-gray rounded-full hover:bg-yellow-500 transition-colors font-medium"
          @click="saveEvent"
        >
          저장
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

select {
  max-height: 180px;
  overflow-y: auto;
}

select option {
  padding: 8px;
}

/* 드롭다운 메뉴의 최대 높이 제한 */
select:focus option:checked {
  background: #FFD600;
}

/* 드롭다운 메뉴의 스타일 */
select option {
  max-height: 180px;
  overflow-y: auto;
}

.border-point {
  border-color: #FFD600;
}
</style>
