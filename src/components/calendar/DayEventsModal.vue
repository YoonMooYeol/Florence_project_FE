<script setup>
import { watch, ref, onMounted, computed } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import api from '@/utils/axios'
import DailySummaryComponent from './DailySummaryComponent.vue'
import EventDetailModal from './EventDetailModal.vue'
import EventModal from './EventModal.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  },
  events: {
    type: Array,
    default: () => []
  },
  llmSummary: {
    type: Object,
    default: null
  },
  babyDiary: {
    type: Object,
    default: null
  }
})

// 필요한 상태 변수들
const isClickable = ref(false)
const diaryContent = ref('')
const activeTab = ref('schedule') // 초기 활성 탭을 '일정' 탭으로 되돌림
const showDiaryModal = ref(false)
const showEventModal = ref(false)
const showEventDetailModal = ref(false)
const selectedEvent = ref(null)

// 모달이 열렸을 때 props 변화 감지 및 처리
watch(() => props.show, async (newValue) => {
  if (newValue) {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 열렸습니다:', props.date, '이벤트 수:', props.events ? props.events.length : 0)
    // 모달이 열리면 항상 '일정' 탭으로 설정
    activeTab.value = 'schedule'
    
    // 모달이 열리면 클릭 방지 설정 (300ms 동안)
    isClickable.value = false

    // 이벤트 데이터가 없으면 로딩 표시
    if (!props.events || props.events.length === 0) {
      console.log('DayEventsModal - 이벤트 데이터가 로드되지 않았거나 없습니다. 로딩 표시')
    } else {
      console.log('DayEventsModal - 이벤트 데이터 로드됨:', props.events.length, '개 이벤트')
      // 이벤트는 사용자가 직접 선택하도록 함 (자동 선택 안함)
    }

    setTimeout(() => {
      isClickable.value = true
      console.log('DayEventsModal - 이제 이벤트 클릭 가능')
    }, 300)

    // 현재 모달 상태 및 날짜 저장
    sessionStorage.setItem('modalState', JSON.stringify({
      open: true,
      date: props.date,
      activeTab: 'schedule' // 항상 일정 탭으로 설정
    }))
  } else {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 닫혔습니다')
  }
})

// babyDiary가 변경될 때 diaryContent 업데이트
watch(() => props.babyDiary, (newDiary) => {
  if (newDiary && newDiary.id) {
    // 실제 저장된 일기(id가 있는 경우)만 내용 표시
    diaryContent.value = newDiary.content
  } else {
    // id가 없으면 빈 내용으로 설정
    diaryContent.value = ''
  }
}, { immediate: true })

const emit = defineEmits(['close', 'add-event', 'view-event', 'view-llm-summary'])

const calendarStore = useCalendarStore()

// 태교일기 API URL 기본 경로
const baseUrl = 'calendars/baby-diaries/'



const closeModal = () => {
  console.log('일일 일정 모달 닫기 버튼 클릭')
  emit('close')
}

const addEvent = () => {
  console.log('일정 등록 버튼 클릭')
  emit('add-event')
}

const viewEvent = async (event) => {
  // 클릭 가능 상태가 아니면 무시
  if (!isClickable.value) {
    console.log('모달 열린 직후 클릭 무시됨')
    return
  }

  // 이벤트 객체 검증 - 더 엄격하게 검사
  if (!event || !event.id || !event.title) {
    console.warn('이벤트 객체가 유효하지 않음:', event)
    return
  }

  try {
    console.log('서버에서 최신 이벤트 데이터 확인 중...')
    // 서버에서 최신 이벤트 데이터 가져오기
    const updatedEvent = await calendarStore.fetchEventDetail(event.id)
    
    // 원본 이벤트 객체와 서버에서 가져온 데이터 병합
    let mergedEvent = { ...event, ...updatedEvent }
    
    // 제목이 [매일], [매주], [매월], [매년]으로 시작하는 경우 반복 일정으로 처리
    if (mergedEvent.title && (
      mergedEvent.title.startsWith('[매일]') || 
      mergedEvent.title.startsWith('[매주]') || 
      mergedEvent.title.startsWith('[매월]') || 
      mergedEvent.title.startsWith('[매년]')
    )) {
      console.log('제목 패턴으로 반복 일정 판단:', mergedEvent.title)
      mergedEvent = {
        ...mergedEvent,
        is_recurring: true,
        recurring: 'weekly' // 기본값
      }
    }
    
    // 날짜 형식 표준화 - 항상 ISO 형식으로 제공
    if (mergedEvent.start && !mergedEvent.start.includes('T') && !mergedEvent.allDay) {
      // 시간 정보가 없는 경우 기본 시간 추가 (09:00)
      mergedEvent.start = `${mergedEvent.start}T09:00:00`
    }
    
    if (mergedEvent.end && !mergedEvent.end.includes('T') && !mergedEvent.allDay) {
      // 시간 정보가 없는 경우 기본 시간 추가 (10:00)
      mergedEvent.end = `${mergedEvent.end}T10:00:00`
    }
    
    // 로깅
    console.log('서버에서 가져온 최신 이벤트:', updatedEvent)
    console.log('최종 이벤트 데이터:', mergedEvent)
    
    // 업데이트된 이벤트 정보로 selectedEvent 설정
    selectedEvent.value = mergedEvent
    
    // 약간의 지연 후 모달 열기 (Vue의 반응성이 적용될 시간 확보)
    setTimeout(() => {
      // 이벤트 상세 모달 대신 바로 수정 모달 열기
      showEventModal.value = true
    }, 50)
  } catch (error) {
    console.error('이벤트 데이터 가져오기 실패:', error)
    // 오류 발생 시 원본 이벤트 데이터 사용
    selectedEvent.value = event
    
    // 이벤트 상세 모달 대신 바로 수정 모달 열기
    showEventModal.value = true
  }
}

