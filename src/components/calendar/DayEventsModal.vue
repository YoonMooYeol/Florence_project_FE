<script setup>
import { watch, ref, onMounted } from 'vue'
import { formatDate, formatTime, toYYYYMMDD } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'
import api from '@/utils/axios'

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
const isLoading = ref(false)
const currentDiaryId = ref(null)

// 모달이 열렸을 때 props 변화 감지 및 처리
watch(() => props.show, async (newValue) => {
  if (newValue) {
    console.log('DayEventsModal 컴포넌트에서 - 일일 일정 모달이 열렸습니다:', props.date, '이벤트 수:', props.events ? props.events.length : 0)
    console.log('현재 일기 데이터:', props.babyDiary)
    
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
watch(() => props.babyDiary, (newDiary, oldDiary) => {
  console.log('babyDiary 변경 감지', newDiary);
  console.log('이전 diary:', oldDiary, '새 diary:', newDiary);
  
  if (newDiary) {
    console.log('일기 내용 업데이트:', newDiary.content);
    diaryContent.value = newDiary.content || '';
    
    // 일기가 있는 경우, 수정 모달 열 때 내용 복사
    if (showDiaryModal.value) {
      console.log('일기 수정 모달에 내용 설정:', newDiary.content);
      diaryContent.value = newDiary.content || '';
    }
  } else {
    console.log('일기 내용 초기화');
    diaryContent.value = '';
  }
}, { immediate: true, deep: true })

// date prop이 변경될 때 처리
watch(() => props.date, (newDate, oldDate) => {
  console.log('date prop 변경:', oldDate, '->', newDate);
  if (!newDate) {
    console.warn('date prop이 유효하지 않습니다:', newDate);
  }
})

const emit = defineEmits(['close', 'add-event', 'view-event', 'view-llm-summary', 'refresh-calendar'])

const calendarStore = useCalendarStore()

const baseUrl = 'calendars/baby-diaries/'

const createBabyDiary = (diaryData) => {
  return api.post(baseUrl, diaryData)
}

// 알림 메시지 표시 함수
const sendNotification = (message, type) => {
  console.log(`알림: ${message} (유형: ${type})`);
  alert(message);
}

// 태교일기 데이터 갱신 함수
const refreshBabyDiary = async () => {
  try {
    console.log('태교일기 데이터 갱신 시작');
    if (!props.date) {
      console.error('날짜 정보가 없어 일기 데이터를 갱신할 수 없습니다');
      return;
    }

    // 전체 일기 데이터 갱신 - 캘린더의 하트 표시를 위함
    console.log('전체 일기 데이터 갱신 시도');
    await calendarStore.fetchBabyDiaries();
    console.log('전체 일기 데이터 갱신 완료');
    
    // 선택한 날짜에 대한 일기 데이터 다시 가져오기
    console.log('선택 날짜 일기 데이터 조회:', props.date);
    const diaryData = await calendarStore.fetchBabyDiaryByDate(props.date);
    
    // 일기 데이터가 존재하는지 확인
    if (diaryData) {
      console.log('선택 날짜 일기 데이터 조회 성공:', diaryData);
    } else {
      console.log('선택 날짜 일기 데이터가 없습니다');
    }
    
    // 부모 컴포넌트에 캘린더 새로고침 요청
    console.log('캘린더 새로고침 요청 이벤트 발생');
    emit('refresh-calendar');
    
    console.log('태교일기 데이터 갱신 완료');
    
    return diaryData;
  } catch (error) {
    console.error('태교일기 데이터 갱신 중 오류:', error);
    // 오류가 발생해도 캘린더 업데이트는 시도
    try {
      emit('refresh-calendar');
    } catch (refreshError) {
      console.error('캘린더 새로고침 요청 중 오류:', refreshError);
    }
    return null;
  }
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
  try {
    isLoading.value = true;
    console.log('태교일기 저장 시작');
    console.log('현재 임신 ID:', calendarStore.pregnancyId);
    console.log('현재 일기 내용:', diaryContent.value);
    
    // 임신정보 먼저 확인
    if (!calendarStore.pregnancyId) {
      console.log('임신 정보 없음, 초기화 시도');
      const pregnancyInitialized = await calendarStore.initPregnancyInfo();
      
      if (!pregnancyInitialized) {
        console.log('임신 정보 초기화 실패');
        sendNotification('임신정보를 먼저 등록해주세요.', 'error');
        isLoading.value = false;
        return;
      }
      
      console.log('임신 정보 초기화 성공:', calendarStore.pregnancyId);
    }
    
    // 내용이 없는 경우 경고
    if (!diaryContent.value || diaryContent.value.trim() === '') {
      console.log('일기 내용이 비어있음');
      sendNotification('일기 내용을 입력해주세요.', 'error');
      isLoading.value = false;
      return;
    }
    
    const payload = {
      content: diaryContent.value,
      diary_date: toYYYYMMDD(props.date),
      pregnancy: calendarStore.pregnancyId
    };
    
    console.log('태교일기 저장 데이터:', payload);
    
    let savedDiary;
    
    // 기존 일기가 있으면 업데이트, 없으면 새로 생성
    if (props.babyDiary && props.babyDiary.diary_id) {
      console.log('기존 일기 업데이트 (ID:', props.babyDiary.diary_id, ')');
      const response = await api.put(`calendars/baby-diaries/${props.babyDiary.diary_id}/`, payload);
      savedDiary = response.data;
      sendNotification('태교일기가 수정되었습니다.', 'success');
    } else {
      console.log('새 일기 생성');
      const response = await createBabyDiary(payload);
      savedDiary = response.data;
      currentDiaryId.value = savedDiary.diary_id;
      sendNotification('태교일기가 저장되었습니다.', 'success');
    }
    
    console.log('태교일기 저장 완료:', savedDiary);
    
    // 일기 목록 새로고침 (캘린더 업데이트용)
    await calendarStore.fetchBabyDiaries();
    
    // 모달 닫기
    closeDiaryModal();
    
    // 아기와의 하루 탭으로 전환
    activeTab.value = 'baby';
    
    // 캘린더 전체 갱신 요청 (하트 아이콘 업데이트)
    emit('refresh-calendar');
    
    // 일기 탭 콘텐츠 화면 새로고침
    setTimeout(async () => {
      console.log('저장 후 일기 탭 상태 확인');
      try {
        // 데이터 다시 한번 확인
        const diaryData = await calendarStore.fetchBabyDiaryByDate(props.date);
        console.log('최종 확인된 일기 데이터:', diaryData);
      } catch (refreshError) {
        console.error('데이터 재확인 중 오류:', refreshError);
      }
    }, 300);
  } catch (error) {
    console.error('태교일기 저장 중 오류:', error);
    
    if (error.response && error.response.status === 401) {
      sendNotification('로그인이 필요합니다.', 'error');
    } else if (error.response && error.response.status === 400) {
      sendNotification('입력값이 올바르지 않습니다.', 'error');
      console.error('400 오류 응답:', error.response.data);
    } else {
      sendNotification('태교일기 저장 중 오류가 발생했습니다.', 'error');
    }
  } finally {
    isLoading.value = false;
  }
};

const openDiaryModal = () => {
  console.log('일기 작성/수정 모달 열기');
  // 일기가 있으면 내용을 불러와 수정 모드로 설정
  if (props.babyDiary && props.babyDiary.content) {
    console.log('기존 일기 내용으로 모달 열기:', props.babyDiary.content);
    diaryContent.value = props.babyDiary.content;
  } else {
    console.log('새 일기 작성 모달 열기');
    diaryContent.value = '';
  }
  showDiaryModal.value = true;
}

const closeDiaryModal = () => {
  console.log('일기 작성/수정 모달 닫기');
  showDiaryModal.value = false;
}

onMounted(async () => {
  console.log('DayEventsModal 마운트됨, 임신 정보 초기화 시도');
  
  // 임신 정보 새로 조회
  try {
    console.log('임신 정보 API 요청 시작');
    const pregnancyResponse = await api.get('/accounts/pregnancies/');
    console.log('임신 정보 API 응답:', pregnancyResponse.data);
    
    if (pregnancyResponse.data && pregnancyResponse.data.length > 0) {
      const pregnancyData = pregnancyResponse.data[0];
      console.log('현재 임신 정보:', pregnancyData);
      
      // 캘린더 스토어 업데이트
      if (pregnancyData.id) {
        calendarStore.setPregnancyId(pregnancyData.id);
        calendarStore.setPregnancyInfo(true, pregnancyData.nickname || '아기', pregnancyData.id);
        console.log('API로부터 임신 정보 업데이트 완료:', pregnancyData.id);
      }
    } else {
      console.log('임신 정보가 없습니다.');
    }
  } catch (error) {
    console.error('임신 정보 초기화 중 오류:', error);
  }
});
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-1/2">
      <!-- 모달 헤더 -->
      <div class="p-4 bg-point rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-dark-gray">
            {{ formatDate(date) }}
          </h3>
          <button
            class="text-dark-gray hover:text-white"
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
      </div>

      <!-- 모달 내용 - 높이 조정 -->
      <div class="h-[400px] bg-ivory overflow-y-auto">
        <!-- 탭 버튼 -->
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

        <div class="p-6 bg-ivory h-auto overflow-y-auto">
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
            <div v-if="llmSummary" class="bg-white p-4 rounded-lg shadow">
              <p class="text-dark-gray whitespace-pre-line">
                {{ llmSummary.summary }}
              </p>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500">
                데이터가 없습니다.
              </p>
            </div>
          </div>

          <!-- 아기와의 하루 탭 -->
          <div v-if="activeTab === 'baby'" class="space-y-4">
            <div v-if="babyDiary && babyDiary.content" class="bg-white p-4 rounded-lg shadow relative min-h-[300px]">
              <div class="text-dark-gray font-medium mb-2">{{ formatDate(date) }} 태교일기</div>
              <pre class="text-dark-gray whitespace-pre-wrap font-sans h-[240px] overflow-y-auto">{{ babyDiary.content }}</pre>
              <button
                class="absolute bottom-2 right-2 px-4 py-1 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors text-sm"
                @click="openDiaryModal"
              >
                수정하기
              </button>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500">
                기록된 일기가 없습니다.
              </p>
              <div class="flex justify-center mt-4">
                <button
                  class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
                  @click="openDiaryModal"
                >
                  기록하기
                </button>
              </div>
            </div>
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
            class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
            @click="saveBabyDiary"
          >
            저장하기
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

