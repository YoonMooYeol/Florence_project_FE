import { ref, computed } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { koLocale } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'

/**
 * FullCalendar 설정 및 관련 기능을 제공하는 컴포저블
 * @param {Function} handleDateClick - 날짜 클릭 핸들러
 * @param {Function} handleEventClick - 이벤트 클릭 핸들러
 * @returns {Object} 캘린더 설정 및 관련 함수들
 */
export function useCalendarConfig (handleDateClick, handleEventClick) {
  const calendarStore = useCalendarStore()

  // 캘린더 참조
  const calendarRef = ref(null)

  // 날짜 셀 컨텐츠 렌더링
  const dayCellContent = (info) => {
    // Date 객체를 YYYY-MM-DD 형식 문자열로 변환 - 타임존 고려
    const localDate = new Date(
      info.date.getFullYear(),
      info.date.getMonth(),
      info.date.getDate()
    )

    // YYYY-MM-DD 형식으로 변환
    const year = localDate.getFullYear()
    const month = String(localDate.getMonth() + 1).padStart(2, '0')
    const day = String(localDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    // 날짜 텍스트에서 '일' 제거
    const dayNumber = info.dayNumberText.replace('일', '')

    // LLM 요약 존재 여부 확인
    const hasLLM = calendarStore.hasLLMSummary(dateStr)

    return {
      html: `
        <div class="day-cell-content">
          <span class="fc-daygrid-day-number">${dayNumber}</span>
          ${hasLLM ? '<span class="llm-indicator">•</span>' : ''}
        </div>
      `
    }
  }

  // 캘린더 옵션
  const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false, // 기본 헤더 숨기기 (커스텀 헤더 사용)
    height: 'auto',
    fixedWeekCount: false, // 월에 따라 주 수 조정
    selectable: true, // 선택 기능 활성화
    dayMaxEvents: 2, // 최대 표시 이벤트 수
    eventDisplay: 'block', // 이벤트 표시 방식
    displayEventTime: false, // 이벤트 시간 표시 안함
    eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
    firstDay: 0, // 일요일부터 시작
    dayCellContent,
    // 이벤트 표시 관련 설정
    nextDayThreshold: '23:59:59', // 자정에 가까운 이벤트는 다음 날로 표시하지 않음
    eventDurationEditable: false, // 이벤트 기간 편집 비활성화
    eventContent: (arg) => {
      // 이벤트 콘텐츠 커스텀 렌더링
      return {
        html: `<div class="custom-event-content">${arg.event.title}</div>`
      }
    },
    locales: [koLocale],
    locale: 'ko',
    events: calendarStore.events, // 스토어에서 이벤트 데이터 사용
    initialDate: '2025-03-15', // 초기 표시 날짜
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    datesSet: (dateInfo) => {
      // 날짜 변경 시 현재 표시 중인 년월 업데이트
      calendarStore.updateCurrentYearMonth(
        dateInfo.view.currentStart.getFullYear(),
        dateInfo.view.currentStart.getMonth() + 1
      )
    }
  }))

  // 현재 표시 중인 날짜 정보 업데이트 함수
  const updateCurrentDate = () => {
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      const currentDate = calendarApi.getDate()
      calendarStore.updateCurrentYearMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      )
    }
  }

  // 이전 달로 이동
  const prevMonth = () => {
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.prev() // FullCalendar API를 사용하여 이전 달로 이동
      updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
    }
  }

  // 다음 달로 이동
  const nextMonth = () => {
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.next() // FullCalendar API를 사용하여 다음 달로 이동
      updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
    }
  }

  // 오늘 날짜로 이동
  const goToToday = () => {
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.today() // FullCalendar API를 사용하여 오늘 날짜로 이동
      updateCurrentDate() // 현재 표시 중인 날짜 정보 업데이트
    }
  }

  return {
    calendarRef,
    calendarOptions,
    updateCurrentDate,
    prevMonth,
    nextMonth,
    goToToday
  }
}
