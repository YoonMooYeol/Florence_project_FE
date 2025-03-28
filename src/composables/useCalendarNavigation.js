/**
 * 캘린더 네비게이션(월 이동, 오늘로 이동 등) 관련 기능을 담당하는 컴포저블 함수
 */
import { ref } from 'vue'
import * as logger from '@/utils/logger'

// 컨텍스트 상수
const CONTEXT = 'useCalendarNavigation'

export function useCalendarNavigation(calendarStore, loadMonthEvents) {
  // 현재 년월 상태 관리
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  // 월 이동 함수들
  const handlePrevMonth = async (prevMonthFunc) => {
    if (currentMonth.value === 1) {
      currentMonth.value = 12
      currentYear.value--
    } else {
      currentMonth.value--
    }
    calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
    
    // FullCalendar API 사용하여 이전 월로 이동
    prevMonthFunc && prevMonthFunc()
    
    // 월 변경 후 해당 월의 이벤트 로드
    await loadMonthEvents()
    
    logger.info(CONTEXT, `이전 월로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
  }

  const handleNextMonth = async (nextMonthFunc) => {
    if (currentMonth.value === 12) {
      currentMonth.value = 1
      currentYear.value++
    } else {
      currentMonth.value++
    }
    calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
    
    // FullCalendar API 사용하여 다음 월로 이동
    nextMonthFunc && nextMonthFunc()
    
    // 월 변경 후 해당 월의 이벤트 로드
    await loadMonthEvents()
    
    logger.info(CONTEXT, `다음 월로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
  }

  const handleGoToToday = async (goToTodayFunc) => {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
    calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
    
    // FullCalendar API 사용하여 오늘로 이동
    goToTodayFunc && goToTodayFunc()
    
    // 월 변경 후 해당 월의 이벤트 로드
    await loadMonthEvents()
    
    logger.info(CONTEXT, `오늘로 이동: ${currentYear.value}년 ${currentMonth.value}월`)
  }

  return {
    currentYear,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    handleGoToToday
  }
} 