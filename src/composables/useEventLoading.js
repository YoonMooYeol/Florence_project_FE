/**
 * 캘린더 이벤트 데이터 로딩 관련 기능을 담당하는 컴포저블 함수
 */
import { ref } from 'vue'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'

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
              const eventEnd = new Date(event.end || event.start)
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