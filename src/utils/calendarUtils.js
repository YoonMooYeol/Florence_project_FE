/**
 * 캘린더 관련 유틸리티 함수들
 */
import { normalizeDate, isSameDay, adjustEventEndDate } from '@/utils/dateUtils'

/**
 * 이벤트가 멀티데이 이벤트인지 확인하는 함수
 * @param {string|Date} startDate - 시작 날짜
 * @param {string|Date} endDate - 종료 날짜
 * @returns {boolean} 멀티데이 이벤트 여부
 */
export function isMultiDayEvent(startDate, endDate) {
  if (!endDate) return false
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start.getTime() !== end.getTime()
}

/**
 * 이벤트 종료일 처리 로직을 별도 함수로 분리
 * @param {Object} fcEvent - FullCalendar 형식 이벤트
 * @param {Object} event - 원본 이벤트 데이터
 * @returns {Object} 종료일이 처리된 이벤트 객체
 */
export function processEndDate(fcEvent, event) {
  // 원본 종료일 저장 (API 참조용)
  fcEvent.original_end_date = event.end_date || event.start_date;
  
  if (event.end_date) {
    // 원본 종료일을 저장
    fcEvent.end_date = event.end_date;
    
    // 멀티데이 이벤트인지 확인 (시작일과 종료일이 다른 경우)
    const isMultiDay = event.start_date !== event.end_date;
    
    if (event.end_time) {
      // 시간이 있는 경우 - 시간 정보가 있으면 그대로 사용
      fcEvent.end = `${event.end_date}T${event.end_time}`;
      fcEvent.end_time = event.end_time;
    } else {
      // 시간이 없는 경우 (날짜만)
      // 통합된 함수를 사용하여 종료일 처리
      // 멀티데이 이벤트인 경우에만 조정 
      if (isMultiDay) {
        fcEvent.end = adjustEventEndDate(event.end_date, false, event.start_date, 1);
      } else {
        fcEvent.end = event.end_date; // 단일 날짜 이벤트는 조정하지 않음
      }
    }
  } else if (event.end_time && !event.end_date) {
    // 종료일은 없고 종료 시간만 있는 경우 (당일 이벤트)
    fcEvent.end = `${event.start_date}T${event.end_time}`;
    fcEvent.end_time = event.end_time;
  } else {
    // 종료일과 종료 시간이 모두 없는 경우 (단일 일정)
    // 종료일을 시작일과 동일하게 설정 (FullCalendar의 요구사항)
    fcEvent.end = fcEvent.start;
  }
  
  return fcEvent;
}

/**
 * 이벤트 데이터 처리하는 통합 함수
 * @param {Object} event - 서버에서 받은 이벤트 객체
 * @returns {Object} FullCalendar 이벤트 객체
 */
export function processEventDates(event) {
  // 기본 이벤트 객체 생성
  const fcEvent = {
    id: event.event_id,
    title: event.title,
    backgroundColor: event.event_color || '#FFD600',
    borderColor: event.event_color || '#FFD600',
    textColor: '#353535',
    event_type: event.event_type,
    description: event.description || '',
    recurrence_rules: event.recurrence_rules
  }

  // 시작일 처리
  fcEvent.start_date = event.start_date
  fcEvent.start = event.start_time 
    ? `${event.start_date}T${event.start_time}` 
    : event.start_date
  
  if (event.start_time) {
    fcEvent.start_time = event.start_time
  }

  // 종료일 처리
  processEndDate(fcEvent, event)
  
  return fcEvent
}

/**
 * FullCalendar 이벤트 객체로 변환하는 함수
 * @param {Object} event - 서버에서 받은 이벤트 객체
 * @returns {Object} FullCalendar 이벤트 객체
 */
export function formatEventForCalendar(event) {
  return processEventDates(event)
}

/**
 * 이벤트 렌더링을 위한 CSS 클래스 결정 함수
 * @param {Object} arg - FullCalendar의 이벤트 인자
 * @returns {Array} 적용할 CSS 클래스 배열
 */
