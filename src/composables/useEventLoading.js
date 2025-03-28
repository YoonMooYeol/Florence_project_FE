/**
 * 캘린더 이벤트 데이터 로딩 관련 기능을 담당하는 컴포저블 함수
 */
import { ref } from 'vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { isMultiDayEvent } from '@/utils/calendarUtils'

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
        events.forEach(event => {
          // 종료일이 없으면 시작일과 동일하게 설정
          if (!event.end) {
            event.end = event.start
          }
          
          // 종료일 처리는 formatEventForCalendar 함수에서 이미 수행됨
          // 여기서는 추가 처리 없이 기존 종료일 사용
        })
        
        // 새 이벤트 일괄 추가
        calendarApi.addEventSource(events)
        
        // 한 번만 렌더링
        requestAnimationFrame(() => {
          calendarApi.render()
        })
      }
      
      return events
    } catch (error) {
      logger.error(CONTEXT, '이벤트 로드 중 오류 발생:', error)
      handleError(error, `${CONTEXT}.loadMonthEvents`)
      return []
    }
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
              let eventEnd = new Date(event.end || event.start)
              
              // 종료일 처리 검증: formatEventForCalendar 함수에서 조정된 종료일 확인
              // 멀티데이 이벤트 & 시간 정보 없음 & 원본과 조정된 종료일이 다른지 확인
              if (isMultiDayEvent(event.start, event.end) && 
                  event.end && 
                  !event.end.includes('T') && 
                  event.original_end_date && 
                  event.adjusted_end_date) {
                
                // 원본 종료일과 조정된 종료일 간의 차이 계산 (타임스탬프 기반)
                const originalEndDate = new Date(event.original_end_date)
                const adjustedEndDate = new Date(event.adjusted_end_date)
                const oneDayMs = 24 * 60 * 60 * 1000 // 1일을 밀리초로
                
                // 차이가 정확히 1일(하루)인지 확인 (약간의 오차 허용)
                const dateDiff = adjustedEndDate.getTime() - originalEndDate.getTime()
                
                // 오차 허용 범위: 90% ~ 110%
                if (dateDiff < oneDayMs * 0.9) {
                  logger.debug(CONTEXT, `멀티데이 이벤트 "${event.title}"의 종료일 재조정 필요`)
                  eventEnd = new Date(event.end)
                  eventEnd.setDate(eventEnd.getDate() + 1)
                  event.end = eventEnd.toISOString().split('T')[0]
                  event.adjusted_end_date = event.end
                }
              }
              
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
    getEventSourceConfig
  }
} 