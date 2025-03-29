import { ref, computed } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { koLocale } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import {
  getEventClassNames,
  createEventContent,
  createDayCellContent,
  isMultiDayEvent
} from '@/utils/calendarUtils'

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

  // 캘린더 옵션
  const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false,
    height: 'auto',
    fixedWeekCount: false,
    selectable: true,
    dayMaxEvents: 3,
    eventMaxStack: 2,
    eventMinHeight: 22,
    eventShortHeight: 22,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    displayEventTime: false,
    displayEventEnd: true,
    eventDisplay: 'block',
    eventBackgroundColor: '#ffd600',
    eventBorderColor: '#ffd600',
    eventTextColor: '#353535',
    // 이벤트 클래스 설정
    eventClassNames: getEventClassNames,
    locale: koLocale,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    // 이벤트 내용 생성
    eventContent: (arg) => createEventContent(arg),
    // 날짜 변경 이벤트 핸들링
    datesSet: (dateInfo) => {
      const currentDate = new Date(dateInfo.view.currentStart)
      calendarStore.updateCurrentYearMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      )

      // 뷰가 변경되었을 때 이벤트 다시 가져오지 않고 유지하도록 설정
      // 월 변경 버튼 클릭 시 loadMonthEvents 함수가 이미 호출되므로 여기서는 생략
    },
    // 날짜 셀 내용 생성
    dayCellContent: (info) => createDayCellContent(
      info,
      calendarStore.hasLLMSummary,
      calendarStore.hasBabyDiary
    ),
    events: calendarStore.events,
    initialDate: new Date(),
    nextDayThreshold: '00:00:00', // 자정을 다음 날의 시작점으로 정의
    eventDurationEditable: false,
    contentHeight: 'auto',
    expandRows: true,
    stickyHeaderDates: true,
    dayMaxEventRows: true,
    firstDay: 0, // 일요일부터 시작
    locales: [koLocale],
    defaultAllDay: true, // 기본적으로 종일 이벤트로 처리
    forceEventDuration: true, // 이벤트 지속 시간 강제 적용
    viewDidMount: (arg) => {
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.render()
      }
    },
    eventDidMount: (info) => {
      const { event, el } = info
      
      // 사용자가 선택한 색상만 적용 (DB에 저장된 색상)
      const eventColor = event.extendedProps.event_color || '#FFD600'
      
      // 단일 색상만 적용 (배경색과 테두리색 동일하게)
      el.style.backgroundColor = eventColor
      el.style.borderColor = eventColor
      
      // CSS 변수로도 설정하여 하위 요소에 동일 색상 적용
      el.style.setProperty('--event-color', eventColor)
      
      // 데이터 속성 추가
      el.dataset.eventColor = eventColor
      
      // 모든 하위 요소에도 동일 색상 적용
      el.querySelectorAll('.fc-event-main, .fc-event-title, .event-title').forEach(child => {
        child.style.backgroundColor = eventColor
      })
      
      // 모든 텍스트는 동일한 색상으로
      el.querySelectorAll('.fc-event-title, .event-title').forEach(textEl => {
        textEl.style.color = '#353535'
      })
      
      // 이벤트 타입 클래스 제거 (타입별 다른 색상 방지)
      const typeClasses = Array.from(el.classList).filter(cls => cls.startsWith('event-type-'))
      typeClasses.forEach(cls => el.classList.remove(cls))
      
      // 둥근 모서리 스타일 적용
      if (isMultiDayEvent(event.start, event.end)) {
        // 멀티데이 이벤트
        if (info.isStart) {
          el.style.borderTopLeftRadius = '25px'
          el.style.borderBottomLeftRadius = '25px'
          el.style.borderTopRightRadius = '0'
          el.style.borderBottomRightRadius = '0'
        } else if (info.isEnd) {
          el.style.borderTopRightRadius = '25px'
          el.style.borderBottomRightRadius = '25px'
          el.style.borderTopLeftRadius = '0'
          el.style.borderBottomLeftRadius = '0'
        } else {
          // 중간 부분
          el.style.borderRadius = '0'
        }
        
        // 시작과 종료가 모두 있는 이벤트
        if (info.isStart && info.isEnd) {
          el.style.borderRadius = '25px'
        }
      } else {
        // 단일 일정은 모든 코너가 둥글게
        el.style.borderRadius = '25px'
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
