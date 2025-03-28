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
export function useCalendarConfig(handleDateClick, handleEventClick) {
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
      const { event, el, view } = info
      
      // 모든 이벤트에 둥근 모서리 스타일 적용 (기존 CSS 스타일보다 우선적용)
      if (isMultiDayEvent(event.start, event.end)) {
        // 멀티데이 이벤트
        if (info.isStart) {
          el.style.borderTopLeftRadius = '25px !important';
          el.style.borderBottomLeftRadius = '25px !important';
        } 
        
        if (info.isEnd) {
          el.style.borderTopRightRadius = '25px !important';
          el.style.borderBottomRightRadius = '25px !important';
        }
        
        // 시작과 종료가 모두 있는 이벤트 (첫날과 마지막 날이 모두 표시되는 이벤트)
        if (info.isStart && info.isEnd) {
          el.style.borderRadius = '25px !important';
        }
      } else {
        // 단일 일정은 모든 코너가 둥글게
        el.style.borderRadius = '25px !important';
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
