<template>
  <div class="flex flex-col h-screen bg-yellow-50">
    <!-- Header -->
    <div class="p-4 bg-white shadow-md text-center relative">
      <button 
        class="absolute left-4 text-dark-gray"
        @click="router.go(-1)"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 class="text-xl font-semibold">{{ babyInfo.babyName }}{{ getJosa(babyInfo.babyName, '과', '와') }}의 하루</h1>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="flex-1 flex justify-center items-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray ml-2">정보를 불러오는 중...</p>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="p-4 mb-4 text-center text-red-700 bg-red-100">
      {{ errorMessage }}
    </div>

    <!-- Calendar View -->
    <div v-if="!isLoading" class="flex-1 p-4">
      <FullCalendar 
        :options="calendarOptions"
        class="bg-white rounded-lg shadow-md p-4"
      />
      <!-- Add Diary Button -->
      <div class="flex justify-center mt-4">
        <button
          @click="openTodayDiary"
          class="w-16 h-16 bg-point-yellow rounded-full shadow-lg flex items-center justify-center hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-dark-gray"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Diary Modal -->
    <div v-if="showDiaryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-4 bg-yellow-200 rounded-t-lg">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">{{ selectedDate }}</h2>
            <button @click="closeDiaryModal" class="text-gray-600 hover:text-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="p-4">
          <textarea
            v-model="diaryContent"
            class="w-full h-[400px] p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="오늘 아기와 함께한 특별한 순간을 기록해보세요..."
          ></textarea>
          <div class="flex justify-center mt-4">
            <button
              class="px-10 py-3 bg-point-yellow text-dark-gray rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 font-bold"
              @click="saveDiary"
            >
              저장하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <BottomNavBar active-tab="profile" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'

const router = useRouter()

const babyInfo = ref({ babyName: '' })
const diaryContent = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const showDiaryModal = ref(false)
const selectedDate = ref('')

// 받침 유무를 확인하는 함수
const hasJongseong = (str) => {
  if (!str) return false
  const lastChar = str[str.length - 1]
  return (lastChar.charCodeAt(0) - 0xAC00) % 28 > 0
}

// 조사 선택 함수
const getJosa = (word, josa1, josa2) => {
  return hasJongseong(word) ? josa1 : josa2
}

const calendarOptions = {
  plugins: [dayGridPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: ''
  },
  locale: 'ko',
  height: 'auto',
  events: [],
  dayHeaderFormat: { weekday: 'short' },
  dayCellContent: (arg) => {
    return arg.dayNumberText.replace('일', '')
  },
  eventClick: (info) => {
    selectedDate.value = info.dateStr
    showDiaryModal.value = true
    loadDiaryContent(info.dateStr)
  },
  dateClick: (info) => {
    selectedDate.value = info.dateStr
    showDiaryModal.value = true
    loadDiaryContent(info.dateStr)
  },
  displayEventTime: false,
  firstDay: 1,  // 월요일부터 시작
  fixedWeekCount: false,
  showNonCurrentDates: true,  // 현재 달이 아닌 날짜도 표시
  selectable: true,  // 날짜 선택 가능
  selectMirror: true,
  dayMaxEvents: true,
  eventDisplay: 'background'  // 이벤트를 배경으로 표시
}

