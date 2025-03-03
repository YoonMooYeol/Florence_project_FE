/**
 * 날짜 관련 유틸리티 함수 모음
 */

/**
 * 날짜를 한국어 형식으로 포맷팅 (YYYY년 MM월 DD일)
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate (date) {
  const dateObj = date instanceof Date ? date : new Date(date)
  return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`
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
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 * @param {string|Date} date - 날짜 문자열 또는 Date 객체
 * @returns {string} 정규화된 날짜 문자열
 */
export function normalizeDate (date) {
  if (!date) return ''
  
  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return String(date).split('T')[0]
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
  allDayText: '종일',
  moreLinkText: '개 더보기',
  noEventsText: '일정이 없습니다'
}

/**
 * 요일 배열 (한국어)
 */
export const weekdays = ['일', '월', '화', '수', '목', '금', '토']
