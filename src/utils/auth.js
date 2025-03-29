/**
 * 인증 관련 유틸리티 함수
 */

/**
 * 사용자가 로그인 상태인지 확인
 * @returns {boolean} 로그인 여부
 */
export const isLoggedIn = () => {
  return !!(localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
}

/**
 * 액세스 토큰 가져오기
 * @returns {string|null} 액세스 토큰
 */
export const getAccessToken = () => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
}

/**
 * 리프레시 토큰 가져오기
 * @returns {string|null} 리프레시 토큰
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
}

/**
 * 사용자 ID 가져오기
 * @returns {string|null} 사용자 ID
 */
export const getUserId = () => {
  return localStorage.getItem('userId') || sessionStorage.getItem('userId')
}

/**
 * 임신 ID 가져오기
 * @returns {string|null} 임신 ID
 */
export const getPregnancyId = () => {
  return localStorage.getItem('pregnancyId') || sessionStorage.getItem('pregnancyId')
}

/**
 * 임신 ID 저장하기
 * @param {string} pregnancyId - 저장할 임신 ID
 */
export const savePregnancyId = (pregnancyId) => {
  if (!pregnancyId) return

  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  if (rememberMe) {
    localStorage.setItem('pregnancyId', pregnancyId)
  } else {
    sessionStorage.setItem('pregnancyId', pregnancyId)
  }
}

/**
 * 임신 ID 제거하기
 */
export const removePregnancyId = () => {
  localStorage.removeItem('pregnancyId')
  sessionStorage.removeItem('pregnancyId')
}

/**
 * 모든 인증 정보 제거하기 (로그아웃)
 */
export const clearAuthData = () => {
  // 로그인 관련 정보 삭제
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('userId')
  localStorage.removeItem('userName')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('userId')
  sessionStorage.removeItem('userName')
  
  // 임신 정보 삭제
  localStorage.removeItem('pregnancyId')
  localStorage.removeItem('isPregnant')
  localStorage.removeItem('babyNickname')
  sessionStorage.removeItem('pregnancyId')
  sessionStorage.removeItem('isPregnant')
  sessionStorage.removeItem('babyNickname')
  
  // 온보딩 상태 - localStorage는 유지하고 sessionStorage만 초기화
  // localStorage.removeItem('onboardingCompleted')  // 주석 처리하여 로그아웃해도 유지되도록 함
  sessionStorage.removeItem('onboardingCompleted')
  
  // 캘린더 및 태명 관련 정보 완전히 삭제
  localStorage.removeItem('modalState')
  sessionStorage.removeItem('modalState')
  
  // 사용자별 기본 설정 삭제
  localStorage.removeItem('userPreferences')
  sessionStorage.removeItem('userPreferences')
  
  // 태명과 관련된 추가적인 키 삭제
  const storageKeys = ['태명', 'baby_name', 'baby_nickname', 'nickname']
  storageKeys.forEach(key => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
  
  // 브라우저 콘솔에 로그아웃 및 데이터 삭제 확인 메시지
  console.log('로그아웃 완료: 사용자 데이터 및 태명 정보가 모두 삭제되었습니다.')
}

/**
 * 자동 로그인 여부 확인
 * @returns {boolean} 자동 로그인 여부
 */
export const isRememberMe = () => {
  return localStorage.getItem('rememberMe') === 'true'
} 