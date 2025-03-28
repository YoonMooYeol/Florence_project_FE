/**
 * 캘린더 이벤트 관리(추가, 삭제)를 위한 컴포저블 함수
 */
import { ref } from 'vue'
import { normalizeDate } from '@/utils/dateUtils'
import * as logger from '@/utils/logger'

// 컨텍스트 상수
const CONTEXT = 'useEventManagement'

export function useEventManagement(calendarStore, modalManager, loadMonthEvents) {
  // FAB 관련 상태 관리
  const showFABMenu = ref(false)
  const showEventModal = ref(false)
  const showBabyDiaryModal = ref(false)
  const selectedDate = ref(null)

  // FAB 메뉴 클릭 핸들러
  const handleFABMenuClick = (action) => {
    showFABMenu.value = false
    selectedDate.value = new Date().toISOString().split('T')[0]

    if (action === 'event') {
      showEventModal.value = true
    } else if (action === 'baby') {
      showBabyDiaryModal.value = true
    }
  }

  // 이벤트 저장 핸들러
  const handleEventSave = async (eventData) => {
    try {
      logger.info(CONTEXT, '일정 저장 시작:', eventData)
      
      // 입력받은 날짜를 YYYY-MM-DD 형식으로 정규화
      eventData.event_day = normalizeDate(eventData.event_day)
      
      // 반복 일정 여부 확인
      if (eventData.recurring && eventData.recurring !== 'none') {
        logger.info(CONTEXT, '반복 일정 감지:', eventData.recurring)
      }

      const savedEvent = await calendarStore.addEvent(eventData)
      logger.info(CONTEXT, '저장된 일정:', savedEvent)

      if (savedEvent) {
        logger.info(CONTEXT, '일정 저장 성공')
        showEventModal.value = false

        // 캘린더 새로고침
        await loadMonthEvents()
      } else {
        logger.error(CONTEXT, '일정 저장 실패: savedEvent가 없음')
        alert('일정 저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      logger.error(CONTEXT, '일정 저장 중 오류 발생:', error)
      alert('일정 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 이벤트 삭제 핸들러
  const handleEventDelete = async (eventId, isRecurring, deleteOptions = {}) => {
    try {
      logger.info(CONTEXT, '삭제 시도:', {
        eventId,
        isRecurring,
        deleteOptions,
        event: calendarStore.events.find(e => e.id === eventId)
      })

      let success = false

      if (isRecurring) {
        if (deleteOptions?.option === 'this_only') {
          logger.info(CONTEXT, '이 일정만 삭제 시도')
          await calendarStore.deleteRecurringEventThisOnly(eventId)
          success = true
        } else if (deleteOptions?.option === 'this_and_future') {
          logger.info(CONTEXT, '이후 모든 일정 삭제 시도')
          await calendarStore.deleteRecurringEventsThisAndFuture(eventId)
          success = true
        } else if (deleteOptions?.option === 'all') {
          logger.info(CONTEXT, '모든 반복 일정 삭제 시도')
          await calendarStore.deleteRecurringEventsAll(eventId)
          success = true
        }
      } else {
        logger.info(CONTEXT, '단일 일정 삭제 시도')
        await calendarStore.deleteEvent(eventId)
        success = true
      }

      if (success) {
        logger.info(CONTEXT, '일정 삭제 성공')
        modalManager.closeEventDetailModal()

        // 캘린더 새로고침
        await loadMonthEvents()
      }
    } catch (error) {
      logger.error(CONTEXT, '일정 삭제 중 오류:', error)
      alert(error.message || '일정 삭제 중 오류가 발생했습니다.')
    }
  }

  // 년/월 선택 핸들러
  const handleDateSelect = ({ year, month }, calendarRef) => {
    calendarStore.updateCurrentYearMonth(year, month)
    
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.gotoDate(`${year}-${String(month).padStart(2, '0')}-01`)
      loadMonthEvents()
    }
  }

  return {
    showFABMenu,
    showEventModal,
    showBabyDiaryModal,
    selectedDate,
    handleFABMenuClick,
    handleEventSave,
    handleEventDelete,
    handleDateSelect
  }
} 