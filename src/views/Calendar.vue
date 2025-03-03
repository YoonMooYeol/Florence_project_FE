<script setup>
import { ref, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

// 한국어 로케일 설정
const koLocale = {
  code: 'ko',
  buttonText: {
    prev: '이전',
    next: '다음',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    list: '일정목록'
  },
  weekText: '주',
  allDayText: '종일',
  moreLinkText: '개 더보기',
  noEventsText: '일정이 없습니다'
}

// 샘플 이벤트 데이터 (정적 데이터)
const events = [
  {
    id: '1',
    title: '운동',
    start: '2025-03-12T10:00:00',
    end: '2025-03-12T12:00:00',
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  },
  {
    id: '2',
    title: '약 복용',
    start: '2025-03-15T14:00:00',
    end: '2025-03-15T15:30:00',
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  },
  {
    id: '3',
    title: '병원 방문',
    start: '2025-03-18',
    allDay: true,
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  },
  {
    id: '4',
    title: '혈압 측정',
    start: '2025-03-22T13:00:00',
    end: '2025-03-22T14:30:00',
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  },
  {
    id: '5',
    title: '건강검진',
    start: '2025-03-28T09:00:00',
    end: '2025-03-28T18:00:00',
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
    textColor: '#353535',
    display: 'block'
  }
]

// 이벤트 데이터를 반응형으로 변경
const eventsData = ref([...events])

// LLM 대화 요약 샘플 데이터
const llmSummaries = [
  {
    date: '2025-03-12',
    summary: '오늘의 건강 상태가 양호하여 운동 강도를 올려보기로 했습니다. 유산소 운동 30분, 근력 운동 20분을 권장받았습니다.'
  },
  {
    date: '2025-03-15',
    summary: '약 복용 후 부작용이 있는지 확인했습니다. 특별한 이상 증상은 없었고, 계속해서 처방된 약을 복용하기로 했습니다.'
  },
  {
    date: '2025-03-22',
    summary: '최근 혈압이 약간 높아져 식이요법과 가벼운 운동을 통해 관리하기로 했습니다. 저염식 식단과 매일 30분 걷기를 추천받았습니다.'
  }
]

// 모달 관련 상태
const showModal = ref(false)
const showAddEventModal = ref(false)
const showEventDetailModal = ref(false)
const showLLMDetailModal = ref(false)
const selectedDate = ref(null)
const selectedDateEvents = ref([])
const selectedDateLLMSummary = ref(null)
const selectedEvent = ref(null)
const selectedLLMSummary = ref(null)

// 날짜 클릭 핸들러
const handleDateClick = (info) => {
  selectedDate.value = info.dateStr
  
  // 디버깅 로그 추가
  console.log(`클릭한 날짜: ${info.dateStr}`)
  console.log(`날짜 객체 정보:`, info.date)
  
  // 선택한 날짜의 이벤트 필터링
  selectedDateEvents.value = eventsData.value.filter(event => {
    const eventDate = new Date(event.start)
    const clickedDate = new Date(info.dateStr)
    return eventDate.getFullYear() === clickedDate.getFullYear() &&
           eventDate.getMonth() === clickedDate.getMonth() &&
           eventDate.getDate() === clickedDate.getDate()
  })
  
  // 선택한 날짜의 LLM 요약 불러오기 (날짜 형식 정규화)
  const formattedDate = info.dateStr.split('T')[0]
  selectedDateLLMSummary.value = llmSummaries.find(summary => summary.date === formattedDate)
  console.log(`날짜 클릭: ${formattedDate}, LLM 요약 존재: ${!!selectedDateLLMSummary.value}`)
  
  showModal.value = true
}

// 이벤트 클릭 핸들러
const handleEventClick = (info) => {
  const eventId = info.event.id
  const eventObj = eventsData.value.find(e => e.id === eventId)
  if (eventObj) {
    const dateStr = new Date(eventObj.start).toISOString().split('T')[0]
    selectedDate.value = dateStr
    selectedDateEvents.value = [eventObj]
    
    // 선택한 날짜의 LLM 요약 불러오기
    selectedDateLLMSummary.value = llmSummaries.find(summary => summary.date === dateStr)
    console.log(`이벤트 클릭: ${dateStr}, LLM 요약 존재: ${!!selectedDateLLMSummary.value}`)
    
    showModal.value = true
  }
}

// 모달 닫기
const closeModal = () => {
  showModal.value = false
}

// 일정 등록 모달 열기
const openAddEventModal = () => {
  showModal.value = false
  showAddEventModal.value = true
}

// 일정 등록 모달 닫기
const closeAddEventModal = () => {
  showAddEventModal.value = false
}

// 일정 상세 모달 열기
const openEventDetailModal = (event) => {
  selectedEvent.value = event
  showEventDetailModal.value = true
}

// 일정 상세 모달 닫기
const closeEventDetailModal = () => {
  showEventDetailModal.value = false
}

// LLM 대화 요약 상세 모달 열기
const openLLMDetailModal = (summary) => {
  selectedLLMSummary.value = summary
  showLLMDetailModal.value = true
}

// LLM 대화 요약 상세 모달 닫기
const closeLLMDetailModal = () => {
  showLLMDetailModal.value = false
}

// 날짜 포맷 함수
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

// 시간 포맷 함수
const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// LLM 요약이 있는 날짜인지 확인하는 함수
const hasLLMSummary = (dateStr) => {
  // 날짜 문자열 정규화 (YYYY-MM-DD 형식으로)
  const formattedDate = dateStr.split('T')[0]
  
  // 디버깅 로그 추가
  const hasSummary = llmSummaries.some(summary => summary.date === formattedDate)
  console.log(`체크된 날짜: ${formattedDate}, LLM 요약 존재: ${hasSummary}, 요약 목록:`, llmSummaries.map(s => s.date))
  
  return hasSummary
}

// 날짜 셀 컨텐츠 렌더링
const dayCellContent = (info) => {
  // Date 객체를 YYYY-MM-DD 형식 문자열로 변환 - 타임존 고려
  const localDate = new Date(
    info.date.getFullYear(),
    info.date.getMonth(),
    info.date.getDate()
  )
  
  // YYYY-MM-DD 형식으로 변환
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  
  // 디버깅 로그 추가 - 콘솔 과부하 방지를 위해 특정 날짜만 로깅
  if (dateStr === '2023-05-22' || dateStr === '2023-05-23') {
    console.log(`셀 렌더링: ${dateStr}, 텍스트: ${info.dayNumberText}, LLM 요약 존재: ${hasLLMSummary(dateStr)}`)
  }
  
  // 날짜 텍스트에서 '일' 제거
  const dayNumber = info.dayNumberText.replace('일', '')
  
  // LLM 요약 존재 여부 확인
  const hasLLM = hasLLMSummary(dateStr)
  
  return {
    html: `
      <div class="day-cell-content">
        <span class="fc-daygrid-day-number">${dayNumber}</span>
        ${hasLLM ? '<span class="llm-indicator">•</span>' : ''}
      </div>
    `
  }
}

// 캘린더 옵션
const calendarOptions = ref({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: false, // 기본 헤더 숨기기 (커스텀 헤더 사용)
  height: 'auto',
  fixedWeekCount: false, // 월에 따라 주 수 조정
  selectable: true, // 선택 기능 활성화
  dayMaxEvents: 2, // 최대 표시 이벤트 수
  eventDisplay: 'block', // 'auto'에서 다시 'block'으로 변경
  displayEventTime: false, // 이벤트 시간 표시 안함
  eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
  firstDay: 0, // 일요일부터 시작
  dayHeaderFormat: { weekday: 'short' }, // 요일 포맷
  dayCellContent: dayCellContent,
  // 이벤트 표시 관련 설정 추가
  nextDayThreshold: '23:59:59', // 자정에 가까운 이벤트는 다음 날로 표시하지 않음
  eventDurationEditable: false, // 이벤트 기간 편집 비활성화
  eventContent: (arg) => {
    // 이벤트 콘텐츠 커스텀 렌더링
    return {
      html: `<div class="custom-event-content">${arg.event.title}</div>`
    }
  },
  locales: [koLocale],
  locale: 'ko',
  events: eventsData, // 반응형 이벤트 데이터 사용
  initialDate: '2025-03-15', // 초기 표시 날짜를 2025년 3월로 변경
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  datesSet: (dateInfo) => {
    // 날짜 변경 시 현재 표시 중인 년월 업데이트
    currentYear.value = dateInfo.view.currentStart.getFullYear()
    currentMonth.value = dateInfo.view.currentStart.getMonth() + 1
  }
})

// 현재 표시할 년월 (초기값을 2025년 3월로 변경)
const currentYear = ref(2025)
const currentMonth = ref(3)

// 요일 배열
const weekdays = ['일', '월', '화', '수', '목', '금', '토']

// 캘린더 참조
const calendarRef = ref(null)

// 현재 표시 중인 날짜 정보 업데이트 함수
const updateCurrentDate = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    const currentDate = calendarApi.getDate()
    currentYear.value = currentDate.getFullYear()
    currentMonth.value = currentDate.getMonth() + 1 // JavaScript의 월은 0부터 시작하므로 +1
  }
}