const getFormattedDate = (dateStr) => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${month}.${day}(${weekDay})`
}

// 임신 정보 불러오기
const fetchBabyInfo = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/accounts/pregnancies/')
    if (response.data && response.data.length > 0) {
      const pregnancy = response.data[0]
      babyInfo.value.babyName = pregnancy.baby_name || '아기'
      console.log('태명:', babyInfo.value.babyName) // 디버깅용 로그 추가
    } else {
      babyInfo.value.babyName = '아기'
    }
  } catch (error) {
    console.error('임신 정보 불러오기 실패:', error)
    babyInfo.value.babyName = '아기'
    errorMessage.value = '정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 일기 내용 불러오기
const loadDiaryContent = async (date) => {
  try {
    const response = await api.get(`/diaries/${date}/`, {
      params: {
        type: 'baby'
      }
    })
    diaryContent.value = response.data.content
  } catch (error) {
    console.log('해당 날짜의 일기가 없거나 불러오기 실패')
    diaryContent.value = ''
  }
}

// 일기 작성된 날짜 불러오기
const loadDiaryDates = async () => {
  try {
    const response = await api.get('/diaries/', {
      params: {
        type: 'baby'
      }
    })
    if (response.data) {
      calendarOptions.events = response.data.map(diary => ({
        date: diary.date,
        display: 'background',
        backgroundColor: '#FFED90',
        textColor: '#353535',
        title: '♥'
      }))
    }
  } catch (error) {
    console.error('일기 날짜 불러오기 실패:', error)
  }
}

const closeDiaryModal = () => {
  showDiaryModal.value = false
  diaryContent.value = ''
}

const saveDiary = async () => {
  try {
    console.log('저장 시도:', {
      date: selectedDate.value,
      content: diaryContent.value,
      type: 'baby'
    })
    
    const response = await api.post('/diaries/', {
      date: selectedDate.value,
      content: diaryContent.value,
      type: 'baby'
    })
    
    console.log('저장 응답:', response)
    
    if (response.status === 201 || response.status === 200) {
      alert('일기가 저장되었습니다.')
      closeDiaryModal()
      await loadDiaryDates()
    } else {
      throw new Error('저장 실패: ' + response.status)
    }
  } catch (error) {
    console.error('저장 실패 상세:', error)
    console.error('에러 응답:', error.response?.data)
    alert('일기 저장에 실패했습니다. 다시 시도해주세요.')
  }
}

const openTodayDiary = () => {
  const today = new Date().toISOString().split('T')[0]
  selectedDate.value = today
  showDiaryModal.value = true
  loadDiaryContent(today)
}

onMounted(async () => {
  await fetchBabyInfo()
  await loadDiaryDates()
})
</script>

<style scoped>
.bg-yellow-50 {
  background-color: #FFFAE0;
}
.bg-yellow-200 {
  background-color: #FFED90;
}
.text-dark-gray {
  color: #353535;
}

textarea {
  font-family: inherit;
  line-height: 1.6;
}

textarea::placeholder {
  color: #9CA3AF;
}

:deep(.fc) {
  font-family: inherit;
  height: auto !important;
}

:deep(.fc-view) {
  height: auto !important;
}

:deep(.fc-scrollgrid) {
  height: auto !important;
}

:deep(.fc-daygrid-body) {
  height: auto !important;
}

:deep(.fc-daygrid-day) {
  height: auto !important;
  cursor: pointer !important;
}

:deep(.fc-daygrid-day-number) {
  font-size: 1em;
  padding: 4px;
  color: #353535 !important;
}

:deep(.fc-daygrid-day.fc-day-today) {
  background-color: #FFFAE0 !important;
}

:deep(.fc-daygrid-day.fc-day-today .fc-daygrid-day-number) {
  color: #353535 !important;
}

:deep(.fc-toolbar) {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

:deep(.fc-toolbar-title) {
  font-size: 1.2em;
  font-weight: bold;
  text-align: center;
  flex: 1;
}

:deep(.fc-button-group) {
  position: absolute;
  left: 1rem;
}

:deep(.fc-event) {
  cursor: pointer;
  font-size: 1.2em;
  padding: 2px;
  background-color: #FFED90 !important;
  border-color: #FFED90 !important;
}

:deep(.fc-event-title) {
  font-weight: bold;
  color: #353535 !important;
}

:deep(.fc-button) {
  background-color: #FFED90 !important;
  border-color: #FFED90 !important;
  color: #353535 !important;
}

:deep(.fc-button:hover) {
  background-color: #FFD600 !important;
  border-color: #FFD600 !important;
}

:deep(.fc-today) {
  background-color: #FFFAE0 !important;
}
</style> 