// 반복 주기 텍스트 변환 함수
const getRecurringText = (recurring) => {
  switch (recurring) {
    case 'daily':
      return '매일'
    case 'weekly':
      return '매주'
    case 'monthly':
      return '매월'
    case 'yearly':
      return '매년'
    default:
      return ''
  }
}

// 이벤트 시간 형식 변환 함수
const formatEventTime = (event) => {
  if (!event) return '시간 정보 없음'

  try {
    if (event.allDay) return '종일'

    if (event.start && event.end) {
      return `${formatTime(event.start)} ~ ${formatTime(event.end)}${event.recurring && event.recurring !== 'none' ? ' (' + getRecurringText(event.recurring) + ')' : ''}`
    } else if (event.start) {
      return `${formatTime(event.start)}${event.recurring && event.recurring !== 'none' ? ' (' + getRecurringText(event.recurring) + ')' : ''}`
    } else {
      return '시간 정보 없음'
    }
  } catch (error) {
    console.error('이벤트 시간 형식 변환 중 오류:', error)
    return '시간 정보 오류'
  }
}

// 태교일기 저장 함수
const saveBabyDiary = async () => {
  console.log('태교일기 저장 시작...')

  try {
    // 날짜 형식 - props.date를 그대로 사용
    const diaryDate = props.date
    if (!diaryDate) {
      console.error('날짜 정보가 없습니다')
      alert('날짜 정보가 없어 저장할 수 없습니다.')
      return
    }

    // 내용이 비어있다면 저장하지 않음
    if (!diaryContent.value || diaryContent.value.trim() === '') {
      alert('일기 내용을 입력해주세요.')
      return
    }

    console.log('태교일기 저장 날짜:', diaryDate)

    // API 요청 바디에 날짜만 포함
    const newDiary = await calendarStore.addBabyDiary({
      date: diaryDate,
      content: diaryContent.value || '' // 내용이 없으면 빈 문자열
    })

    console.log('태교일기 저장 성공:', newDiary)

    // 성공 메시지
    alert('일기가 저장되었습니다.')

    // 모달 닫기
    closeDiaryModal()

    // 선택된 일기 설정 (현재 화면에 표시)
    calendarStore.setSelectedBabyDiary(newDiary)
  } catch (error) {
    console.error('일기 저장 중 오류 발생:', error)
    handleSaveError(error)
  }
}

// 태교일기 저장 중 발생한 오류 처리 함수
const handleSaveError = (error) => {
  console.error('태교일기 저장 오류:', error)

  if (error.response) {
    console.error('오류 상태 코드:', error.response.status)

    if (error.response.data) {
      // 전체 오류 객체 로깅
      console.log('서버 응답 오류 상세 정보:', JSON.stringify(error.response.data))

      // 오류 유형별 처리
      if (error.response.data.diary_date) {
        alert(`날짜 오류: ${error.response.data.diary_date[0]}`)
      } else if (error.response.data.pregnancy) {
        const errorMsg = error.response.data.pregnancy[0]
        console.error('임신 정보 오류:', errorMsg)

        if (errorMsg.includes('존재하지 않습니다')) {
          alert('임신 정보가 존재하지 않습니다. 임신 정보를 등록해주세요.')

          // 임신 정보 등록 페이지로 이동 여부 확인
          if (confirm('임신 정보 등록 페이지로 이동하시겠습니까?')) {
            window.location.href = '/pregnancy/register'
          }
        } else {
          alert(`임신 정보 오류: ${errorMsg}`)
        }
      } else if (error.response.data.error) {
        alert(`저장 실패: ${error.response.data.error}`)
      } else {
        alert('일기 저장에 실패했습니다. 다시 시도해주세요.')
      }
    } else {
      alert(`서버 오류 (${error.response.status}): 일기 저장에 실패했습니다.`)
    }
  } else {
    alert('일기 저장에 실패했습니다. 네트워크 연결을 확인해주세요.')
  }
}

// 태교일기 수정 함수
const updateDiary = async () => {
  if (!props.babyDiary || !props.babyDiary.id) {
    console.error('수정할 일기 정보가 없습니다')
    return
  }

  try {
    // 스토어 함수 사용
    await calendarStore.updateBabyDiary(props.babyDiary.id, diaryContent.value)
    alert('일기가 수정되었습니다.')

    // 다이어리 모달 닫기
    closeDiaryModal()
  } catch (error) {
    console.error('일기 수정 실패:', error)
    alert('일기 수정에 실패했습니다.')
  }
}

// 태교일기 삭제 함수
const deleteDiary = async () => {
  if (!props.babyDiary || !props.babyDiary.id) {
    console.error('삭제할 일기 정보가 없습니다')
    return
  }

  if (!confirm('정말로 이 일기를 삭제하시겠습니까?')) {
    return
  }

  try {
    // 스토어 함수 사용
    await calendarStore.deleteBabyDiary(props.babyDiary.id)
    alert('일기가 삭제되었습니다.')

    // 모달 닫기
    emit('close')
  } catch (error) {
    console.error('일기 삭제 실패:', error)
    alert('일기 삭제에 실패했습니다.')
  }
}

