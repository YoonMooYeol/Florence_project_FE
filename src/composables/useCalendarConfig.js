import { ref, computed } from 'vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { koLocale, formatDate, isSameDay } from '@/utils/dateUtils'
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
    displayEventEnd: true,  // 종료 시간 표시 활성화
    eventDisplay: 'block',  // 'auto'에서 'block'으로 변경 - 멀티데이 이벤트에 더 효과적
    eventBackgroundColor: '#ffd600',
    eventBorderColor: '#ffd600',
    eventTextColor: '#353535',
    eventClassNames: function(arg) {
      // 멀티데이 이벤트에 특별한 클래스 추가
      const classes = ['custom-event'];
      const startDate = arg.event.start;
      const endDate = arg.event.end;
      
      // end가 있고, start와 같은 날짜가 아니면 멀티데이 이벤트로 간주
      if (endDate && startDate && !isSameDay(startDate, endDate)) {
        classes.push('multi-day-event');
        
        // 이벤트의 시작, 중간, 끝 부분에 추가 클래스
        if (arg.isStart) {
          classes.push('event-start');
        }
        if (arg.isEnd) {
          classes.push('event-end');
        }
        if (!arg.isStart && !arg.isEnd) {
          classes.push('event-middle');
        }
      }
      
      // 특별한 속성이 있는 이벤트에 추가 클래스
      if (arg.event.extendedProps && arg.event.extendedProps._isMultiDay) {
        classes.push('special-multi-day-event');
      }
      
      return classes;
    },
    locale: koLocale,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventContent: (arg) => {
      // Remove recurring marker [매월] from the event title
      const title = arg.event.title.replace(/\[매월\]/g, '').trim();
      
      // 멀티데이 이벤트 특수 마킹
      const startDate = arg.event.start;
      const endDate = arg.event.end;
      const isMultiDayEvent = endDate && startDate && !isSameDay(startDate, endDate);
      
      if (isMultiDayEvent) {
        return {
          html: `<div class="multi-day-event-content">
                   <span class="event-title" title="${title}">${title}</span>
                 </div>`
        };
      }
      
      return {
        html: `<div class="custom-event-content">
                 <span class="event-title" title="${title}">${title}</span>
               </div>`
      };
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
    nextDayThreshold: '00:00:00',  // 다음날로 넘어가는 기준 시간을 자정으로 설정
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
    },
    // 멀티데이 이벤트 설정 개선
    displayEventEnd: true,     // 종료 시간 표시
    nextDayThreshold: '00:00:00', // 자정을 다음 날의 시작점으로 정의
    defaultAllDay: true,       // 기본적으로 종일 이벤트로 처리
    forceEventDuration: true,  // 이벤트 지속 시간 강제 적용
    eventBackgroundColor: '#ffd600', // 이벤트 배경색
    eventBorderColor: '#ffd600', // 이벤트 경계색
    eventTextColor: '#353535', // 이벤트 텍스트 색상
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
