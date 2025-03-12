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
const dates = ref([]) // 다중 날짜를 위한 배열
const isAllDay = ref(false)
const startTime = ref('09:00')
const endTime = ref('10:00')
const notification = ref('none')
const memo = ref('')
const isRecurring = ref(false)
const recurrenceType = ref('none')

// 선택된 날짜가 변경되면 폼 데이터 업데이트
watch(() => props.selectedDate, (newDate) => {
  if (newDate) {
    dates.value = [newDate.split('T')[0]]
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

// 날짜 추가
const addDate = () => {
  dates.value.push('')
}

// 날짜 삭제
const removeDate = (index) => {
  dates.value.splice(index, 1)
}

// 모달 닫기
const closeModal = () => {
  resetForm()
  emit('close')
}

// 폼 초기화
const resetForm = () => {
  title.value = ''
  dates.value = props.selectedDate ? [props.selectedDate.split('T')[0]] : ['']
  isAllDay.value = false
  startTime.value = '09:00'
  endTime.value = '10:00'
  notification.value = 'none'
  memo.value = ''
  isRecurring.value = false
  recurrenceType.value = 'none'
}

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
  if (!title.value || dates.value.length === 0 || dates.value.some(date => !date)) {
    alert('제목과 날짜는 필수 입력 항목입니다.')
    return
  }

  // 시작 시간이 종료 시간보다 늦은 경우 검증
  if (!isAllDay.value && startTime.value >= endTime.value) {
    alert('종료 시간은 시작 시간보다 늦어야 합니다.')
    return
  }

  // 각 날짜별로 이벤트 생성
  const events = dates.value.map(date => {
    const recurringText = isRecurring.value ? `[${getRecurringText(recurrenceType.value)}] ` : ''
    const newEvent = {
      title: `${recurringText}${title.value}`,
      allDay: isAllDay.value,
      description: memo.value,
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
      display: 'block',
      recurring: isRecurring.value ? recurrenceType.value : 'none'
    }

    // 종일 이벤트인 경우
    if (isAllDay.value) {
      newEvent.start = date
    } else {
      // 시간이 있는 이벤트인 경우
      newEvent.start = `${date}T${startTime.value}:00`
      newEvent.end = `${date}T${endTime.value}:00`
    }

    // 알림 설정 추가
    newEvent.notification = notification.value

    return newEvent
  })

  // 부모 컴포넌트로 이벤트 전달
  events.forEach(event => emit('save', event))

  // 폼 초기화 및 모달 닫기
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
        <!-- 일정 제목 입력 -->
        <div class="mb-4">
          <label
            for="event-title"
            class="block text-dark-gray font-medium mb-2"
          >일정 제목</label>
          <input
            id="event-title"
            v-model="title"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            placeholder="일정 제목을 입력하세요"
          >
        </div>

        <!-- 날짜 선택 -->
        <div class="mb-4">
          <label class="block text-dark-gray font-medium mb-2">날짜</label>
          <div v-for="(date, index) in dates" :key="index" class="flex items-center mb-2">
            <input
              :id="'event-date-' + index"
              v-model="dates[index]"
              type="date"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
            >
            <button
              v-if="index > 0"
              class="ml-2 p-2 text-red-500 hover:text-red-700"
              @click="removeDate(index)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            class="mt-2 py-2 text-dark-gray hover:text-gray-600 transition-colors font-medium flex items-center"
            @click="addDate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            날짜 추가
          </button>
        </div>

        <!-- 시간 선택 -->
        <div class="mb-4">
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
            >종일</label>
          </div>

          <div
            v-if="!isAllDay"
            class="grid grid-cols-2 gap-4"
          >
            <div>
              <label
                for="start-time"
                class="block text-dark-gray font-medium mb-2"
              >시작 시간</label>
              <input
                id="start-time"
                v-model="startTime"
                type="time"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
              >
            </div>
            <div>
              <label
                for="end-time"
                class="block text-dark-gray font-medium mb-2"
              >종료 시간</label>
              <input
                id="end-time"
                v-model="endTime"
                type="time"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
              >
            </div>
          </div>
        </div>

        <!-- 반복 설정 -->
        <div class="mb-4">
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
        <div class="mb-4">
          <label
            for="notification"
            class="block text-dark-gray font-medium mb-2"
          >알림</label>
          <select
            id="notification"
            v-model="notification"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
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

        <!-- 메모 입력 -->
        <div class="mb-4">
          <label
            for="event-memo"
            class="block text-dark-gray font-medium mb-2"
          >메모</label>
          <textarea
            id="event-memo"
            v-model="memo"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point h-24"
            placeholder="메모를 입력하세요"
          />
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
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
</style>