// 사진 업로드
const fileInput = ref(null)
const updateFileInput = ref(null)
const selectedFile = ref(null)
const selectedPhotoId = ref(null)
const isUploading = ref(false)
const isUpdating = ref(false)

// 최대 사진 수 제한
const MAX_PHOTOS = 3

// 현재 사진 수 계산 (컴퓨티드 속성)
const currentPhotoCount = computed(() => {
  if (!props.babyDiary || !props.babyDiary.photos) return 0
  return props.babyDiary.photos.length
})

// 사진을 더 업로드할 수 있는지 확인 (컴퓨티드 속성)
const canUploadMorePhotos = computed(() => {
  return currentPhotoCount.value < MAX_PHOTOS
})

// 파일 선택 이벤트 핸들러
const handleFileSelect = async (event) => {
  event.preventDefault()
  console.log('파일 선택 이벤트 발생')

  // FileList 객체 로깅
  console.log('FileList 객체:', event.target.files)
  console.log('FileList 유효성:', event.target.files ? 'valid' : 'invalid')
  console.log('FileList 길이:', event.target.files ? event.target.files.length : 'N/A')

  if (!event.target.files || event.target.files.length === 0) {
    console.warn('선택된 파일이 없습니다.')
    selectedFile.value = null
    return
  }

  const file = event.target.files[0]
  console.log('선택된 파일:', file.name, file.type, file.size)

  // 이미지 파일 형식 검사
  if (!file.type.match('image.*')) {
    console.error('유효하지 않은 파일 형식:', file.type)
    alert('이미지 파일만 업로드 가능합니다.')
    event.target.value = ''
    selectedFile.value = null
    return
  }

  // 파일 크기 검사 (10MB 제한)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    console.error('파일 크기 초과:', file.size)
    alert('파일 크기는 10MB 이하여야 합니다.')
    event.target.value = ''
    selectedFile.value = null
    return
  }

  selectedFile.value = file
  console.log('파일이 선택되었습니다:', selectedFile.value.name)

  // 파일 선택 즉시 업로드 시작
  await uploadPhoto()
}

// 사진 업로드
const uploadPhoto = async () => {
  console.log('업로드 함수 호출됨')

  if (!selectedFile.value) {
    console.warn('업로드할 파일이 선택되지 않았습니다.')
    return
  }

  if (!props.babyDiary || !props.babyDiary.id) {
    console.error('일기 정보가 없거나 ID가 없습니다.', props.babyDiary)

    // 일기 데이터가 없는 경우 자동으로 생성 시도
    if (props.date) {
      try {
        console.log('일기 자동 생성 시도...')
        const newDiary = await calendarStore.addBabyDiary({
          date: props.date,
          content: ''
        })

        console.log('일기 자동 생성 성공:', newDiary)

        // 성공적으로 일기가 생성되었지만, 아직 props가 업데이트되지 않았을 수 있으므로
        // 생성된 일기 ID를 직접 사용
        const diaryId = newDiary.id

        await uploadPhotoToDiary(diaryId)
      } catch (error) {
        console.error('일기 자동 생성 실패:', error)
        alert('일기 정보를 먼저 저장해주세요.')
      }
      return
    }

    alert('일기 정보를 먼저 저장해주세요.')
    return
  }

  await uploadPhotoToDiary(props.babyDiary.id)
}

// 일기에 사진 업로드하는 헬퍼 함수
const uploadPhotoToDiary = async (diaryId) => {
  // 사진 개수 제한 검사
  if (!canUploadMorePhotos.value) {
    console.warn('최대 사진 개수에 도달했습니다:', currentPhotoCount.value, '/', MAX_PHOTOS)
    alert(`최대 ${MAX_PHOTOS}개의 사진만 업로드할 수 있습니다.`)
    return
  }

  console.log('사진 업로드 시작:', selectedFile.value.name, 'to diary ID:', diaryId)

  // 파일 정보 로깅
  console.log('파일 유형:', selectedFile.value.type)
  console.log('파일 크기:', selectedFile.value.size, 'bytes')
  console.log('파일 마지막 수정일:', new Date(selectedFile.value.lastModified).toISOString())

  // 인증 토큰 확인
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  if (!accessToken) {
    console.error('인증 토큰이 없습니다. 사진을 업로드할 수 없습니다.')
    alert('인증 토큰이 없습니다. 다시 로그인해주세요.')
    return
  }

  isUploading.value = true

  try {
    console.log('calendarStore.addBabyDiaryPhoto 호출 시작')

    // 파일 객체 유효성 최종 확인
    if (!selectedFile.value || !selectedFile.value.name || !selectedFile.value.type) {
      throw new Error('선택된 파일이 유효하지 않습니다.')
    }

    await calendarStore.addBabyDiaryPhoto(diaryId, selectedFile.value)

    console.log('사진 업로드 성공')
    alert('사진이 성공적으로 업로드되었습니다.')

    // 파일 입력 필드 초기화
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    selectedFile.value = null

    // 현재 모달 상태 및 날짜 저장
    sessionStorage.setItem('modalState', JSON.stringify({
      open: true,
      date: props.date,
      activeTab: 'schedule'
    }))
    
    // 페이지 새로고침
    window.location.reload()
  } catch (error) {
    console.error('사진 업로드 실패:', error.response || error)

    let errorMessage = '사진 업로드에 실패했습니다.'

    if (error.response) {
      const status = error.response.status

      if (status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.'
      } else if (status === 403) {
        errorMessage = '권한이 없습니다.'
      } else if (status === 413) {
        errorMessage = '파일 크기가 너무 큽니다.'
      } else if (status === 415) {
        errorMessage = '지원하지 않는 파일 형식입니다.'
      } else if (status === 500) {
        errorMessage = '서버 오류가 발생했습니다.'
      }
    }

    alert(errorMessage)
  } finally {
    isUploading.value = false
  }
}

