// 로그 레벨 상수
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// 현재 환경 (개발/프로덕션)
const isDevelopment = process.env.NODE_ENV === 'development'

// 최소 로그 레벨 설정
const MIN_LOG_LEVEL = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN

// 현재 시간을 포맷팅된 문자열로 반환
const getFormattedTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('ko-KR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + '.' + now.getMilliseconds().toString().padStart(3, '0')
}

// 로그 메시지 포맷팅
const formatLogArgs = (level, context, args) => {
  const time = getFormattedTime()
  const prefix = `[${time}][${level}][${context}]`
  return [prefix, ...args]
}

// 주어진 레벨에 따라 로그 출력
const log = (levelValue, levelName, context, ...args) => {
  if (levelValue < MIN_LOG_LEVEL) return

  const formattedArgs = formatLogArgs(levelName, context || 'App', args)

  switch (levelName) {
    case 'DEBUG':
      console.debug(...formattedArgs)
      break
    case 'INFO':
      console.info(...formattedArgs)
      break
    case 'ERROR':
      console.error(...formattedArgs)
      break
    default:
      console.log(...formattedArgs)
  }
}

// 디버그 레벨 로그
export const debug = (context, ...args) => {
  log(LOG_LEVELS.DEBUG, 'DEBUG', context, ...args)
}

// 정보 레벨 로그
export const info = (context, ...args) => {
  log(LOG_LEVELS.INFO, 'INFO', context, ...args)
}

// 경고 레벨 로그
export const warn = (context, ...args) => {
  log(LOG_LEVELS.WARN, 'WARN', context, ...args)
}

// 에러 레벨 로그
export const error = (context, ...args) => {
  log(LOG_LEVELS.ERROR, 'ERROR', context, ...args)
}

// 에러 객체의 스택 트레이스 로깅
export const logErrorDetails = (err, context) => {
  error(
    context,
    '에러 세부 정보:',
    {
      message: err.message,
      name: err.name,
      stack: err.stack,
      ...(err.code && { code: err.code }),
      ...(err.response && { response: err.response.data || err.response })
    }
  )
}
