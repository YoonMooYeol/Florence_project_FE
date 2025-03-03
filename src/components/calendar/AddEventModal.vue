<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

// 폼 데이터
const title = ref('')
const date = ref('')
const isAllDay = ref(false)
const startTime = ref('09:00')
const endTime = ref('10:00')
const notification = ref('none')
const memo = ref('')

// 선택된 날짜가 변경되면 폼 데이터 업데이트
watch(() => props.selectedDate, (newDate) => {
  if (newDate) {
    date.value = newDate.split('T')[0]
  }
}, { immediate: true })

// 모달 닫기
const closeModal = () => {
  resetForm()
  emit('close')
}

// 폼 초기화
const resetForm = () => {
  title.value = ''
  date.value = props.selectedDate ? props.selectedDate.split('T')[0] : ''
  isAllDay.value = false
  startTime.value = '09:00'
  endTime.value = '10:00'
  notification.value = 'none'
  memo.value = ''
}

// 일정 저장
const saveEvent = () => {
  // 필수 입력값 검증
  if (!title.value || !date.value) {
    alert('제목과 날짜는 필수 입력 항목입니다.')
    return
  }

  // 시작 시간이 종료 시간보다 늦은 경우 검증
  if (!isAllDay.value && startTime.value >= endTime.value) {
    alert('종료 시간은 시작 시간보다 늦어야 합니다.')
    return
  }

  // 이벤트 객체 생성
  const newEvent = {
    title: title.value,
    allDay: isAllDay.value,
    description: memo.value,
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  }

  // 종일 이벤트인 경우
  if (isAllDay.value) {
    newEvent.start = date.value
  } else {
    // 시간이 있는 이벤트인 경우
    newEvent.start = `${date.value}T${startTime.value}:00`
    newEvent.end = `${date.value}T${endTime.value}:00`
  }

  // 알림 설정 추가
  newEvent.notification = notification.value

  // 부모 컴포넌트로 이벤트 전달
  emit('save', newEvent)

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
          <label
            for="event-date"
            class="block text-dark-gray font-medium mb-2"
          >날짜</label>
          <input
            id="event-date"
            v-model="date"
            type="date"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
          >
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