// 사진 수정 모드 열기
const openUpdatePhoto = (photoId) => {
  selectedPhotoId.value = photoId
  updateFileInput.value.click()
}

// 사진 업데이트 이벤트 핸들러
const handleUpdateFileSelect = (event) => {
  const files = event.target.files
  if (files.length > 0 && selectedPhotoId.value) {
    // 즉시 사진 업데이트 실행
    updatePhoto(selectedPhotoId.value, files[0])
  }
}

// 사진 업데이트
const updatePhoto = async (photoId, file) => {
  if (!photoId || !file) {
    alert('사진 ID와 파일이 필요합니다.')
    return
  }

  if (!props.babyDiary || !props.babyDiary.id) {
    alert('일기 정보를 찾을 수 없습니다.')
    return
  }

  isUpdating.value = true
  selectedPhotoId.value = photoId

  try {
    // 스토어 함수 사용하여 사진 업데이트
    await calendarStore.updateBabyDiaryPhoto(props.babyDiary.id, photoId, file)

    // 입력 필드 초기화
    if (updateFileInput.value) {
      updateFileInput.value.value = ''
    }
    
    // 현재 모달 상태 및 날짜 저장
    sessionStorage.setItem('modalState', JSON.stringify({
      open: true,
      date: props.date,
      activeTab: 'schedule'
    }))
    
    // 페이지 새로고침
    window.location.reload()
  } catch (error) {
    console.error('사진 업데이트 실패:', error)
    let errorMessage = '사진 업데이트에 실패했습니다.'

    // 상세 에러 메시지 확인
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = '사진을 찾을 수 없습니다.'
      }
    }

    alert(errorMessage)
  } finally {
    isUpdating.value = false
    selectedPhotoId.value = null
  }
}

// 사진 삭제
const deletePhoto = async (photoId) => {
  if (!photoId) {
    console.error('사진 ID가 유효하지 않습니다:', photoId)
    alert('유효하지 않은 사진입니다.')
    return
  }

  if (!confirm('이 사진을 삭제하시겠습니까?')) {
    return
  }

  try {
    // 스토어 함수 사용하여 사진 삭제
    await calendarStore.deleteBabyDiaryPhoto(props.babyDiary.id, photoId)
    
    // 현재 모달 상태 및 날짜 저장
    sessionStorage.setItem('modalState', JSON.stringify({
      open: true,
      date: props.date,
      activeTab: 'schedule'
    }))
    
    // 페이지 새로고침
    window.location.reload()
    } catch (error) {
    console.error('사진 삭제 실패:', error)
    let errorMessage = '사진 삭제에 실패했습니다.'

    // 상세 에러 메시지 확인
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = '사진을 찾을 수 없습니다.'
      }
    }

    alert(errorMessage)
  }
}

// 일기 모달 열기
const openDiaryModal = (mode = 'create') => {
  showDiaryModal.value = true

  if (mode === 'edit' && props.babyDiary) {
    // 수정 모드일 경우 기존 내용 표시
    diaryContent.value = props.babyDiary.content
  } else {
    // 생성 모드일 경우 내용 초기화
    diaryContent.value = ''
  }
  
  // 모달이 열린 후 textarea 높이 조절
  setTimeout(() => {
    if (diaryTextarea.value) {
      autoResizeTextarea(diaryTextarea.value)
    }
  }, 100)
}

const closeDiaryModal = () => {
  showDiaryModal.value = false
  diaryContent.value = ''
}

const viewLLMSummary = (summary) => {
  emit('view-llm-summary', summary)
}

// textarea 자동 높이 조절 관련
const diaryTextarea = ref(null)

// textarea 자동 높이 조절 함수
const autoResizeTextarea = (element) => {
  if (!element) return
  
  // 기본 높이로 초기화 (스크롤 높이를 정확히 계산하기 위함)
  element.style.height = 'auto'
  
  // 스크롤 높이로 설정 (내용에 맞게 확장)
  const newHeight = Math.max(100, element.scrollHeight) // 최소 높이 100px
  element.style.height = `${newHeight}px`
}

// diaryContent가 변경될 때마다 높이 조절
watch(diaryContent, () => {
  if (diaryTextarea.value) {
    autoResizeTextarea(diaryTextarea.value)
  }
})

