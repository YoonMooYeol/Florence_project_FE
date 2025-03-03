import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 캘린더 스토어 정의
export const useCalendarStore = defineStore('calendar', () => {
  // 상태 (state)
  const events = ref([
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
  ])

  // LLM 대화 요약 데이터
  const llmSummaries = ref([
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
  ])

  // 현재 표시 중인 년월
  const currentYear = ref(2025)
  const currentMonth = ref(3)

  // 선택된 날짜 및 이벤트
  const selectedDate = ref(null)
  const selectedEvent = ref(null)
  const selectedLLMSummary = ref(null)

  // 액션 (actions)
  function addEvent(newEvent) {
    // 새 ID 생성 (실제 구현에서는 서버에서 ID를 받아올 수 있음)
    const newId = String(Math.max(...events.value.map(e => Number(e.id))) + 1)
    const eventWithId = { ...newEvent, id: newId }
    events.value.push(eventWithId)
    return eventWithId
  }

  function updateEvent(updatedEvent) {
    const index = events.value.findIndex(e => e.id === updatedEvent.id)
    if (index !== -1) {
      events.value[index] = { ...updatedEvent }
      return true
    }
    return false
  }

  function deleteEvent(eventId) {
    const index = events.value.findIndex(e => e.id === eventId)
    if (index !== -1) {
      events.value.splice(index, 1)
      return true
    }
    return false
  }

  function addLLMSummary(newSummary) {
    llmSummaries.value.push(newSummary)
  }

  function deleteLLMSummary(date) {
    const index = llmSummaries.value.findIndex(s => s.date === date)
    if (index !== -1) {
      llmSummaries.value.splice(index, 1)
      return true
    }
    return false
  }

  function setSelectedDate(date) {
    console.log('calendarStore: 선택된 날짜 설정:', date)
    selectedDate.value = date
  }

  function setSelectedEvent(event) {
    console.log('calendarStore: 선택된 일정 설정:', event)
    selectedEvent.value = event
  }

  function setSelectedLLMSummary(summary) {
    console.log('calendarStore: 선택된 LLM 요약 설정:', summary)
    selectedLLMSummary.value = summary
  }

  function updateCurrentYearMonth(year, month) {
    currentYear.value = year
    currentMonth.value = month
  }

  // 게터 (getters)
  const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) return []
    
    return events.value.filter(event => {
      const eventDate = new Date(event.start)
      const clickedDate = new Date(selectedDate.value)
      return eventDate.getFullYear() === clickedDate.getFullYear() &&
             eventDate.getMonth() === clickedDate.getMonth() &&
             eventDate.getDate() === clickedDate.getDate()
    })
  })

  const llmSummaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    
    // 날짜 형식 정규화 (YYYY-MM-DD)
    const formattedDate = selectedDate.value.split('T')[0]
    return llmSummaries.value.find(summary => summary.date === formattedDate)
  })

  const hasLLMSummary = (dateStr) => {
    // 날짜 문자열 정규화 (YYYY-MM-DD 형식으로)
    const formattedDate = dateStr.split('T')[0]
    return llmSummaries.value.some(summary => summary.date === formattedDate)
  }

  return {
    // 상태
    events,
    llmSummaries,
    currentYear,
    currentMonth,
    selectedDate,
    selectedEvent,
    selectedLLMSummary,
    
    // 액션
    addEvent,
    updateEvent,
    deleteEvent,
    addLLMSummary,
    deleteLLMSummary,
    setSelectedDate,
    setSelectedEvent,
    setSelectedLLMSummary,
    updateCurrentYearMonth,
    
    // 게터
    eventsForSelectedDate,
    llmSummaryForSelectedDate,
    hasLLMSummary
  }
}) 