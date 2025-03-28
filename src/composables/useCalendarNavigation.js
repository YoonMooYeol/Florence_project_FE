/**
 * 캘린더 네비게이션(월 이동, 오늘로 이동 등) 관련 기능을 담당하는 컴포저블 함수
 */
import { ref } from 'vue'
import * as logger from '@/utils/logger'
import { refreshCalendar } from '@/utils/calendarRenderer'

// 컨텍스트 상수
const CONTEXT = 'useCalendarNavigation'

export function useCalendarNavigation(calendarStore, calendarRef, loadMonthEvents) {
  // 현재 년월 상태 관리
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  // 이전 월로 이동
  const handlePrevMonth = async () => {
    try {
      if (currentMonth.value === 1) {
        currentMonth.value = 12
        currentYear.value--
      } else {
        currentMonth.value--
      }
      calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
      
      // FullCalendar API 사용하여 이전 월로 이동
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.prev() // FullCalendar API를 사용하여 이전 달로 이동
        
        // 통합된 함수를 사용하여 캘린더 새로고침
        await refreshCalendar(calendarApi, loadMonthEvents)
      }
      
      logger.info(CONTEXT, `이전 월로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
    } catch (error) {
      logger.error(CONTEXT, '이전 월 이동 중 오류 발생:', error)
    }
  }

  // 다음 월로 이동
  const handleNextMonth = async () => {
    try {
      if (currentMonth.value === 12) {
        currentMonth.value = 1
        currentYear.value++
      } else {
        currentMonth.value++
      }
      calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
      
      // FullCalendar API 사용하여 다음 월로 이동
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.next() // FullCalendar API를 사용하여 다음 달로 이동
        
        // 통합된 함수를 사용하여 캘린더 새로고침
        await refreshCalendar(calendarApi, loadMonthEvents)
      }
      
      logger.info(CONTEXT, `다음 월로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
    } catch (error) {
      logger.error(CONTEXT, '다음 월 이동 중 오류 발생:', error)
    }
  }

  // 오늘로 이동
  const handleGoToToday = async () => {
    try {
      const today = new Date()
      currentYear.value = today.getFullYear()
      currentMonth.value = today.getMonth() + 1
      calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
      
      // FullCalendar API 사용하여 오늘로 이동
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.today() // FullCalendar API를 사용하여 오늘 날짜로 이동
        
        // 통합된 함수를 사용하여 캘린더 새로고침
        await refreshCalendar(calendarApi, loadMonthEvents)
      }
      
      logger.info(CONTEXT, `오늘로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
    } catch (error) {
      logger.error(CONTEXT, '오늘 이동 중 오류 발생:', error)
    }
  }

  return {
    currentYear,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    handleGoToToday
  }
} 