// 컴포넌트 마운트 시 현재 날짜 정보 초기화
onMounted(() => {
  // 약간의 지연을 두고 초기화 (캘린더가 완전히 렌더링된 후)
  setTimeout(() => {
    updateCurrentDate()
  }, 100)
})

// 이전 달로 이동
const prevMonth = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.prev() // FullCalendar API를 사용하여 이전 달로 이동
    updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
  }
}

// 다음 달로 이동
const nextMonth = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.next() // FullCalendar API를 사용하여 다음 달로 이동
    updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
  }
}

// 오늘 날짜로 이동
const goToToday = () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.today() // FullCalendar API를 사용하여 오늘 날짜로 이동
    updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
  }
}

// 일정 삭제 함수
const deleteEvent = (eventId) => {
  // 실제 구현에서는 API 호출 등을 통해 서버에서 삭제
  // 현재는 클라이언트 측에서만 삭제 처리
  const index = eventsData.value.findIndex(e => e.id === eventId)
  if (index !== -1) {
    // 이벤트 배열에서 삭제
    eventsData.value.splice(index, 1)
    
    // 현재 선택된 날짜의 이벤트 목록에서도 삭제
    selectedDateEvents.value = selectedDateEvents.value.filter(e => e.id !== eventId)
    
    // 모달 닫기
    closeEventDetailModal()
    
    // 캘린더 새로고침 (이벤트 변경 반영)
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.refetchEvents()
    }
    
    // 선택된 날짜에 이벤트가 없으면 일정 모달도 닫기
    if (selectedDateEvents.value.length === 0) {
      closeModal()
    }
  }
}

