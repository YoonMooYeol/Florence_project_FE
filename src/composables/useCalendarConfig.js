import { ref, computed } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { koLocale, formatDate } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import { normalizeDate } from '@/utils/dateUtils'

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
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const dateStr = normalizeDate(info.date)
    
    // 날짜 텍스트에서 '일' 제거
    const dayNumber = info.dayNumberText.replace('일', '')
    
    // LLM 요약과 아기 일기 존재 여부 확인
    const hasLLM = calendarStore.hasLLMSummary(dateStr)
    const hasBabyDiary = calendarStore.hasBabyDiary(dateStr)
    
    return {
      html: `
        <div class="day-cell-content">
          <span class="fc-daygrid-day-number">${dayNumber}</span>
          ${hasLLM ? '<span class="llm-indicator">•</span>' : ''}
          ${hasBabyDiary ? '<span class="baby-diary-indicator">♥︎</span>' : ''}
        </div>
      `
    }
  }

  // 캘린더 옵션
  const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false,
    height: 'auto',
    fixedWeekCount: false,
    selectable: true,
    dayMaxEvents: 2,
    eventMaxStack: 2,
    eventMinHeight: 22,
    eventShortHeight: 22,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    displayEventTime: false,
    displayEventEnd: false,
    eventDisplay: 'block',
    eventBackgroundColor: '#ffd600',
    eventBorderColor: '#ffd600',
    eventTextColor: '#353535',
    eventClassNames: 'custom-event',
    locale: koLocale,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventContent: (arg) => {
      // Remove recurring marker [매월] from the event title
      const title = arg.event.title.replace(/\[매월\]/g, '').trim();
      return {
        html: `<div class="custom-event-content">${title}</div>`
      }
    },
    datesSet: (dateInfo) => {
      const currentDate = new Date(dateInfo.view.currentStart)
      calendarStore.updateCurrentYearMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      )
    },
    dayCellContent,
    events: calendarStore.events,
    initialDate: new Date(),
    nextDayThreshold: '23:59:59',
    eventDurationEditable: false,
    contentHeight: 'auto',
    expandRows: true,
    stickyHeaderDates: true,
    dayMaxEventRows: true,
    firstDay: 0,
    locales: [koLocale],
    locale: 'ko',
    allDaySlot: false,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '01:00:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    viewDidMount: (arg) => {
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.render()
      }
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
