/**
 * 캘린더 이벤트 처리를 위한 컴포저블 함수
 * 날짜 클릭, 이벤트 클릭 등의 이벤트 핸들러를 제공합니다.
 */
import { ref } from 'vue'
import { normalizeDate } from '@/utils/dateUtils'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { refreshCalendar, renderCalendarOptimized } from '@/utils/calendarRenderer'

// 컨텍스트 상수
const CONTEXT = 'useCalendarEvents'

export function useCalendarEvents(calendarStore, modalManager) {
  // 날짜 클릭 핸들러
  const handleDateClick = (info) => {
    try {
      if (!info || !info.dateStr) {
        logger.error(CONTEXT, '날짜 클릭 이벤트에 날짜 정보가 없습니다', info)
        return
      }

      // 날짜 형식 검증
      const dateStr = normalizeDate(info.dateStr) // YYYY-MM-DD 형식으로 정규화
      logger.debug(CONTEXT, '날짜 클릭됨 (정규화 후):', dateStr)

      // 이미 같은 날짜의 모달이 열려있는지 확인
      const isSameDateModalOpen =
        modalManager.showDayEventsModal.value &&
        calendarStore.selectedDate.value === dateStr

      if (isSameDateModalOpen) {
        logger.debug(CONTEXT, '이미 열린 날짜 모달 재클릭. 모달 닫기')
        // 이미 열려 있다면 그냥 닫기만 함
        modalManager.closeDayEventsModal()
        return
      }

      // 이전에 선택된 이벤트 초기화
      calendarStore.setSelectedEvent(null)

      // 날짜 설정 및 모달 열기
      logger.debug(CONTEXT, `날짜(${dateStr}) 설정 시도`)
      const result = calendarStore.setSelectedDate(dateStr)
      logger.debug(CONTEXT, '날짜 설정 결과:', result)

      // 실제 모달 열기 - 여기가 중요: 클릭한 날짜를 전달
      logger.debug(CONTEXT, '일일 일정 모달 열기 시도')
      modalManager.openDayEventsModal(dateStr) // 클릭한 날짜를 명시적으로 전달
    } catch (error) {
      logger.error(CONTEXT, '날짜 클릭 처리 중 오류 발생:', error)
      handleError(error, CONTEXT)
    }
  }

  // 이벤트 클릭 핸들러
  const handleEventClick = (info) => {
    const eventId = info.event.id
    logger.debug(CONTEXT, '이벤트 클릭됨:', eventId)

    try {
      // events 배열에서 해당 이벤트 찾기
      const eventObj = calendarStore.events.find((e) => e.id === eventId || e.event_id === eventId)
      if (eventObj) {
        console.log('찾은 이벤트:', eventObj)

        // 이벤트의 날짜 정보 추출
        let eventDate = null
        if (eventObj.start_date) {
          // 새로운 모델 구조 사용
          eventDate = eventObj.start_date
        } else if (eventObj.start) {
          // FullCalendar 형식 처리
          eventDate = typeof eventObj.start === 'string' && eventObj.start.includes('T')
            ? eventObj.start.split('T')[0]
            : eventObj.start
        }

        // 날짜가 있으면 일일 이벤트 모달 열기
        if (eventDate) {
          // 일일 이벤트 모달이 닫혀있거나 다른 날짜인 경우에만 열기
          if (!modalManager.showDayEventsModal.value || calendarStore.selectedDate.value !== eventDate) {
            logger.debug(CONTEXT, '일정 클릭: 일일 일정 모달을 엽니다:', eventDate)
            calendarStore.setSelectedDate(eventDate)
            modalManager.openDayEventsModal(eventDate)
          } else {
            // 이미 해당 날짜의 DayEventsModal이 열려있는 경우에는 아무 작업도 하지 않음
            logger.debug(CONTEXT, '이미 해당 날짜의 일일 일정 모달이 열려있습니다:', eventDate)
          }
        } else {
          logger.warn(CONTEXT, '이벤트에 날짜 정보가 없습니다:', eventObj)
          alert('일정의 날짜 정보가 없습니다.')
        }
      } else {
        console.warn('이벤트를 찾을 수 없음:', eventId)
        alert('해당 일정을 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('이벤트 클릭 처리 중 오류:', error)
      handleError(error, CONTEXT)
    }
  }

  // LLM 요약 삭제 이벤트 핸들러
  const handleLLMSummaryDeleted = (event, calendarRef) => {
    logger.info(CONTEXT, 'LLM 요약 삭제 이벤트 감지됨')
    if (!calendarRef.value) {
      logger.warn(CONTEXT, '캘린더 참조가 없어 이벤트를 처리할 수 없음')
      return
    }

    try {
      const calendarApi = calendarRef.value.getApi()
      const deletedDate = event.detail?.date

      if (!deletedDate) {
        logger.warn(CONTEXT, '삭제된 날짜 정보가 없습니다')
        return
      }

      // 최적화된 렌더링 함수 사용
      renderCalendarOptimized(calendarApi, { forceRefetch: true })
      
      logger.info(CONTEXT, '캘린더 업데이트 완료 (날짜:', deletedDate, ')')
    } catch (error) {
      handleError(error, `${CONTEXT}.handleLLMSummaryDeleted`)
    }
  }

  // 캘린더 새로고침 핸들러
  const handleCalendarRefresh = async (event, calendarRef, loadMonthEvents) => {
    logger.info(CONTEXT, '캘린더 새로고침 이벤트 받음')
    try {
      if (!calendarRef.value) {
        logger.warn(CONTEXT, '캘린더 참조가 없어 이벤트를 처리할 수 없음')
        return
      }
      
      // 통합된 함수를 사용하여 캘린더 새로고침
      await refreshCalendar(calendarRef.value.getApi(), loadMonthEvents)
    } catch (error) {
      logger.error(CONTEXT, '캘린더 새로고침 중 오류 발생:', error)
      handleError(error, CONTEXT)
    }
  }

  return {
    handleDateClick,
    handleEventClick,
    handleLLMSummaryDeleted,
    handleCalendarRefresh
  }
} 