/**
 * 캘린더 이벤트 데이터 로딩 관련 기능을 담당하는 컴포저블 함수
 */
import { ref } from 'vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { isMultiDayEvent } from '@/utils/calendarUtils'
import { renderCalendarOptimized } from '@/utils/calendarRenderer'

// 컨텍스트 상수
const CONTEXT = 'useEventLoading'

export function useEventLoading(calendarStore, calendarRef, currentYear, currentMonth) {
  // 현재 월의 이벤트 로딩 함수
  const loadMonthEvents = async () => {
    try {
      logger.info(CONTEXT, `${currentYear.value}년 ${currentMonth.value}월 이벤트 로딩 시작`)
      
      // 이벤트, 요약, 일기 데이터 동시에 로드 (병렬 처리)
      const [events, summaries, diaries] = await Promise.all([
        calendarStore.fetchEvents(),
        calendarStore.fetchLLMSummaries(currentYear.value, currentMonth.value),
        calendarStore.fetchBabyDiaries(currentYear.value, currentMonth.value)
      ])
      
      logger.info(CONTEXT, 
        `데이터 로드 완료: 이벤트 ${events.length}개, LLM 요약 ${summaries.length}개, 태교일기 ${diaries.length}개`
      )
      
      // 캘린더 API를 통해 이벤트 표시
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.removeAllEvents() // 기존 이벤트 제거
        
        // 모든 이벤트 확인 및 종료일 처리
        validateAndFixEventDates(events)
        
        // 새 이벤트 일괄 추가
        calendarApi.addEventSource(events)
        
        // 최적화된 렌더링 함수 사용
        renderCalendarOptimized(calendarApi)
      }
      
      return events
    } catch (error) {
      logger.error(CONTEXT, '이벤트 로드 중 오류 발생:', error)
      handleError(error, `${CONTEXT}.loadMonthEvents`)
      return []
    }
  }

  // 이벤트 종료일 검증 및 수정 함수
  const validateAndFixEventDates = (events) => {
    events.forEach(event => {
      // 종료일이 없으면 시작일과 동일하게 설정
      if (!event.end) {
        event.end = event.start
        logger.debug(CONTEXT, `이벤트 "${event.title}"에 종료일 추가: ${event.end}`)
      }
      
      // 장기일정(멀티데이 이벤트) 검증
      // 날짜만 있는 멀티데이 이벤트인 경우 종료일이 제대로 조정되었는지 확인
      if (isMultiDayEvent(event.start, event.end) && !event.end.includes('T')) {
        // 멀티데이 이벤트의 원본 종료일과 현재 종료일 비교 (타임스탬프로 비교)
        const endDate = new Date(event.end)
        const originalEndDate = new Date(event.end_date || event.original_end_date || event.end)
        
        // 날짜 차이를 밀리초로 계산
        const oneDayMs = 24 * 60 * 60 * 1000 // 1일을 밀리초로 표현
        const dateDiff = endDate.getTime() - originalEndDate.getTime()
        
        // 차이가 1일(하루)보다 작으면 조정 필요 (시간대 차이 등 고려하여 90% 기준 적용)
        if (dateDiff < oneDayMs * 0.9 && event.end_date && event.end_date !== event.start_date) {
          const newEndDate = new Date(originalEndDate)
          newEndDate.setDate(newEndDate.getDate() + 1)
          event.end = newEndDate.toISOString().split('T')[0]
          logger.debug(CONTEXT, `장기일정 종료일 보정: "${event.title}" 원본=${originalEndDate.toISOString().split('T')[0]} → 조정=${event.end}`)
        }
      }
    })
  }

  // 이벤트 소스 설정 함수
  const getEventSourceConfig = () => {
    return [
      {
        events: async (info, successCallback, failureCallback) => {
          try {
            const startDate = info.startStr.split('T')[0]
            const endDate = info.endStr.split('T')[0]
            
            logger.info(CONTEXT, `이벤트 요청 범위: ${startDate} ~ ${endDate}`)
            
            // 날짜 범위에 따라 스토어 년/월 값 설정
            const startDateObj = new Date(startDate)
            currentYear.value = startDateObj.getFullYear()
            currentMonth.value = startDateObj.getMonth() + 1
            calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
            
            // 이벤트 로드
            const events = await calendarStore.fetchEvents()
            
            // 필터링 - 현재 보이는 범위에 포함된 이벤트만 표시
            const filteredEvents = events.filter(event => {
              const eventStart = new Date(event.start)
              const eventEnd = event.end ? new Date(event.end || event.start) : eventStart
              
              // 종료일 처리 검증이 필요한 경우 validateAndFixEventDates 함수 사용
              
              const viewStart = new Date(startDate)
              const viewEnd = new Date(endDate)
              
              return eventStart < viewEnd && eventEnd >= viewStart
            })
            
            logger.info(CONTEXT, `${filteredEvents.length}개 이벤트 로드됨`)
            successCallback(filteredEvents)
          } catch (error) {
            logger.error(CONTEXT, '이벤트 로드 중 오류 발생:', error)
            failureCallback(error)
          }
        }
      }
    ]
  }

  return {
    loadMonthEvents,
    getEventSourceConfig,
    validateAndFixEventDates
  }
} 