// 썸네일 URL로 변환하는 함수 개선
const getThumbnailUrl = (imageUrl) => {
  // 이미지 URL이 없으면 기본 이미지 경로 반환
  if (!imageUrl) return '/images/photo_placeholder.png'
  
  // 이미 캐시 방지 파라미터가 있는지 확인
  if (imageUrl.includes('_cache=')) {
    return imageUrl
  }

  // 이미지 URL 캐시 방지 및 무작위 쿼리 파라미터 추가
  const randomParam = new Date().getTime()

  // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
  let fullUrl = imageUrl
  // localhost 또는 127.0.0.1 포함 체크
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/media')) {
    fullUrl = window.location.origin + imageUrl
  }
  
  // 썸네일 경로가 포함된 경우 원본 이미지 경로로 변환
  if (fullUrl.includes('_thumbnail')) {
    fullUrl = fullUrl.replace('_thumbnail', '')
  }

  // URL에 이미 쿼리 파라미터가 있는지 확인
  const separator = fullUrl.includes('?') ? '&' : '?'

  // 캐시 방지를 위한 타임스탬프 추가
  return `${fullUrl}${separator}_cache=${randomParam}`
}

// 이미지 로드 오류 처리 함수 개선
function handleImageError(event) {
  // fallback 이미지 URL (실제 사용 중인 기본 이미지 경로로 수정하세요)
  const fallback = '/assets/default-diary-thumbnail.png';
  // 만약 이미 fallback 이미지가 설정되어 있다면 중복 처리하지 않음
  if (event.target.src === fallback) {
    console.log('이미 기본 이미지로 설정되어 있습니다.');
    return;
  }
  console.warn('이미지 로드 오류 발생:', event.target.src);
  // fallback 이미지 적용
  event.target.src = fallback;
  // onerror 핸들러 제거하여 반복 호출 방지
  event.target.onerror = null;
}

// 이미지 로드 성공 처리 함수
const handleImageLoad = (event, photo) => {
  console.log('이미지 로드 성공:', photo.id)
  // 성공적으로 이미지가 로드된 후 처리할 작업이 있으면 여기에 추가
}

const handleEditEvent = (event) => {
  console.log('일정 수정 시작:', event)
  selectedEvent.value = event
  showEventDetailModal.value = false
  showEventModal.value = true
}

