import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate, isSameDay } from '@/utils/dateUtils'
import api from '@/utils/axios'

// 캘린더 스토어 정의
export const useCalendarStore = defineStore('calendar', () => {
  // 상태 (state)
  const events = ref(JSON.parse(localStorage.getItem('calendar_events') || '[]'))

  // LLM 대화 요약 데이터
  const llmSummaries = ref([])

  // 아기 일기 데이터
  const babyDiaries = ref([])

  // 현재 표시 중인 년월
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  // 선택된 날짜 및 이벤트
  const selectedDate = ref(null)
  const selectedEvent = ref(null)
  const selectedLLMSummary = ref(null)
  const selectedBabyDiary = ref(null)
  const isPregnant = ref(false)
  const babyNickname = ref('')
  const isLoading = ref(false)
  const error = ref(null)

  // 액션 (actions)
  function addEvent (newEvent) {
    console.log('캘린더 스토어: 일정 추가 시도', newEvent)
    
    try {
      // 새 ID 생성
      const newId = String(Math.max(...events.value.map(e => Number(e.id)), 0) + 1)
      const eventWithId = { 
        ...newEvent, 
        id: newId,
        backgroundColor: '#FFD600',
        borderColor: '#FFD600',
        textColor: '#353535',
        display: 'block'
      }

      // 반복 일정인 경우 처리
      if (eventWithId.recurring && eventWithId.recurring !== 'none') {
        console.log('캘린더 스토어: 반복 일정 생성 시작', eventWithId)
        const recurringEvents = generateRecurringEvents(eventWithId)
        console.log('캘린더 스토어: 생성된 반복 일정', recurringEvents)
        
        if (recurringEvents.length > 0) {
          events.value.push(...recurringEvents)
          console.log('캘린더 스토어: 반복 일정 추가 완료', events.value)
          return eventWithId
        }
        return null
      }

      // 일반 일정인 경우
      console.log('캘린더 스토어: 일반 일정 추가')
      events.value.push(eventWithId)
      return eventWithId
    } catch (error) {
      console.error('일정 추가 중 오류 발생:', error)
      return null
    }
  }

  // 반복 일정 생성 함수
  function generateRecurringEvents(baseEvent) {
    console.log('캘린더 스토어: 반복 일정 생성 함수 호출', baseEvent)
    const recurringEvents = []
    const startDate = new Date(baseEvent.start)
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1) // 1년치 일정 생성

    let currentDate = new Date(startDate)
    let count = 0
    const maxEvents = 365 // 최대 생성 개수 제한

    // 시작 요일, 일자, 월 저장
    const startDay = startDate.getDay() // 요일 (0-6, 0은 일요일)
    const startDayOfMonth = startDate.getDate() // 일
    const startMonth = startDate.getMonth() // 월 (0-11)

    while (currentDate <= endDate && count < maxEvents) {
      // 반복 유형에 따른 조건 체크
      let isValidDate = false
      switch (baseEvent.recurring) {
        case 'daily':
          isValidDate = true
          break
        case 'weekly':
          // 같은 요일인 경우만 생성
          isValidDate = currentDate.getDay() === startDay
          break
        case 'monthly':
          // 같은 일자인 경우만 생성
          isValidDate = currentDate.getDate() === startDayOfMonth
          break
        case 'yearly':
          // 같은 월, 같은 일자인 경우만 생성
          isValidDate = currentDate.getMonth() === startMonth && 
                       currentDate.getDate() === startDayOfMonth
          break
      }

      if (isValidDate) {
        const event = { 
          ...baseEvent,
          id: String(Math.max(...events.value.map(e => Number(e.id)), 0) + recurringEvents.length + 1)
        }
        
        if (baseEvent.allDay) {
          event.start = currentDate.toISOString().split('T')[0]
          event.end = currentDate.toISOString().split('T')[0]
        } else {
          const [startDate, startTime] = baseEvent.start.split('T')
          const [endDate, endTime] = baseEvent.end ? baseEvent.end.split('T') : [startDate, startTime]
          
          event.start = `${currentDate.toISOString().split('T')[0]}T${startTime}`
          event.end = `${currentDate.toISOString().split('T')[0]}T${endTime}`
        }

        console.log('캘린더 스토어: 반복 일정 생성', event)
        recurringEvents.push(event)
        count++
      }

      // 다음 날짜로 이동
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log('캘린더 스토어: 생성된 반복 일정 수', recurringEvents.length)
    return recurringEvents
  }

  // 특정 날짜까지의 반복 일정 유지 함수
  function deleteRecurringEventsUntil(eventId, untilDate) {
    console.log('특정 날짜까지 반복 일정 유지 함수 호출:', { eventId, untilDate })
    const baseEvent = events.value.find(e => e.id === eventId)
    
    if (!baseEvent) {
      console.error('기준 이벤트를 찾을 수 없음:', eventId)
      return false
    }

    if (!baseEvent.recurring || baseEvent.recurring === 'none') {
      console.log('반복 일정이 아님, 단일 일정 삭제')
      return deleteEvent(eventId)
    }

    try {
      console.log('삭제 전 이벤트 수:', events.value.length)
      const untilDateObj = new Date(untilDate)
      untilDateObj.setHours(23, 59, 59, 999)

      // 같은 제목과 반복 설정을 가진 이벤트 중 지정된 날짜 이후의 일정만 삭제
      events.value = events.value.filter(event => {
        if (event.title === baseEvent.title && event.recurring === baseEvent.recurring) {
          const eventDate = new Date(event.start)
          // 지정된 날짜까지의 일정은 유지
          return eventDate <= untilDateObj
        }
        return true
      })

      console.log('삭제 후 이벤트 수:', events.value.length)
      return true
    } catch (error) {
      console.error('반복 일정 삭제 중 오류:', error)
      return false
    }
  }

  // 반복 일정 삭제 함수
  function deleteRecurringEvents(eventId) {
    console.log('반복 일정 삭제 함수 호출:', eventId)
    const baseEvent = events.value.find(e => e.id === eventId)
    
    if (!baseEvent) {
      console.error('기준 이벤트를 찾을 수 없음:', eventId)
      return false
    }

    if (!baseEvent.recurring || baseEvent.recurring === 'none') {
      return deleteEvent(eventId)
    }

    try {
      console.log('삭제 전 이벤트 수:', events.value.length)
      // 같은 제목과 반복 설정을 가진 모든 이벤트 삭제
      events.value = events.value.filter(event => 
        !(event.title === baseEvent.title && 
          event.recurring === baseEvent.recurring)
      )
      console.log('삭제 후 이벤트 수:', events.value.length)
      return true
    } catch (error) {
      console.error('반복 일정 삭제 중 오류:', error)
      return false
    }
  }

  // 단일 일정 삭제 함수
  function deleteEvent(eventId) {
    console.log('단일 일정 삭제 함수 호출:', eventId)
    const index = events.value.findIndex(e => e.id === eventId)
    if (index !== -1) {
      events.value.splice(index, 1)
      console.log('일정 삭제 완료')
      return true
    }
    console.error('삭제할 일정을 찾을 수 없음:', eventId)
    return false
  }

  function updateEvent (updatedEvent) {
    const index = events.value.findIndex(e => e.id === updatedEvent.id)
    if (index !== -1) {
      events.value[index] = { ...updatedEvent }
      return true
    }
    return false
  }

  function addLLMSummary (newSummary) {
    llmSummaries.value.push(newSummary)
  }

  function deleteLLMSummary (date) {
    const index = llmSummaries.value.findIndex(s => s.date === date)
    if (index !== -1) {
      llmSummaries.value.splice(index, 1)
      return true
    }
    return false
  }

  function addBabyDiary (newDiary) {
    babyDiaries.value.push(newDiary)
  }

  function updateBabyDiary (date, content) {
    const index = babyDiaries.value.findIndex(d => d.date === date)
    if (index !== -1) {
      babyDiaries.value[index].content = content
      return true
    }
    return false
  }

  function deleteBabyDiary (date) {
    const index = babyDiaries.value.findIndex(d => d.date === date)
    if (index !== -1) {
      babyDiaries.value.splice(index, 1)
      return true
    }
    return false
  }

  function setSelectedDate (date) {
    console.log('calendarStore: 선택된 날짜 설정:', date)
    selectedDate.value = date
  }

  function setSelectedEvent (event) {
    console.log('calendarStore: 선택된 일정 설정:', event)
    selectedEvent.value = event
  }

  function setSelectedLLMSummary (summary) {
    console.log('calendarStore: 선택된 LLM 요약 설정:', summary)
    selectedLLMSummary.value = summary
  }

  function setSelectedBabyDiary (diary) {
    selectedBabyDiary.value = diary
  }

  function updateCurrentYearMonth (year, month) {
    console.log('calendarStore: 현재 년월 업데이트:', year, month)
    currentYear.value = year
    currentMonth.value = month
  }

  function setPregnancyInfo (isPregnantStatus, nickname) {
    isPregnant.value = isPregnantStatus
    babyNickname.value = nickname
  }

  // 받침 유무에 따라 적절한 조사 선택 함수
  function getJosa (word, josa1, josa2) {
    if (!word || word.length === 0) return josa1

    const charCode = word.charCodeAt(word.length - 1)
    if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
      return (charCode - 0xAC00) % 28 > 0 ? josa1 : josa2
    }
    return josa1
  }

  // 게터 (getters)
  const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) return []

    return events.value.filter(event => {
      const eventStartDate = event.start.split('T')[0]  // YYYY-MM-DD 형식으로 변환
      return eventStartDate === selectedDate.value
    })
  })

  const llmSummaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null

    // 날짜 형식 정규화 (YYYY-MM-DD)
    const formattedDate = normalizeDate(selectedDate.value)
    return llmSummaries.value.find(summary => summary.date === formattedDate)
  })

  const babyDiaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    const formattedDate = normalizeDate(selectedDate.value)
    return babyDiaries.value.find(diary => diary.date === formattedDate)
  })

  const hasLLMSummary = (dateStr) => {
    // 날짜 문자열 정규화 (YYYY-MM-DD 형식으로)
    const formattedDate = normalizeDate(dateStr)
    return llmSummaries.value.some(summary => summary.date === formattedDate)
  }

  const hasBabyDiary = (dateStr) => {
    const formattedDate = normalizeDate(dateStr)
    return babyDiaries.value.some(diary => diary.date === formattedDate)
  }

  // 아기 일기 관련 액션
  async function fetchBabyDiaries() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/baby-diaries/')
      babyDiaries.value = response.data
    } catch (err) {
      error.value = '아기 일기를 불러오는데 실패했습니다.'
      console.error('아기 일기 조회 오류:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchBabyDiaryByDate(date) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/baby-diaries/${date}/`)
      return response.data
    } catch (err) {
      error.value = '아기 일기를 불러오는데 실패했습니다.'
      console.error('아기 일기 조회 오류:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function addBabyDiary(newDiary) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/baby-diaries/', newDiary)
      babyDiaries.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = '아기 일기 저장에 실패했습니다.'
      console.error('아기 일기 저장 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateBabyDiary(date, content) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.put(`/baby-diaries/${date}/`, { content })
      const index = babyDiaries.value.findIndex(d => d.date === date)
      if (index !== -1) {
        babyDiaries.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = '아기 일기 수정에 실패했습니다.'
      console.error('아기 일기 수정 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBabyDiary(date) {
    isLoading.value = true
    error.value = null
    try {
      await api.delete(`/baby-diaries/${date}/`)
      const index = babyDiaries.value.findIndex(d => d.date === date)
      if (index !== -1) {
        babyDiaries.value.splice(index, 1)
      }
      return true
    } catch (err) {
      error.value = '아기 일기 삭제에 실패했습니다.'
      console.error('아기 일기 삭제 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 스토어 초기화 함수
  function $reset() {
    // 로컬 스토리지에서 이벤트 데이터 복원
    const savedEvents = localStorage.getItem('calendar_events')
    events.value = savedEvents ? JSON.parse(savedEvents) : []
    llmSummaries.value = []
    babyDiaries.value = []
    selectedDate.value = null
    selectedEvent.value = null
    selectedLLMSummary.value = null
    selectedBabyDiary.value = null
    error.value = null
  }

  // 이벤트 변경 시 로컬 스토리지에 저장
  watch(() => events.value, (newEvents) => {
    localStorage.setItem('calendar_events', JSON.stringify(newEvents))
  }, { deep: true })

  return {
    // 상태
    events,
    llmSummaries,
    babyDiaries,
    currentYear,
    currentMonth,
    selectedDate,
    selectedEvent,
    selectedLLMSummary,
    selectedBabyDiary,
    isPregnant,
    babyNickname,
    isLoading,
    error,

    // 액션
    addEvent,
    updateEvent,
    deleteEvent,
    addLLMSummary,
    deleteLLMSummary,
    fetchBabyDiaries,
    fetchBabyDiaryByDate,
    addBabyDiary,
    updateBabyDiary,
    deleteBabyDiary,
    setSelectedDate,
    setSelectedEvent,
    setSelectedLLMSummary,
    setSelectedBabyDiary,
    updateCurrentYearMonth,
    setPregnancyInfo,
    getJosa,
    deleteRecurringEvents,
    deleteRecurringEventsUntil,
    $reset,

    // 게터
    eventsForSelectedDate,
    llmSummaryForSelectedDate,
    babyDiaryForSelectedDate,
    hasLLMSummary,
    hasBabyDiary
  }
})
