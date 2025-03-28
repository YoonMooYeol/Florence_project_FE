/**
 * 캘린더 렌더링 유틸리티 함수 모음
 */
import * as logger from '@/utils/logger'

const CONTEXT = 'calendarRenderer'

/**
 * 캘린더 렌더링을 최적화하는 유틸리티 함수
 * @param {Object} calendarApi - FullCalendar API 객체
 * @param {Object} options - 옵션 객체 (delay, forceRefetch 등)
 */
export function renderCalendarOptimized(calendarApi, options = {}) {
  const { delay = 100, forceRefetch = false } = options
  
  if (forceRefetch) {
    calendarApi.refetchEvents()
  }
  
  // 리렌더링 후에도 이벤트가 사라지지 않도록 설정
  setTimeout(() => {
    requestAnimationFrame(() => {
      calendarApi.render()
      logger.debug(CONTEXT, '캘린더 렌더링 완료')
    })
  }, delay)
}

/**
 * 캘린더 새로고침 유틸리티 함수
 * @param {Object} calendarApi - FullCalendar API 객체
 * @param {Function} loadMonthEvents - 월 데이터 로드 함수
 */
export async function refreshCalendar(calendarApi, loadMonthEvents) {
  try {
    logger.info(CONTEXT, '캘린더 새로고침 시작')
    
    // 이벤트 데이터 로드
    await loadMonthEvents()
    
    // 이벤트 새로고침 및 렌더링
    calendarApi.refetchEvents()
    
    renderCalendarOptimized(calendarApi)
    
    logger.info(CONTEXT, '캘린더 새로고침 완료')
  } catch (error) {
    logger.error(CONTEXT, '캘린더 새로고침 중 오류 발생:', error)
    throw error
  }
} 