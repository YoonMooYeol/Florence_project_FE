<script setup>
import { watch, ref } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import api from '@/utils/axios'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  },
  events: {
    type: Array,
    default: () => []
  },
  llmSummary: {
    type: Object,
    default: null
  },
  babyDiary: {
    type: Object,
    default: null
  }
})

// 모달이 열린 직후 클릭 방지를 위한 플래그
const isClickable = ref(false)
const diaryContent = ref('')
const activeTab = ref('schedule') // 'schedule', 'daily', 'baby'

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

// babyDiary가 변경될 때 diaryContent 업데이트
watch(() => props.babyDiary, (newDiary) => {
  if (newDiary) {
    diaryContent.value = newDiary.content
  } else {
    diaryContent.value = ''
  }
}, { immediate: true })

const emit = defineEmits(['close', 'add-event', 'view-event', 'view-llm-summary'])

const calendarStore = useCalendarStore()

const baseUrl = 'calendars/baby-diaries/'

const createBabyDiary = (diaryData) => {
  return api.post(baseUrl, diaryData, { headers: { Authorization: 'Bearer 실제_유효한_토큰' } })
}

const closeModal = () => {
  console.log('일일 일정 모달 닫기 버튼 클릭')
  emit('close')
}

const addEvent = () => {
  console.log('일정 등록 버튼 클릭')
  emit('add-event')
}

const viewEvent = (event) => {
  // 클릭 가능 상태가 아니면 무시
  if (!isClickable.value) {
    console.log('모달 열린 직후 클릭 무시됨')
    return
  }

  console.log('일정 상세 보기 클릭:', event)
  console.log('사용자가 직접 클릭: 이벤트 상세 모달 표시 요청')
  emit('view-event', event)
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

const saveBabyDiary = async () => {
  try {
    // Format the selected date to 'YYYY-MM-DD'
    const diaryDate = formatDate(new Date(props.date), 'yyyy-MM-dd')

    // Construct the payload as required by the API
    const payload = {
      pregnancy: calendarStore.pregnancyId,
      content: diaryContent.value,
      diary_date: diaryDate
    }

    // Call the createBabyDiary API function (which is inlined in this file)
    const response = await createBabyDiary(payload)

    console.log('Baby Diary Created:', response.data)

    // Add any additional success handling (e.g., close modal, refresh list)
    emit('close')
  } catch (error) {
    console.error('일기 저장 중 오류 발생:', error)
    alert('일기 저장에 실패했습니다. 다시 시도해주세요.')
  }
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
          {{ formatDate(date) }}
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

      <!-- 탭 메뉴 -->
      <div class="flex border-b border-gray-200">
        <button
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'schedule' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'schedule'"
        >
          일정
        </button>
        <button
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'daily' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'daily'"
        >
          오늘의 하루
        </button>
        <button
          v-if="calendarStore.isPregnant"
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'baby' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          data-tab="baby"
          @click="activeTab = 'baby'"
        >
          {{ calendarStore.babyNickname }}{{ calendarStore.getJosa(calendarStore.babyNickname, '과', '와') }}의 하루
        </button>
      </div>

      <div class="h-96 p-6 bg-ivory h-128">
        <!-- 일정 탭 -->
        <div v-if="activeTab === 'schedule'" class="space-y-4">
          <div v-if="events.length > 0" class="space-y-2 h-128">
            <div
              v-for="event in events"
              :key="event.id"
              class="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50"
              @click="viewEvent(event)"
            >
              <h4 class="font-medium text-dark-gray">
                {{ event.title }}
                <span v-if="event.recurring && event.recurring !== 'none'" class="text-sm text-gray-500 ml-2">
                  ({{ getRecurringText(event.recurring) }})
                </span>
              </h4>
              <p v-if="!event.allDay" class="text-sm text-gray-500">
                {{ formatTime(event.start) }} ~ {{ formatTime(event.end) }}
              </p>
              <p v-else class="text-sm text-gray-500">
                종일
              </p>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500">
              등록된 일정이 없습니다.
            </p>
          </div>
          <div class="flex justify-center">
            <button
              class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
              @click="addEvent"
            >
              일정 추가
            </button>
          </div>
        </div>

        <!-- 오늘의 하루 탭 -->
        <div v-if="activeTab === 'daily'" class="space-y-4">
          <div v-if="llmSummary" class="bg-white p-4 rounded-lg shadow">
            <p class="text-dark-gray whitespace-pre-line h-128">
              {{ llmSummary.summary }}
            </p>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500">
              데이터가 없습니다.
            </p>
          </div>
        </div>

        <!-- 아기와의 하루 탭 -->
        <div v-if="activeTab === 'baby'" class="space-y-4">
          <div class="bg-white p-4 rounded-lg shadow">
            <textarea
              v-model="diaryContent"
              class="w-full h-56 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none"
              placeholder="아기와의 소중한 하루를 기록해보세요...♥︎"
            />
            <div class="flex justify-end space-x-2 mt-4">
              <button
                class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
                @click="saveBabyDiary"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
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
.border-point {
  border-color: #FFD600;
}
</style>

