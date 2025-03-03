/**
 * 날짜 관련 유틸리티 함수 모음
 */

/**
 * 날짜를 한국어 형식으로 포맷팅 (YYYY년 MM월 DD일)
 * @param {string} dateStr - 날짜 문자열
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate (dateStr) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

/**
 * 시간을 HH:MM 형식으로 포맷팅
 * @param {string} dateTimeStr - 날짜시간 문자열
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatTime (dateTimeStr) {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 * @param {string} dateStr - 날짜 문자열
 * @returns {string} 정규화된 날짜 문자열
 */
export function normalizeDate (dateStr) {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

/**
 * 현재 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} 오늘 날짜 문자열
 */
export function getTodayString () {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
