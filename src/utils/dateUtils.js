/**
 * 날짜 관련 유틸리티 함수 모음
 */

/**
 * 날짜를 한국어 형식으로 포맷팅 (YYYY년 MM월 DD일 (요일))
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate (date) {
  const dateObj = date instanceof Date ? date : new Date(date)
  const dayOfWeek = weekdays[dateObj.getDay()]
  return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayOfWeek})`
}

/**
 * 시간을 HH:MM 형식으로 포맷팅
 * @param {string|Date} dateTime - 날짜시간 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatTime (dateTime) {
  if (!dateTime) return ''
  const dateObj = dateTime instanceof Date ? dateTime : new Date(dateTime)
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 정규화합니다.
 * @param {Date|string} date - 정규화할 날짜
 * @returns {string} YYYY-MM-DD 형식의 문자열
 */
export function normalizeDate (date) {
  // null이나 undefined인 경우 현재 날짜 사용
  if (!date) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  // Date 객체인 경우
  if (date instanceof Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  // 문자열인 경우
  else if (typeof date === 'string') {
    // 이미 YYYY-MM-DD 형식인지 확인
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }

    // ISO 형식 문자열(T 포함)인 경우
    if (date.includes('T')) {
      // 날짜 부분만 사용
      const parts = date.split('T')
      if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        return parts[0]
      }
    }

    // 다른 형식의 문자열은 Date 객체로 변환 시도
    const d = new Date(date)
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }

  // 변환 실패 시 현재 날짜 반환
  console.error('유효하지 않은 날짜 형식:', date)
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 현재 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} 오늘 날짜 문자열
 */
export function getTodayString () {
  return normalizeDate(new Date())
}

/**
 * 두 날짜가 같은 날인지 확인
 * @param {string|Date} date1 - 첫 번째 날짜
 * @param {string|Date} date2 - 두 번째 날짜
 * @returns {boolean} 같은 날짜인지 여부
 */
export function isSameDay (date1, date2) {
  if (!date1 || !date2) return false

  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

/**
 * 날짜를 YYYY-MM-DD HH:MM 형식으로 포맷팅
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜시간 문자열
 */
export function formatDateTime (date) {
  if (!date) return ''

  const dateObj = date instanceof Date ? date : new Date(date)
  const dateStr = normalizeDate(dateObj)
  const timeStr = formatTime(dateObj)

  return `${dateStr} ${timeStr}`
}

/**
 * 이벤트 날짜를 안전하게 포맷팅하는 함수
 * @param {Object} event - 이벤트 객체
 * @param {string} type - 시작일(start) 또는 종료일(end)
 * @returns {string} 포맷팅된 날짜 문자열 또는 빈 문자열
 */
export function formatEventDate (event, type = 'start') {
  if (!event) return ''

  const dateString = event[type]
  if (!dateString) return ''

  try {
    // T로 분리된 날짜와 시간을 처리
    if (dateString.includes('T')) {
      const [datePart, timePart] = dateString.split('T')
      if (!datePart) return ''

      // 날짜 부분만 필요한 경우
      return datePart
    }

    // 이미 날짜 형식인 경우 그대로 반환
    return dateString
  } catch (error) {
    console.error('날짜 포맷팅 중 오류 발생:', error)
    return ''
  }
}

/**
 * 이벤트 종료일을 FullCalendar 표시용으로 조정하는 함수
 * 중요! 이 함수가 시스템 내에서 이벤트 종료일을 조정하는 유일한 함수여야 합니다.
 * 
 * FullCalendar는 end date를 exclusive로 처리하기 때문에, 
 * 실제 마지막 날짜에 이벤트가 표시되도록 하려면 원래 종료일에서 며칠 더해야 합니다.
 * 
 * @param {string} endDate - 원본 종료일 (YYYY-MM-DD 형식)
 * @param {boolean} hasTimeComponent - 시간 정보가 있는지 여부
 * @param {string} startDate - 시작일 (종료일이 없는 경우 사용)
 * @param {number} daysToAdd - 추가할 일수 (기본값: 1)
 * @returns {string} 조정된 종료일 (YYYY-MM-DD 형식)
 */
export function adjustEventEndDate(endDate, hasTimeComponent = false, startDate = null, daysToAdd = 1) {
  // 종료일이 없으면 시작일 사용
  if (!endDate && startDate) {
    endDate = startDate;
  }
  
  // 종료일이 없으면 처리 불가
  if (!endDate) {
    console.error('조정할 종료일이 없습니다.');
    return '';
  }
  
  // 시간 정보가 있으면 조정하지 않음
  if (hasTimeComponent) {
    return endDate;
  }
  
  try {
    // 원본 종료일 저장 (디버깅용)
    const originalEndDate = endDate;
    
    // 날짜 조정
    const date = new Date(endDate);
    date.setDate(date.getDate() + daysToAdd);
    const adjustedEndDate = normalizeDate(date);
    
    console.log(`[adjustEventEndDate] 종료일 조정: ${originalEndDate} → ${adjustedEndDate} (+${daysToAdd}일)`);
    
    return adjustedEndDate;
  } catch (error) {
    console.error('종료일 조정 중 오류 발생:', error);
    return endDate; // 오류 발생 시 원본 값 그대로 반환
  }
}

/**
 * 한국어 로케일 설정 (FullCalendar용)
 */
export const koLocale = {
  code: 'ko',
  buttonText: {
    prev: '이전',
    next: '다음',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    list: '일정목록'
  },
  weekText: '주',
  allDayText: '하루 종일',
  moreLinkText: '개 더보기',
  noEventsText: '일정이 없습니다'
}

/**
 * 요일 배열 (한국어)
 */
export const weekdays = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 출산예정일로부터 현재 임신 주차 계산
 * @param {string|Date} dueDate - 출산예정일
 * @returns {number} 현재 임신 주차 (1-40)
 */
export function calculateWeekFromDueDate (dueDate) {
  if (!dueDate) return 0

  const today = new Date()
  const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate)

  // 출산예정일에서 오늘까지 남은 일수 계산
  const daysLeft = Math.floor((dueDateObj - today) / (1000 * 60 * 60 * 24))

  // 정상 임신 기간은 40주(280일)
  // 남은 일수를 기반으로 현재 주차 계산 (40주 - 남은 주)
  const weeksLeft = Math.ceil(daysLeft / 7)
  const currentWeek = 40 - weeksLeft

  // 1주차와 40주차 사이로 제한
  return Math.max(1, Math.min(40, currentWeek))
}