// 대화 요약 삭제 함수
const deleteLLMSummary = (date) => {
  // 실제 구현에서는 API 호출 등을 통해 서버에서 삭제
  // 현재는 클라이언트 측에서만 삭제 처리
  const index = llmSummaries.findIndex(s => s.date === date)
  if (index !== -1) {
    // 요약 배열에서 삭제
    llmSummaries.splice(index, 1)
    
    // 현재 선택된 날짜의 요약 초기화
    if (selectedDateLLMSummary.value && selectedDateLLMSummary.value.date === date) {
      selectedDateLLMSummary.value = null
    }
    
    // 모달 닫기
    closeLLMDetailModal()
    
    // 캘린더 새로고침 (LLM 표시 변경 반영)
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.render()
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 상단 헤더 -->
    <div class="pt-6 pb-4 px-6 border-b border-gray-200 bg-base">
      <h1 class="text-xl font-bold text-center text-dark-gray mb-4">캘린더</h1>
      
      <!-- 월 네비게이션 -->
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="text-dark-gray px-2 py-1 rounded hover:bg-ivory">
          <span class="text-lg">◀</span>
        </button>
        <div class="flex items-center">
          <span class="text-center text-lg font-bold text-dark-gray">{{ currentYear }}년 {{ currentMonth }}월</span>
          <button @click="goToToday" class="ml-2 text-sm bg-point text-dark-gray px-2 py-1 rounded hover:bg-yellow-500 transition-colors">
            오늘
          </button>
        </div>
        <button @click="nextMonth" class="text-dark-gray px-2 py-1 rounded hover:bg-ivory">
          <span class="text-lg">▶</span>
        </button>
      </div>
      
      <!-- 요일 헤더 -->
      <div class="grid grid-cols-7 text-center mb-2">
        <div v-for="(day, index) in weekdays" :key="index" 
             :class="[
               'py-1 text-sm font-bold', 
               index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-dark-gray'
             ]">
          {{ day }}
        </div>
      </div>
    </div>
    
    <!-- 캘린더 -->
    <div class="px-4 pb-24 pt-2 bg-ivory">
      <FullCalendar 
        ref="calendarRef"
        :options="calendarOptions"
      />
    </div>
    
    <!-- 하단 네비게이션 바 -->
    <div class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around shadow-md">
      <button class="p-2 flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-dark-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="text-xs text-dark-gray mt-1">홈</span>
      </button>
      
      <button class="p-2 flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-dark-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="text-xs text-dark-gray mt-1">마이페이지</span>
      </button>
      
      <button class="p-2 flex flex-col items-center justify-center relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-point" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="text-xs text-point font-bold mt-1">캘린더</span>
      </button>
      
      <button class="p-2 flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-dark-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span class="text-xs text-dark-gray mt-1">채팅</span>
      </button>
    </div>
    
    <!-- 추가 버튼 (우측 하단 고정) - 시각적 요소만 -->
    <button 
      class="fixed right-6 bottom-20 w-14 h-14 rounded-full bg-point flex items-center justify-center shadow-lg hover:bg-yellow-500 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-dark-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>
    
    <!-- 일일 일정 모달 -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
        <!-- 모달 헤더 -->
        <div class="bg-point px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-bold text-dark-gray">{{ selectedDate ? formatDate(selectedDate) : '' }}</h3>
          <button @click="closeModal" class="text-dark-gray hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 모달 내용 -->
        <div class="p-6 bg-ivory">
          <!-- 일정 섹션 -->
          <div class="mb-6">
            <h4 class="text-md font-bold text-dark-gray mb-3">일정</h4>
            <div v-if="selectedDateEvents.length === 0" class="text-center py-4 text-gray-500">
              이 날짜에 등록된 일정이 없습니다.
            </div>
            <div v-else>
              <div 
                v-for="event in selectedDateEvents" 
                :key="event.id" 
                class="mb-4 p-4 bg-white rounded-xl shadow-sm border-l-4 border-point cursor-pointer hover:shadow-md transition-shadow"
                @click="openEventDetailModal(event)"
              >
                <div class="flex justify-between items-start">
                  <div class="font-bold text-dark-gray text-lg mb-2">{{ event.title }}</div>
                  <div class="bg-point text-dark-gray text-xs px-2 py-1 rounded-full">
                    {{ event.allDay ? '종일' : formatTime(event.start) }}
                  </div>
                </div>
                <div v-if="!event.allDay" class="text-sm text-gray-600 mt-2">
                  {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- LLM 대화 요약 섹션 -->
          <div>
            <h4 class="text-md font-bold text-dark-gray mb-3">대화 요약</h4>
            <div v-if="!selectedDateLLMSummary" class="text-center py-4 text-gray-500">
              이 날짜에 대화 내용이 없습니다.
            </div>
            <div 
              v-else 
              class="p-4 bg-white rounded-xl shadow-sm border-l-4 border-blue-400 cursor-pointer hover:shadow-md transition-shadow"
              @click="openLLMDetailModal(selectedDateLLMSummary)"
            >
              <div class="flex justify-between items-start mb-2">
                <div class="font-bold text-dark-gray text-lg">대화 요약</div>
                <div class="bg-blue-400 text-white text-xs px-2 py-1 rounded-full">
                  AI
                </div>
              </div>
              <p class="text-sm text-gray-600">{{ selectedDateLLMSummary.summary }}</p>
            </div>
          </div>
        </div>
        
        <!-- 모달 푸터 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button @click="openAddEventModal" class="px-4 py-2 bg-point text-dark-gray rounded-full hover:bg-yellow-500 transition-colors font-medium">
            일정등록
          </button>
        </div>
      </div>
    </div>
    
    <!-- 일정 상세 모달 -->
    <div v-if="showEventDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
        <!-- 모달 헤더 -->
        <div class="bg-point px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-bold text-dark-gray">일정 상세</h3>
          <button @click="closeEventDetailModal" class="text-dark-gray hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 모달 내용 -->
        <div class="p-6 bg-ivory">
          <div v-if="selectedEvent" class="space-y-4">
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">일정 제목</h4>
              <p class="text-lg font-bold text-dark-gray">{{ selectedEvent.title }}</p>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">날짜</h4>
              <p class="text-dark-gray">{{ formatDate(selectedEvent.start) }}</p>
            </div>
            
            <div v-if="!selectedEvent.allDay">
              <h4 class="text-sm font-medium text-gray-500 mb-1">시간</h4>
              <p class="text-dark-gray">{{ formatTime(selectedEvent.start) }} - {{ formatTime(selectedEvent.end) }}</p>
            </div>
            
            <div v-else>
              <h4 class="text-sm font-medium text-gray-500 mb-1">시간</h4>
              <p class="text-dark-gray">종일</p>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">메모</h4>
              <p class="text-dark-gray bg-white p-3 rounded-lg border border-gray-200">
                일정에 관한 상세 메모가 여기에 표시됩니다. 현재는 샘플 데이터만 있어 메모 내용이 없습니다.
              </p>
            </div>
          </div>
        </div>
        
        <!-- 모달 푸터 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button 
            @click="deleteEvent(selectedEvent.id)" 
            class="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
    
    <!-- LLM 대화 요약 상세 모달 -->
    <div v-if="showLLMDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
        <!-- 모달 헤더 -->
        <div class="bg-blue-400 px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">대화 요약 상세</h3>
          <button @click="closeLLMDetailModal" class="text-white hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 모달 내용 -->
        <div class="p-6 bg-ivory">
          <div v-if="selectedLLMSummary" class="space-y-4">
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">날짜</h4>
              <p class="text-dark-gray">{{ formatDate(selectedLLMSummary.date) }}</p>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">대화 요약</h4>
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <p class="text-dark-gray">{{ selectedLLMSummary.summary }}</p>
              </div>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-1">AI 추천 사항</h4>
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <ul class="list-disc pl-5 text-dark-gray space-y-2">
                  <li>규칙적인 약 복용을 계속 유지하세요.</li>
                  <li>부작용이 없다면 현재 처방대로 계속 진행하는 것이 좋습니다.</li>
                  <li>다음 병원 방문 시 의사에게 현재 상태를 자세히 알려주세요.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 모달 푸터 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button 
            @click="deleteLLMSummary(selectedLLMSummary.date)" 
            class="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
    
    <!-- 일정 등록 모달 -->
    <div v-if="showAddEventModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
        <!-- 모달 헤더 -->
        <div class="bg-point px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-bold text-dark-gray">일정 등록</h3>
          <button @click="closeAddEventModal" class="text-dark-gray hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- 모달 내용 -->
        <div class="p-6 bg-ivory">
          <!-- 일정 제목 입력 -->
          <div class="mb-4">
            <label for="event-title" class="block text-dark-gray font-medium mb-2">일정 제목</label>
            <input type="text" id="event-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point" placeholder="일정 제목을 입력하세요">
          </div>
          
          <!-- 날짜 선택 -->
          <div class="mb-4">
            <label for="event-date" class="block text-dark-gray font-medium mb-2">날짜</label>
            <input type="date" id="event-date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point" :value="selectedDate">
          </div>
          
          <!-- 시간 선택 -->
          <div class="mb-4">
            <div class="flex items-center mb-2">
              <input type="checkbox" id="all-day" class="mr-2">
              <label for="all-day" class="text-dark-gray font-medium">종일</label>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="start-time" class="block text-dark-gray font-medium mb-2">시작 시간</label>
                <input type="time" id="start-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point">
              </div>
              <div>
                <label for="end-time" class="block text-dark-gray font-medium mb-2">종료 시간</label>
                <input type="time" id="end-time" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point">
              </div>
            </div>
          </div>
          
          <!-- 알림 설정 -->
          <div class="mb-4">
            <label for="notification" class="block text-dark-gray font-medium mb-2">알림</label>
            <select id="notification" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point">
              <option value="none">알림 없음</option>
              <option value="10min">10분 전</option>
              <option value="30min">30분 전</option>
              <option value="1hour">1시간 전</option>
              <option value="1day">1일 전</option>
            </select>
          </div>
          
          <!-- 메모 입력 -->
          <div class="mb-4">
            <label for="event-memo" class="block text-dark-gray font-medium mb-2">메모</label>
            <textarea id="event-memo" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point h-24" placeholder="메모를 입력하세요"></textarea>
          </div>
        </div>
        
        <!-- 모달 푸터 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button @click="closeAddEventModal" class="px-4 py-2 bg-white text-dark-gray border border-gray-300 rounded-full mr-2 hover:bg-gray-100 transition-colors font-medium">
            취소
          </button>
          <button class="px-4 py-2 bg-point text-dark-gray rounded-full hover:bg-yellow-500 transition-colors font-medium">
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 색상 변수 */
:root {
  --color-base: #FFED90;
  --color-white: #FFFFFF;
  --color-dark-gray: #353535;
  --color-ivory: #FFFAE0;
  --color-point: #FFD600;
}

/* 커스텀 색상 클래스 */
.bg-base { background-color: #FFED90; }
.bg-ivory { background-color: #FFFAE0; }
.bg-point { background-color: #FFD600; }
.text-dark-gray { color: #353535; }
.text-point { color: #FFD600; }

/* FullCalendar 커스텀 스타일 */
:deep(.fc) {
  font-family: 'Noto Sans KR', 'Roboto', sans-serif;
  border: none;
}

:deep(.fc-day-today) {
  background-color: rgba(255, 214, 0, 0.1) !important;
}

/* 이벤트 스타일 개선 */
:deep(.fc-daygrid-event) {
  border-radius: 4px !important;
  padding: 2px 6px !important;
  font-size: 0.8rem !important;
  cursor: pointer !important;
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 90% !important;
  display: block !important;
  text-align: center !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  height: auto !important;
  min-height: 22px !important;
}

/* 커스텀 이벤트 콘텐츠 스타일 */
:deep(.custom-event-content) {
  font-size: 0.8rem;
  font-weight: 500;
  color: #353535;
  text-align: center;
  width: 100%;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

:deep(.fc-h-event) {
  background-color: #FFD600 !important;
  border-color: #FFD600 !important;
  color: #353535 !important;
  border-width: 0 !important;
  border-left-width: 0 !important;
  height: auto !important;
}

/* 이벤트 메인 컨텐츠 스타일 */
:deep(.fc-event-main) {
  padding: 1px 3px !important;
  display: block !important;
  text-align: center !important;
  color: #353535 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}

/* 이벤트 컨테이너 스타일 개선 */
:deep(.fc-daygrid-event-harness) {
  margin: 1px 0 !important;
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  height: auto !important;
}

/* 날짜 바디 영역 조정 */
:deep(.fc-daygrid-day-events) {
  padding: 0 2px !important;
  margin-top: 2px !important;
  flex-grow: 1 !important;
  width: 100% !important;
  min-height: 25px !important;
}

/* 종일 이벤트 스타일 */
:deep(.fc-daygrid-block-event) {
  margin: 2px 0 !important;
  width: 90% !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

/* dot 이벤트 스타일 숨기기 및 변환 */
:deep(.fc-daygrid-dot-event) {
  display: block !important;
  padding: 2px 6px !important;
  background-color: #FFD600 !important;
  border-color: #FFD600 !important;
}

:deep(.fc-daygrid-dot-event .fc-event-title) {
  font-weight: 500 !important;
  flex-grow: 1 !important;
  display: block !important;
  color: #353535 !important;
}

/* 다른 월의 날짜 스타일 */
:deep(.fc-day-other) {
  opacity: 0.4;
  background-color: rgba(0, 0, 0, 0.02) !important;
}

/* 이벤트 "더보기" 링크 스타일 */
:deep(.fc-daygrid-more-link) {
  font-size: 0.8rem !important;
  color: #3182ce !important;
  font-weight: 500 !important;
  margin: 0 auto !important;
  display: block !important;
  text-align: center !important;
}

/* 툴바 스타일 */
:deep(.fc-toolbar-title) {
  font-size: 1.2rem;
  font-weight: 700;
}

:deep(.fc-button) {
  background-color: #FFD600;
  border-color: #FFD600;
  color: #353535;
}

:deep(.fc-button:hover) {
  background-color: #e6c200;
  border-color: #e6c200;
}

:deep(.fc-button-active) {
  background-color: #ccad00 !important;
  border-color: #ccad00 !important;
}

/* 요일 헤더 숨기기 (커스텀 헤더 사용) */
:deep(.fc-col-header) {
  display: none;
}

/* 날짜 셀 스타일 */
:deep(.fc-daygrid-day) {
  border: none !important;
  background-color: transparent;
  cursor: pointer;
}

:deep(.fc-daygrid-day-frame) {
  padding: 2px;
  border-radius: 8px;
  min-height: 80px;
}

/* 날짜 상단 영역 스타일 강제 재정의 - 좌측 정렬 보장 */
:deep(.fc-daygrid-day-top) {
  justify-content: flex-start !important;
  flex-direction: row !important;
  padding: 2px 0 0 4px !important;
}

/* 날짜와 LLM 표시 컨테이너 스타일 */
:deep(.day-cell-content) {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: auto !important;
}

/* 날짜 셀 전체 구조 조정 */
:deep(.fc-daygrid-day-frame) {
  display: flex !important;
  flex-direction: column !important;
  padding: 2px !important;
}

/* 날짜 숫자 스타일 강제 재정의 */
:deep(.fc-daygrid-day-number) {
  font-size: 0.9rem !important;
  padding: 0 !important;
  color: #353535 !important;
  font-weight: 400 !important;
  text-align: left !important;
  position: static !important;
  width: auto !important;
  margin: 0 !important;
}

/* 요일별 날짜 색상 */
:deep(.fc-day-sun .fc-daygrid-day-number) {
  color: #e53e3e !important;
}

:deep(.fc-day-sat .fc-daygrid-day-number) {
  color: #3182ce !important;
}

/* LLM 요약 표시 스타일 */
:deep(.llm-indicator) {
  font-size: 1rem !important;
  color: #3182ce !important;
  font-weight: 800 !important;
  margin-left: 2px !important;
  display: inline !important;
}

/* a 태그 인라인 스타일 강제 적용 */
:deep(.fc a) {
  text-decoration: none !important;
  min-width: auto !important;
  display: inline !important;
}

/* 특별히 날짜 셀의 패딩을 더 명시적으로 설정 */
:deep(.fc .fc-daygrid-day-top a) {
  display: inline !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style> 