const handleDeleteEvent = async (eventId, isRecurring, deleteOptions) => {
  try {
    console.log('DayEventsModal: 일정 삭제 시도', { eventId, isRecurring, deleteOptions })
    
    // 이벤트 ID가 유효한지 확인
    if (!eventId) {
      alert('삭제할 일정 정보가 유효하지 않습니다.')
      return
    }
    
    // 서버에서 최신 이벤트 정보 가져오기
    console.log('서버에서 최신 이벤트 정보 확인 중...')
    const eventDetail = await calendarStore.fetchEventDetail(eventId)
    
    // 실제 반복 일정인지 확인 - 명시적으로 반복 속성이 있는 경우 또는 [매*] 패턴의 제목인 경우
    const isActuallyRecurring = eventDetail && (
      // 직접적인 반복 속성이 있는 경우
      (eventDetail.recurring && eventDetail.recurring !== 'none') ||
      eventDetail.is_recurring === true ||
      (eventDetail.recurrence_pattern && eventDetail.recurrence_pattern !== 'none') ||
      eventDetail.recurringEventId || 
      eventDetail.parentId ||
      // 제목이 [매일], [매주], [매월], [매년]으로 시작하는 경우
      (eventDetail.title && (
        eventDetail.title.startsWith('[매일]') || 
        eventDetail.title.startsWith('[매주]') || 
        eventDetail.title.startsWith('[매월]') || 
        eventDetail.title.startsWith('[매년]')
      ))
    )
    
    // 클라이언트 상태와 서버 상태가 다를 때 처리 (반복 일정이지만 반복 일정으로 처리되지 않은 경우)
    if (isActuallyRecurring && !isRecurring) {
      console.log('서버 확인 결과: 반복 일정으로 확인됨. 삭제 옵션 표시 필요')
      
      // 모달 초기화 후 반복 일정 상태로 다시 열기
      showEventDetailModal.value = false
      
      // 업데이트된 이벤트 정보로 모달 다시 열기
      selectedEvent.value = {
        ...eventDetail,
        is_recurring: true,
        recurring: eventDetail.recurring || 'weekly'
      }
      
      setTimeout(() => {
        showEventDetailModal.value = true
      }, 100)
      
      alert('반복 일정입니다. 삭제 옵션을 선택해주세요.')
      return
    }
    
    // 반복 일정 및 삭제 옵션에 따른 처리
    let success = false
    
    if (isActuallyRecurring || isRecurring) {
      console.log('반복 일정 삭제:', deleteOptions?.option)
      
      if (deleteOptions?.option === 'all_future') {
        if (!deleteOptions.untilDate) {
          // 자동으로 현재 날짜를 untilDate로 설정
          if (selectedEvent.value && selectedEvent.value.start) {
            deleteOptions.untilDate = typeof selectedEvent.value.start === 'string' && selectedEvent.value.start.includes('T') 
              ? selectedEvent.value.start.split('T')[0] 
              : selectedEvent.value.start
            
            console.log('이후 모든 일정 삭제: 자동으로 기준일 설정됨:', deleteOptions.untilDate)
          } else {
            alert('유지할 마지막 날짜를 선택해주세요.')
            return
          }
        }
        console.log('이후 모든 일정 삭제 시도 - 기준날짜:', deleteOptions.untilDate)
        success = await calendarStore.deleteRecurringEventsUntil(eventId, deleteOptions.untilDate)
      } else if (deleteOptions?.option === 'this_only') {
        console.log('이 일정만 삭제 시도')
        success = await calendarStore.deleteRecurringEventThisOnly(eventId)
      } else if (deleteOptions?.option === 'all') {
        console.log('모든 반복 일정 삭제 시도')
        success = await calendarStore.deleteRecurringEvents(eventId)
      } else {
        console.warn('알 수 없는 삭제 옵션:', deleteOptions?.option)
        alert('삭제 옵션을 선택해주세요.')
        return
      }
    } else {
      // 일반 일정 삭제
      console.log('단일 일정 삭제 시도')
      success = await calendarStore.deleteEvent(eventId)
    }
    
    // 삭제 결과 처리
    if (success) {
      console.log('일정 삭제 성공!')
      
      // 열려있는 모달 닫기
      if (showEventDetailModal.value) {
        showEventDetailModal.value = false
      }
      if (showEventModal.value) {
        showEventModal.value = false
      }
      
      // 일일 이벤트 모달 닫기
      emit('close')
      
      // 삭제 성공 메시지
      setTimeout(() => {
        alert('일정이 성공적으로 삭제되었습니다.')
      }, 100)
      
      // 캘린더 새로고침 - 강력한 새로고침을 위해 여러 단계로 처리
      console.log('서버에서 최신 이벤트 데이터 가져오는 중...')
      await calendarStore.fetchEvents()
      
      // 삭제 확인을 위해 이벤트가 실제로 삭제되었는지 확인
      const eventStillExists = calendarStore.events.some(e => e.id === eventId)
      if (eventStillExists) {
        console.warn('삭제된 이벤트가 여전히 존재함 - 다시 한번 서버 데이터 갱신 시도')
        // 한 번 더 서버 데이터 갱신 시도
        setTimeout(async () => {
          await calendarStore.fetchEvents()
        }, 500)
      }
      
      console.log('이벤트 발행: calendar-needs-refresh (삭제)')
      // 새로고침 없이 현재 상태에서 캘린더 리렌더링을 위해 이벤트 발행
      window.dispatchEvent(new CustomEvent('calendar-needs-refresh', {
        detail: { action: 'delete', eventId, timestamp: new Date().getTime() }
      }))
      
      // 약간의 딜레이 후 한 번 더 이벤트 발행 (완전한 갱신 보장)
      setTimeout(() => {
        console.log('이벤트 재발행: calendar-needs-refresh (삭제 - 딜레이)')
        window.dispatchEvent(new CustomEvent('calendar-needs-refresh', {
          detail: { action: 'delete_delayed', eventId, timestamp: new Date().getTime() }
        }))
      }, 1000)
    } else {
      console.warn('일정 삭제 실패 - API에서 성공 결과가 반환되지 않음')
      alert('일정 삭제에 실패했습니다.')
    }
  } catch (error) {
    console.error('DayEventsModal: 일정 삭제 중 오류 발생', error)
    let errorMessage = '일정 삭제에 실패했습니다.'
    
    if (error.response) {
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = Object.entries(error.response.data)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      } else if (error.response.data) {
        errorMessage = error.response.data
      } else {
        errorMessage += ` (${error.response.status})`
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(errorMessage)
  }
}

const handleSaveEvent = async (eventData) => {
  try {
    // 시간 정보가 있는 경우 event_time 필드 추가
    const newEventData = {
      ...eventData,
      event_time: eventData.startTime
    }

    if (!eventData.allDay) {
      // 시간 정보 처리 개선
      if (eventData.start && !eventData.start.includes('T')) {
        // T가 포함되어 있지 않은 경우에만 시간 추가
        newEventData.start = `${eventData.start}T${eventData.startTime}`
      }
      
      if (eventData.end && !eventData.end.includes('T')) {
        // T가 포함되어 있지 않은 경우에만 시간 추가
        newEventData.end = `${eventData.end}T${eventData.endTime}`
      }
    }

    console.log('저장할 이벤트 데이터:', newEventData)
    console.log('반복 설정 값:', newEventData.recurring)
    console.log('반복 일정 여부:', newEventData.recurring && newEventData.recurring !== 'none')
    console.log('반복 일정 수정 옵션:', eventData.updateOption)

    let savedEvent
    if (eventData.id) {
      // 기존 이벤트 수정
      if (eventData.recurring && eventData.recurring !== 'none') {
        // 반복 일정인 경우 특별한 API 사용
        const updateOption = eventData.updateOption || 'this_and_future'
        console.log(`반복 일정 수정 시도 - 옵션: ${updateOption}`)
        savedEvent = await calendarStore.updateRecurringEvent(newEventData, updateOption)
      } else {
        // 일반 일정 수정
        console.log('일반 일정 수정 시도')
        savedEvent = await calendarStore.updateEvent(newEventData)
      }
    } else {
      // 새 이벤트 추가
      console.log('새 이벤트 추가 시도')
      console.log('새 이벤트의 반복 설정:', newEventData.recurring)
      savedEvent = await calendarStore.addEvent(newEventData)
    }
    
    if (savedEvent) {
      console.log('이벤트 저장 성공:', savedEvent)
      console.log('저장된 이벤트의 반복 설정:', savedEvent.recurring, savedEvent.is_recurring)
    } else {
      console.warn('이벤트는 저장되었지만 반환된 데이터가 없습니다')
    }
    
    // 모달 닫기
    showEventModal.value = false
    
    // 이벤트 목록 갱신 - 강력한 새로고침을 위해 바로 fetchEvents 호출
    await calendarStore.fetchEvents()
    
    // 현재 모달 상태 및 날짜 저장 (페이지 새로고침 없이 즉시 반영을 위해)
    sessionStorage.setItem('modalState', JSON.stringify({
      open: true,
      date: props.date,
      activeTab: 'schedule'
    }))
    
    // 새로고침 없이 현재 상태에서 캘린더 리렌더링을 위해 이벤트 발행
    console.log('이벤트 발행: calendar-needs-refresh')
    window.dispatchEvent(new CustomEvent('calendar-needs-refresh', {
      detail: { action: 'save', eventId: savedEvent?.id || eventData.id }
    }))
    
    // 약간의 딜레이 후 한 번 더 이벤트 발행 (완전한 갱신 보장)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('calendar-needs-refresh', {
        detail: { action: 'save_delayed', eventId: savedEvent?.id || eventData.id }
      }))
    }, 500)
    
    return savedEvent
    } catch (error) {
    console.error('이벤트 저장 중 오류:', error)
    let errorMessage = '일정 저장에 실패했습니다.'
    
    if (error.response) {
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = Object.entries(error.response.data)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      } else if (error.response.data) {
        errorMessage = error.response.data
      } else {
        errorMessage += ` (${error.response.status})`
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(errorMessage)
    throw error
  }
}

