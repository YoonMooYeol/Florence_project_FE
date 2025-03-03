/**
 * 에러 핸들링 유틸리티
 * 애플리케이션 전반의 에러 처리를 위한 도구들
 */

import { error } from './logger'

/**
 * 비동기 함수 에러 처리 래퍼
 * @param {Function} fn - 비동기 함수
 * @param {string} context - 에러 발생 컨텍스트
 * @returns {Function} 에러 처리가 추가된 함수
 */
export const asyncErrorHandler = (fn, context) => {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      handleError(err, context)
      throw err // 호출자가 처리할 수 있도록 에러 다시 던지기
    }
  }
}

/**
 * 중앙화된 에러 처리 함수
 * @param {Error} err - 에러 객체
 * @param {string} context - 에러 발생 컨텍스트
 */
export const handleError = (err, context) => {
  // 로깅
  error(context, '에러 발생:', err.message, err.stack)

  // 개발 환경에서는 콘솔에 자세한 정보 출력
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${context}] 에러 상세 정보:`, err)
  }

  // 여기에 에러 모니터링 서비스 연동, 사용자 알림 등 추가 가능
}

/**
 * 컴포넌트 에러 경계 역할을 하는 함수
 * Vue 컴포넌트의 에러 핸들링을 위한 함수
 * @param {Error} err - 에러 객체
 * @param {Object} instance - Vue 컴포넌트 인스턴스
 * @param {string} info - 에러 발생 위치 정보
 */
export const handleComponentError = (err, instance, info) => {
  const componentName = instance?.type?.name || '알 수 없는 컴포넌트'
  handleError(err, `컴포넌트(${componentName})`)
  
  // 로그에 컴포넌트 정보 추가
  error('컴포넌트 에러', {
    componentName,
    info,
    props: instance?.props,
    error: err.message
  })
}

/**
 * 특정 작업 안전하게 실행 (에러 무시)
 * @param {Function} fn - 실행할 함수
 * @param {any} fallbackValue - 에러 발생 시 반환할 기본값
 * @param {string} context - 로깅을 위한 컨텍스트 정보
 * @returns {any} 함수 실행 결과 또는 기본값
 */
export const trySafe = (fn, fallbackValue = null, context = 'trySafe') => {
  try {
    return fn()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      error(context, '무시된 에러:', err.message)
    }
    return fallbackValue
  }
}

export default {
  asyncErrorHandler,
  handleError,
  handleComponentError,
  trySafe
} 