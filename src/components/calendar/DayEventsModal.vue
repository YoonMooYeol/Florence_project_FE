<script setup>
import { watch, ref, onMounted } from 'vue'
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
      console.log('DayEventsModal - 이벤트 데이터가 로드되지 않았거나 없습니다. 로딩 표시');
    } else {
      console.log('DayEventsModal - 이벤트 데이터 로드됨:', props.events.length, '개 이벤트');
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

// 태교일기 생성 함수
const createBabyDiary = (pregnancyId, diaryData) => {
  return api.post(`${baseUrl}pregnancy/${pregnancyId}/`, diaryData)
}

// 태교일기 수정 함수 (diary_id로)
const updateBabyDiary = (diaryId, diaryData) => {
  return api.put(`${baseUrl}${diaryId}/diary/`, diaryData)
}

// 태교일기 삭제 함수 (diary_id로)
const deleteBabyDiary = (diaryId) => {
  return api.delete(`${baseUrl}${diaryId}/diary/`)
}

// 태교일기 조회 함수 (diary_id로)
const getBabyDiary = (diaryId) => {
  return api.get(`${baseUrl}${diaryId}/diary/`)
}

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
  if (!event) return '시간 정보 없음';
  
  try {
    if (event.allDay) return '종일';
    
    if (event.start && event.end) {
      return `${formatTime(event.start)} ~ ${formatTime(event.end)}${event.recurring && event.recurring !== 'none' ? ' (' + getRecurringText(event.recurring) + ')' : ''}`;
    } else if (event.start) {
      return `${formatTime(event.start)}${event.recurring && event.recurring !== 'none' ? ' (' + getRecurringText(event.recurring) + ')' : ''}`;
    } else {
      return '시간 정보 없음';
    }
  } catch (error) {
    console.error('이벤트 시간 형식 변환 중 오류:', error);
    return '시간 정보 오류';
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
      content: diaryContent.value || ''  // 내용이 없으면 빈 문자열
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
  console.error('태교일기 저장 오류:', error);
  
  if (error.response) {
    console.error('오류 상태 코드:', error.response.status);
    
    if (error.response.data) {
      // 전체 오류 객체 로깅
      console.log('서버 응답 오류 상세 정보:', JSON.stringify(error.response.data));
      
      // 오류 유형별 처리
      if (error.response.data.diary_date) {
        alert(`날짜 오류: ${error.response.data.diary_date[0]}`);
      } 
      else if (error.response.data.pregnancy) {
        const errorMsg = error.response.data.pregnancy[0];
        console.error('임신 정보 오류:', errorMsg);
        
        if (errorMsg.includes('존재하지 않습니다')) {
          alert('임신 정보가 존재하지 않습니다. 임신 정보를 등록해주세요.');
          
          // 임신 정보 등록 페이지로 이동 여부 확인
          if (confirm('임신 정보 등록 페이지로 이동하시겠습니까?')) {
            window.location.href = '/pregnancy/register';
          }
        } else {
          alert(`임신 정보 오류: ${errorMsg}`);
        }
      }
      else if (error.response.data.error) {
        alert(`저장 실패: ${error.response.data.error}`);
      } 
      else {
        alert('일기 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } else {
      alert(`서버 오류 (${error.response.status}): 일기 저장에 실패했습니다.`);
    }
  } else {
    alert('일기 저장에 실패했습니다. 네트워크 연결을 확인해주세요.');
  }
};

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

// 사진 업로드 함수
const fileInput = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)

// 파일 선택 버튼 클릭 이벤트
const openFileSelector = () => {
  fileInput.value.click()
}

// 파일 선택 이벤트 핸들러
const handleFileSelect = (event) => {
  const files = event.target.files
  if (files.length > 0) {
    selectedFile.value = files[0]
    uploadPhoto()
  }
}

// 사진 업로드
const uploadPhoto = async () => {
  if (!selectedFile.value) {
    return
  }
  
  if (!props.babyDiary || !props.babyDiary.id) {
    alert('먼저 일기를 저장해주세요.')
    return
  }
  
  isUploading.value = true
  
  try {
    // 스토어 함수 사용하여 사진 업로드
    await calendarStore.addBabyDiaryPhoto(props.babyDiary.id, selectedFile.value)
    
    // 사진 목록 새로고침
    await calendarStore.fetchBabyDiaryPhotos(props.babyDiary.id)
    
    // 입력 필드 초기화
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    console.error('사진 업로드 실패:', error)
    alert('사진 업로드에 실패했습니다.')
  } finally {
    isUploading.value = false
  }
}

// 사진 삭제
const deletePhoto = async (photoId) => {
  if (!confirm('이 사진을 삭제하시겠습니까?')) {
    return
  }
  
  try {
    // 스토어 함수 사용하여 사진 삭제
    await calendarStore.deleteBabyDiaryPhoto(props.babyDiary.id, photoId)
    alert('사진이 삭제되었습니다.')
  } catch (error) {
    console.error('사진 삭제 실패:', error)
    alert('사진 삭제에 실패했습니다.')
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
}

const closeDiaryModal = () => {
  showDiaryModal.value = false
  diaryContent.value = ''
}

const viewLLMSummary = (summary) => {
  emit('view-llm-summary', summary)
}

onMounted(async () => {
  console.log('DayEventsModal 마운트됨')
  
  // 임신 정보 초기화
  await calendarStore.initPregnancyInfo()
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
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'schedule' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'schedule'"
        >
          일정
        </button>
        <button
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'daily' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'daily'"
        >
          오늘의 하루
        </button>
        <button
          v-if="calendarStore.isPregnant"
          class="flex-1 py-3 px-4 text-center font-medium transition-colors"
          :class="activeTab === 'baby' ? 'text-point border-b-2 border-point' : 'text-gray-500 hover:text-gray-700'"
          data-tab="baby"
          @click="activeTab = 'baby'"
        >
          {{ calendarStore.babyNickname }}{{ calendarStore.getJosa(calendarStore.babyNickname, '과', '와') }}의 하루
        </button>
      </div>

      <div class="h-96 p-6 bg-ivory overflow-y-auto">
        <!-- 일정 탭 -->
        <div v-if="activeTab === 'schedule'" class="space-y-4">
          <div v-if="events && events.length > 0" class="space-y-2">
            <div
              v-for="event in events"
              :key="event.id"
              class="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50"
              @click="viewEvent(event)"
            >
              <h4 class="font-medium text-dark-gray">
                {{ event.title }}
                <span v-if="event.recurring && event.recurring !== 'none'" class="text-sm text-gray-500 ml-2">
                  ({{ getRecurringText(event.recurring) }})
                </span>
              </h4>
              <p class="text-sm text-gray-500">
                {{ formatEventTime(event) }}
              </p>
            </div>
          </div>
          <div v-else class="text-center py-4">
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
        <div v-if="activeTab === 'daily'" class="space-y-4">
          <DailySummaryComponent 
            :selected-date="date" 
            @open-full-summary="viewLLMSummary"
          />
        </div>

        <!-- 아기와의 하루 탭 -->
        <div v-if="activeTab === 'baby'" class="space-y-4">
          <div v-if="babyDiary" class="space-y-6">
            <!-- 일기 내용 -->
            <div class="bg-white p-4 rounded-lg shadow">
              <p class="text-dark-gray whitespace-pre-line">
                {{ babyDiary.content }}
              </p>
            </div>
            
            <!-- 사진 갤러리 -->
            <div v-if="babyDiary.photos && babyDiary.photos.length > 0" class="space-y-3">
              <h4 class="text-sm font-medium text-gray-600">태교일기 사진</h4>
              <div class="grid grid-cols-2 gap-2">
                <div 
                  v-for="photo in babyDiary.photos" 
                  :key="photo.id" 
                  class="relative rounded-lg overflow-hidden shadow-sm group"
                >
                  <img 
                    :src="photo.image" 
                    :alt="'태교일기 사진'" 
                    class="w-full h-32 object-cover"
                  />
                  <button 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    @click.stop="deletePhoto(photo.id)"
                    title="사진 삭제"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 사진 추가 버튼 -->
            <div class="flex space-x-2">
              <input
                type="file"
                ref="fileInput"
                accept="image/*"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                class="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center justify-center space-x-1"
                @click="openFileSelector"
                :disabled="isUploading"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11a2 2 0 104 0 2 2 0 00-4 0z" />
                </svg>
                <span>사진 추가</span>
                <span v-if="isUploading" class="ml-1">(업로드 중...)</span>
              </button>
              <button
                class="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center space-x-1"
                @click="openDiaryModal('edit')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>수정</span>
              </button>
              <button
                class="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center justify-center space-x-1"
                @click="deleteDiary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>삭제</span>
              </button>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500">
              기록된 일기가 없습니다.
            </p>
          </div>
          <div class="flex justify-center" v-if="!babyDiary">
            <button
              class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
              @click="openDiaryModal('create')"
            >
              기록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 태교일기 작성 모달 -->
  <div v-if="showDiaryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-full max-w-md mx-auto">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">오늘 하루 기록하기 ♥︎</h3>
        <textarea
          v-model="diaryContent"
          class="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-64"
          placeholder="아기와의 소중한 하루를 기록해보세요...♥︎"
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