onMounted(async () => {
  console.log('DayEventsModal 마운트됨')

  // 로컬 또는 세션에서 저장된 이전 태명 정보 삭제
  if (localStorage.getItem('babyNickname') === '(태명)') {
    localStorage.removeItem('babyNickname')
  }
  if (sessionStorage.getItem('babyNickname') === '(태명)') {
    sessionStorage.removeItem('babyNickname')
  }

  // 임신 정보 초기화
  const success = await calendarStore.initPregnancyInfo()
  console.log('DayEventsModal - 임신 정보 초기화 결과:', success)
  console.log('DayEventsModal - 임신 상태(isPregnant):', calendarStore.isPregnant)
  console.log('DayEventsModal - 태명(babyNickname):', calendarStore.babyNickname)
  
  // 태명이 없으면 '그리움'으로 설정 (앞서 null인 경우 store에서 '그리움'으로 설정된 경우가 많겠지만, 이중 확인)
  if (!calendarStore.babyNickname) {
    console.log('DayEventsModal - 태명이 없어 기본값 설정')
    calendarStore.babyNickname = '그리움'
  }
  
  // 기본 탭을 일정으로 설정
  activeTab.value = 'schedule'
})

// 태명과 조사를 안전하게 표시하는 계산된 속성 추가
const babyTabLabel = computed(() => {
  // 태명이 없거나 null인 경우 '(태명)'을 사용
  const nickname = calendarStore.babyNickname || '그리움'
  const josa = calendarStore.getJosa(nickname, '과', '와')
  console.log('태명 탭 레이블 계산:', nickname, josa)
  return `${nickname}${josa}의 하루`
})
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          {{ formatDate(date) }}
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="closeModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- 탭 메뉴 -->
      <div class="flex border-b border-gray-200">
        <button
          class="flex-1 py-3 px-4 text-center font-medium transition-colors text-sm"
          :class="activeTab === 'schedule' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'schedule'"
        >
          일정
        </button>
        <button
          class="flex-1 py-3 px-4 text-center font-medium transition-colors text-sm"
          :class="activeTab === 'daily' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'daily'"
        >
          오늘의 하루
        </button>
        <button
          v-if="calendarStore.pregnancyId"
          class="flex-1 py-3 px-4 text-center font-medium transition-colors text-sm"
          :class="activeTab === 'baby' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          data-tab="baby"
          @click="activeTab = 'baby'"
        >
          {{ babyTabLabel }}
        </button>
      </div>

      <div class="h-96 p-6 bg-ivory overflow-y-auto">
        <!-- 일정 탭 -->
        <div
          v-if="activeTab === 'schedule'"
          class="space-y-4"
        >
          <div
            v-if="events && events.length > 0"
            class="space-y-2"
          >
            <div
              v-for="event in events"
              :key="event.id"
              class="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50"
              @click="viewEvent(event)"
            >
              <h4 class="font-medium text-dark-gray">
                {{ event.title }}
                <span
                  v-if="event.recurring && event.recurring !== 'none'"
                  class="text-sm text-gray-500 ml-2"
                >
                  ({{ getRecurringText(event.recurring) }})
                </span>
              </h4>
              <p class="text-sm text-gray-500">
                {{ formatEventTime(event) }}
              </p>
            </div>
          </div>
          <div
            v-else
            class="text-center py-4"
          >
            <p class="text-gray-500">
              등록된 일정이 없습니다.
            </p>
          </div>
          <div class="flex justify-center">
            <button
              class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
              @click="addEvent"
            >
              일정 추가
            </button>
          </div>
        </div>

        <!-- 오늘의 하루 탭 -->
        <div
          v-if="activeTab === 'daily'"
          class="space-y-4"
        >
          <DailySummaryComponent
            :selected-date="date"
            @open-full-summary="viewLLMSummary"
          />
        </div>

        <!-- 아기와의 하루 탭 -->
        <div
          v-if="activeTab === 'baby'"
          class="space-y-4"
        >
          <div
            v-if="babyDiary && babyDiary.id && babyDiary.content"
            class="space-y-6"
          >
            <!-- 사진 갤러리 -->
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-medium text-gray-600">
                  태교일기 사진 ({{ currentPhotoCount }}/{{ MAX_PHOTOS }})
                </h4>
                <button
                  v-if="canUploadMorePhotos"
                  @click="fileInput.click()"
                  class="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                >
                  사진 추가
                </button>
              </div>
              
              <div v-if="babyDiary.photos && babyDiary.photos.length > 0" class="grid grid-cols-1 gap-4">
                <div
                  v-for="photo in babyDiary.photos"
                  :key="photo.id"
                  class="relative rounded-lg overflow-hidden shadow-sm group border-2 border-gray-200"
                  style="aspect-ratio: 16/9; height: 180px;"
                >
                  <img
                    :src="getThumbnailUrl(photo.image)"
                    :alt="'태교일기 사진'"
                    class="w-full h-full object-cover"
                    loading="eager"
                    @error="handleImageError($event)"
                    @load="handleImageLoad($event, photo)"
                  >

                  <!-- 마우스 오버 효과 -->
                  <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200" />

                  <!-- 버튼 -->
                  <div class="absolute top-1 right-1 flex space-x-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      class="bg-blue-500 text-white rounded-full p-1.5 shadow-md"
                      title="사진 수정"
                      @click.prevent.stop="openUpdatePhoto(photo.id)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      class="bg-red-500 text-white rounded-full p-1.5 shadow-md"
                      title="사진 삭제"
                      @click.prevent.stop="deletePhoto(photo.id)"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div
                    v-if="isUpdating && selectedPhotoId === photo.id"
                    class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
                  >
                    <div class="text-white text-sm">
                      업데이트 중...
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 사진이 없고 추가할 수 있는 경우 사진 추가 버튼 표시 -->
              <div v-else-if="canUploadMorePhotos" class="flex justify-center my-4">
                <button
                  @click="fileInput.click()"
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  사진 등록하기
                </button>
              </div>
              
              <!-- 업로드 중 표시 -->
              <div v-if="isUploading" class="flex justify-center my-2">
                <div class="text-blue-500 text-sm flex items-center">
                  <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  사진 업로드 중...
                </div>
              </div>
            </div>

            <!-- 일기 내용 -->
            <div class="bg-white p-4 rounded-lg shadow">
              <p class="text-dark-gray whitespace-pre-line break-words overflow-auto max-h-none">
                {{ babyDiary.content }}
              </p>
            </div>
            
            <!-- 일기 작성/수정 버튼 -->
            <div class="flex space-x-2">
              <button
                class="flex-1 px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-medium"
                @click="openDiaryModal('edit')"
              >
                일기 수정
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-center py-4"
          >
            <p class="text-gray-500">
              기록된 일기가 없습니다.
            </p>
            <div class="flex flex-col items-center space-y-3 mt-4">
              <button
                class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
                @click="openDiaryModal('create')"
              >
                기록하기
              </button>
              
              <!-- 일기가 없는 경우에도 사진 등록 버튼 표시 -->
              <button
                @click="fileInput.click()"
                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                사진 등록하기
              </button>
            </div>
          </div>
        </div>
      </div>
          </div>
        </div>

  <!-- 태교일기 작성 모달 -->
  <div
    v-if="showDiaryModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg w-full max-w-md mx-auto">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">
          오늘 하루 기록하기 ♥︎
        </h3>
            <textarea
              v-model="diaryContent"
          class="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
              placeholder="아기와의 소중한 하루를 기록해보세요...♥︎"
              ref="diaryTextarea"
            />
            <div class="flex justify-end space-x-2 mt-4">
              <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="closeDiaryModal"
          >
            취소
          </button>
          <button
            v-if="!babyDiary || !babyDiary.id"
                class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
                @click="saveBabyDiary"
              >
                저장하기
              </button>
          <button
            v-else
            class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
            @click="updateDiary"
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 숨겨진 파일 입력 필드들 -->
  <input
    ref="fileInput"
    type="file"
    class="hidden"
    accept=".jpg,.jpeg,.png,.gif"
    @change="handleFileSelect"
  >
  <input
    ref="updateFileInput"
    type="file"
    class="hidden"
    accept=".jpg,.jpeg,.png,.gif"
    @change="handleUpdateFileSelect"
  >

  <!-- 일정 상세 모달 -->
  <!-- 직접 표시 대신 필요한 경우에만 프로그래밍 방식으로 호출
  <EventDetailModal
    v-if="showEventDetailModal"
    :show="showEventDetailModal"
    :event="selectedEvent"
    @close="showEventDetailModal = false"
    @delete="handleDeleteEvent"
    @edit="handleEditEvent"
  />
  -->
  
  <!-- 일정 등록/수정 모달 -->
  <EventModal
    v-if="showEventModal"
    :show="showEventModal"
    :event="selectedEvent"
    :date="date"
    @close="showEventModal = false"
    @save="handleSaveEvent"
    @delete="handleDeleteEvent"
  />
</template>

<style scoped>
.bg-point {
  background-color: #FFD600;
}
.bg-ivory {
  background-color: #FFFAE0;
}
.text-dark-gray {
  color: #353535;
}
.text-point {
  color: #FFD600;
}
.border-point {
  border-color: #FFD600;
}
</style>