export function getEventClassNames(arg) {
  const classes = ['custom-event']
  const startDate = new Date(arg.event.start)
  const endDate = arg.event.end ? new Date(arg.event.end) : null
  
  // 이벤트 유형에 따라 다른 클래스 추가
  const eventType = arg.event.extendedProps?.event_type || ''
  if (eventType) {
    classes.push(`event-type-${eventType}`)
  }
  
  // 멀티데이 이벤트 처리
  if (endDate && !isSameDay(startDate, endDate)) {
    classes.push('multi-day-event')
    
    // 이벤트의 시작, 중간, 끝 부분에 클래스 추가
    if (arg.isStart) {
      classes.push('event-start')
    } else if (arg.isEnd) {
      classes.push('event-end')
    } else {
      classes.push('event-middle')
    }
  } else {
    // 단일 일정인 경우 둥근 모서리 클래스 추가
    classes.push('single-day-event')
    // 시작과 끝이 같은 이벤트는 양쪽 모두 둥글게
    if (arg.isStart && arg.isEnd) {
      classes.push('event-start-end')
    }
  }
  
  return classes
}

/**
 * 이벤트 내용 생성 함수
 * @param {Object} arg - FullCalendar의 이벤트 인자
 * @returns {Object} 렌더링할 HTML 내용
 */
export function createEventContent(arg) {
  // 제목에서 반복 마커 제거
  const title = arg.event.title.replace(/\[(매일|매주|매년|매월)\]/g, '').trim()
  const startDate = new Date(arg.event.start)
  const endDate = arg.event.end ? new Date(arg.event.end) : null
  const isMultiDay = endDate && !isSameDay(startDate, endDate)
  
  // 멀티데이 이벤트 - 날짜별 다른 내용 표시
  if (isMultiDay) {
    let content = ''
    
    // 시작일에는 이벤트 제목 표시
    if (arg.isStart) {
      content = `<div class="multi-day-event-content start">
                  <span class="event-title" title="${title}">${title}</span>
                </div>`
    } else if (!arg.isStart && !arg.isEnd) {
      // 중간 날짜에는 연속성을 보여주는 간단한 표시
      content = `<div class="multi-day-event-content middle">
                  <span class="event-continuation">${title}</span>
                </div>`
    } else if (arg.isEnd) {
      // 마지막 날짜에도 제목 표시
      content = `<div class="multi-day-event-content end">
                  <span class="event-title" title="${title}">${title}</span>
                </div>`
    }
    
    return { html: content }
  }
  
  // 단일 일정 표시
  return {
    html: `<div class="custom-event-content">
            <span class="event-title" title="${title}">${title}</span>
          </div>`
  }
}

/**
 * 날짜 셀에 표시할 내용 생성 함수
 * @param {Object} info - FullCalendar의 셀 정보
 * @param {Function} hasLLMSummary - LLM 요약 존재 확인 함수
 * @param {Function} hasBabyDiary - 태교일기 존재 확인 함수
 * @returns {Object} 렌더링할 HTML 내용
 */
export function createDayCellContent(info, hasLLMSummary, hasBabyDiary) {
  // 날짜를 YYYY-MM-DD 형식으로 변환
  const dateStr = normalizeDate(info.date)
  
  // 날짜 텍스트에서 '일' 제거
  const dayNumber = info.dayNumberText.replace('일', '')
  
  // LLM 요약과 아기 일기 존재 여부 확인
  const hasLLM = hasLLMSummary(dateStr)
  const hasDiary = hasBabyDiary(dateStr)
  
  return {
    html: `
      <div class="day-cell-content">
        <span class="fc-daygrid-day-number">${dayNumber}</span>
        ${hasLLM ? '<span class="llm-indicator">•</span>' : ''}
        ${hasDiary ? '<span class="baby-diary-indicator">♥︎</span>' : ''}
      </div>
    `
  }
} 