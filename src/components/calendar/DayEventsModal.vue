<script setup>
import { watch, ref, onMounted, computed } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import api from '@/utils/axios'
import DailySummaryComponent from './DailySummaryComponent.vue'

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
const activeTab = ref('schedule') // 초기 활성 탭은 '일정' 탭
const showDiaryModal = ref(false)

// 모달이 열렸을 때 props 변화 감지 및 처리
watch(() => props.show, async (newValue) => {
  if (newValue) {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 열렸습니다:', props.date, '이벤트 수:', props.events ? props.events.length : 0)
    // 모달이 열리면 클릭 방지 설정 (800ms 동안)
    isClickable.value = false

    // 항상 일정 탭부터 시작
    activeTab.value = 'schedule'

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
    }, 800)
  } else {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 닫혔습니다')
  }
})

// babyDiary가 변경될 때 diaryContent 업데이트
watch(() => props.babyDiary, (newDiary) => {
  if (newDiary) {
    diaryContent.value = newDiary.content
  } else {
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

const viewEvent = (event) => {
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

  // 사용자의 명시적인 클릭만 처리하도록 메시지 추가
  console.log('사용자가 일정 항목을 클릭: 이벤트 상세 보기 요청됨', event.title)
  emit('view-event', event)
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
      activeTab: activeTab.value
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
      activeTab: activeTab.value
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
      activeTab: activeTab.value
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

onMounted(async () => {
  console.log('DayEventsModal 마운트됨')

  // 임신 정보 초기화
  await calendarStore.initPregnancyInfo()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- 배경 오버레이 -->
    <div
      class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
      @click="closeModal"
    />

    <!-- 모달 컨테이너 -->
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-dark-gray">
          {{ formatDate(props.date) }}
        </h2>
        <button
          class="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          @click="closeModal"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
          class="flex-1 py-3 text-sm font-medium transition-colors duration-200"
          :class="activeTab === 'schedule' ? 'text-point-yellow border-b-2 border-point-yellow' : 'text-gray-500'"
          @click="activeTab = 'schedule'"
        >
          일정
        </button>
        <button
          class="flex-1 py-3 text-sm font-medium transition-colors duration-200"
          :class="activeTab === 'daily' ? 'text-point-yellow border-b-2 border-point-yellow' : 'text-gray-500'"
          @click="activeTab = 'daily'"
        >
          오늘의 하루
        </button>
        <button
          v-if="calendarStore.isPregnant"
          class="flex-1 py-3 text-sm font-medium transition-colors duration-200"
          :class="activeTab === 'baby' ? 'text-point-yellow border-b-2 border-point-yellow' : 'text-gray-500'"
          @click="activeTab = 'baby'"
        >
          {{ calendarStore.babyNickname }}{{ calendarStore.getJosa(calendarStore.babyNickname, '과', '와') }}의 하루
        </button>
      </div>

      <!-- 탭 컨텐츠 -->
      <div class="modal-content p-4 overflow-y-auto">
        <!-- 일정 탭 -->
        <div v-if="activeTab === 'schedule'">
          <div v-if="calendarStore.eventsForSelectedDate.length === 0" class="text-center py-8">
            <p class="text-gray-500 text-sm">등록된 일정이 없습니다.</p>
            <button
              class="mt-4 px-4 py-2 text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="addEvent"
            >
              일정 등록하기
            </button>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="event in calendarStore.eventsForSelectedDate"
              :key="event.id"
              class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              @click="viewEvent(event)"
            >
              <h3 class="font-medium text-dark-gray">{{ event.title }}</h3>
              <p class="text-sm text-gray-500 mt-1">{{ formatEventTime(event) }}</p>
            </div>
            <button
              class="w-full mt-4 px-4 py-2 text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="addEvent"
            >
              일정 추가
            </button>
          </div>
        </div>

        <!-- 오늘의 하루 탭 -->
        <div v-if="activeTab === 'daily'">
          <DailySummaryComponent
            :date="props.date"
            :llm-summary="calendarStore.llmSummaryForSelectedDate"
            @view-llm-summary="emit('view-llm-summary', $event)"
          />
        </div>

        <!-- 태교일기 탭 -->
        <div v-if="activeTab === 'baby' && calendarStore.isPregnant">
          <div v-if="!calendarStore.babyDiaryForSelectedDate" class="text-center py-8">
            <p class="text-gray-500 text-sm">등록된 일기가 없습니다.</p>
            <button
              class="mt-4 px-4 py-2 text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="showDiaryModal = true"
            >
              일기 작성하기
            </button>
          </div>
          <div v-else class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-gray-700 whitespace-pre-wrap">{{ calendarStore.babyDiaryForSelectedDate.content }}</p>
            </div>
            <div class="flex space-x-2">
              <button
                class="flex-1 px-4 py-2 text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
                @click="showDiaryModal = true"
              >
                수정하기
              </button>
              <button
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                @click="deleteDiary"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 태교일기 작성/수정 모달 -->
    <div
      v-if="showDiaryModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        @click="closeDiaryModal"
      />
      <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-dark-gray">
            {{ calendarStore.babyDiaryForSelectedDate ? '일기 수정하기' : '일기 작성하기' }}
          </h3>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            @click="closeDiaryModal"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        <div class="p-4">
          <textarea
            v-model="diaryContent"
            class="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="오늘 하루는 어땠나요?"
          />
          <div class="flex justify-end space-x-2 mt-4">
            <button
              class="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              @click="closeDiaryModal"
            >
              취소
            </button>
            <button
              class="px-4 py-2 text-sm font-medium text-dark-gray bg-point-yellow rounded-lg hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
              @click="calendarStore.babyDiaryForSelectedDate ? updateDiary() : saveBabyDiary()"
            >
              {{ calendarStore.babyDiaryForSelectedDate ? '수정하기' : '저장하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  max-height: 60vh;
  scrollbar-width: thin;
  scrollbar-color: #FFD600 #F3F4F6;
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #F3F4F6;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #FFD600;
  border-radius: 3px;
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  .max-w-md {
    max-width: 100%;
    margin: 1rem;
  }

  .text-lg {
    font-size: 1rem;
  }

  .p-4 {
    padding: 1rem;
  }

  .modal-content {
    max-height: 50vh;
  }

  .h-40 {
    height: 8rem;
  }

  /* 모바일에서 버튼 터치 영역 확대 */
  button {
    min-height: 44px;
    min-width: 44px;
  }

  /* 모바일에서 텍스트 크기 조정 */
  .text-sm {
    font-size: 0.875rem;
  }

  /* 모바일에서 여백 조정 */
  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }

  .space-y-4 > * + * {
    margin-top: 1rem;
  }
}
</style>