/**
 * 현재 임신 주차로부터 출산예정일 계산
 * @param {number} currentWeek - 현재 임신 주차 (1-40)
 * @returns {string} 출산예정일 (YYYY-MM-DD 형식)
 */
export function calculateDueDateFromWeek (currentWeek) {
  if (!currentWeek || currentWeek < 1 || currentWeek > 40) return ''

  const today = new Date()

  // 남은 주차 계산
  const weeksLeft = 40 - currentWeek

  // 남은 주차를 일수로 변환하여 오늘 날짜에 더함
  const daysLeft = weeksLeft * 7
  const dueDate = new Date(today.getTime() + daysLeft * 24 * 60 * 60 * 1000)

  return normalizeDate(dueDate)
}

/**
 * 마지막 생리일로부터 임신 주차와 출산예정일 계산
 * @param {string|Date} lastPeriodDate - 마지막 생리 시작일
 * @returns {Object} 현재 임신 주차와 출산예정일 객체
 */
export function calculateFromLastPeriod (lastPeriodDate) {
  if (!lastPeriodDate) return { currentWeek: 0, dueDate: '' }

  const periodDate = lastPeriodDate instanceof Date ? lastPeriodDate : new Date(lastPeriodDate)
  const today = new Date()

  // 1. 출산예정일 계산 (마지막 생리일 + 280일)
  const dueDateObj = new Date(periodDate)
  dueDateObj.setDate(periodDate.getDate() + 280)
  const dueDate = normalizeDate(dueDateObj)

  // 2. 임신 주차 계산 (오늘 - 마지막 생리일) / 7
  const daysPassed = Math.floor((today - periodDate) / (1000 * 60 * 60 * 24))
  const currentWeek = Math.floor(daysPassed / 7) + 1 // 1주차부터 시작

  // 현재 주차가 1~40 사이인지 검증
  const validWeek = Math.max(1, Math.min(40, currentWeek))

  return {
    currentWeek: validWeek,
    dueDate
  }
}
