import { ref } from 'vue'
import { useCalendarStore } from '@/store/calendar'

/**
 * 캘린더 관련 모달 상태 관리를 위한 컴포저블
 * @returns {Object} 모달 상태 및 관련 함수들
 */
export function useModalManager () {
  const calendarStore = useCalendarStore()

  // 모달 상태
  const showDayEventsModal = ref(false)
  const showAddEventModal = ref(false)
  const showEventDetailModal = ref(false)
  const showLLMDetailModal = ref(false)

  // 일일 일정 모달 열기
  const openDayEventsModal = (dateStr) => {
    console.log(`useModalManager: 일일 일정 모달 열기 요청 (날짜: ${dateStr})`)
    calendarStore.setSelectedDate(dateStr)

    // 다른 모달은 모두 닫기
    console.log('useModalManager: 다른 모달들을 모두 닫습니다.')
    showAddEventModal.value = false
    showEventDetailModal.value = false
    showLLMDetailModal.value = false

    // 일일 일정 모달만 표시
    console.log('useModalManager: 일일 일정 모달만 열립니다.')
    showDayEventsModal.value = true
  }

  // 일일 일정 모달 닫기
  const closeDayEventsModal = () => {
    console.log('useModalManager: 일일 일정 모달 닫기')
    showDayEventsModal.value = false

    // 모든 모달을 확실히 닫기
    showAddEventModal.value = false
    showEventDetailModal.value = false
    showLLMDetailModal.value = false
  }

  // 일정 추가 모달 열기
  const openAddEventModal = () => {
    console.log('useModalManager: 일정 추가 모달 열기')
    // 모든 모달 닫기
    showDayEventsModal.value = false
    showEventDetailModal.value = false
    showLLMDetailModal.value = false
    // 일정 추가 모달만 표시
    showAddEventModal.value = true
  }

  // 일정 추가 모달 닫기
  const closeAddEventModal = () => {
    console.log('useModalManager: 일정 추가 모달 닫기')
    showAddEventModal.value = false
    // 일일 일정 모달로 돌아가지 않음
  }

  // 일정 상세 모달 열기
  const openEventDetailModal = (event) => {
    console.log('useModalManager: 일정 상세 모달 열기 요청:', event)

    // LLM 모달과 추가 모달은 닫기 (중복 방지)
    showLLMDetailModal.value = false
    showAddEventModal.value = false

    // 일정 상세 모달 표시 (일일 일정 모달은 그대로 유지)
    calendarStore.setSelectedEvent(event)
    console.log('useModalManager: 일정 상세 모달이 열립니다 (일일 일정 모달은 그대로 유지)')
    showEventDetailModal.value = true
  }

  // 일정 상세 모달 닫기
  const closeEventDetailModal = () => {
    console.log('useModalManager: 일정 상세 모달 닫기')
    showEventDetailModal.value = false
    // 일일 일정 모달로 돌아가기 (이미 표시되어 있음)
  }

  // LLM 대화 요약 상세 모달 열기
  const openLLMDetailModal = (summary) => {
    console.log('useModalManager: LLM 상세 모달 열기 요청:', summary)

    // 이벤트 모달과 추가 모달은 닫기 (중복 방지)
    showEventDetailModal.value = false
    showAddEventModal.value = false

    // LLM 상세 모달 표시 (일일 일정 모달은 그대로 유지)
    calendarStore.setSelectedLLMSummary(summary)
    console.log('useModalManager: LLM 상세 모달이 열립니다 (일일 일정 모달은 그대로 유지)')
    showLLMDetailModal.value = true
  }

  // LLM 대화 요약 상세 모달 닫기
  const closeLLMDetailModal = () => {
    console.log('useModalManager: LLM 상세 모달 닫기')
    showLLMDetailModal.value = false
    // 일일 일정 모달로 돌아가기 (이미 표시되어 있음)
  }

  // 일정 저장
  const saveEvent = (newEvent) => {
    console.log('useModalManager: 일정 저장:', newEvent)
    calendarStore.addEvent(newEvent)
    closeAddEventModal()
    // 일일 일정 모달로 돌아가지 않음
  }

  // 일정 삭제
  const deleteEvent = (eventId) => {
    console.log('useModalManager: 일정 삭제:', eventId)
    calendarStore.deleteEvent(eventId)
    showEventDetailModal.value = false
    // 일일 일정 모달은 이미 표시되어 있음
  }

  // LLM 요약 삭제
  const deleteLLMSummary = (date) => {
    console.log('useModalManager: LLM 요약 삭제:', date)
    calendarStore.deleteLLMSummary(date)
    showLLMDetailModal.value = false
    // 일일 일정 모달은 이미 표시되어 있음
  }

  return {
    // 모달 상태
    showDayEventsModal,
    showAddEventModal,
    showEventDetailModal,
    showLLMDetailModal,

    // 모달 관련 함수
    openDayEventsModal,
    closeDayEventsModal,
    openAddEventModal,
    closeAddEventModal,
    openEventDetailModal,
    closeEventDetailModal,
    openLLMDetailModal,
    closeLLMDetailModal,

    // 이벤트 관련 함수
    saveEvent,
    deleteEvent,
    deleteLLMSummary
  }
}
