<script setup>
import { watch, ref, onMounted } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'
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

const baseUrl = 'calendars/baby-diaries/'

const createBabyDiary = (diaryData) => {
  return api.post(baseUrl, diaryData)
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
    // 내용이 비어있는지 확인
    if (!diaryContent.value || !diaryContent.value.trim()) {
      alert('일기 내용을 입력해주세요.');
      return;
    }

    // 날짜 형식 - props.date를 그대로 사용
    const diaryDate = props.date;
    if (!diaryDate) {
      console.error('날짜 정보가 없습니다');
      alert('날짜 정보가 없어 저장할 수 없습니다.');
      return;
    }
    
    console.log('태교일기 저장 날짜:', diaryDate);
    
    // 임신 정보 확인 및 임신 ID 가져오기
    let pregnancyId = calendarStore.pregnancyId;
    
    // 임신 ID가 없으면 API 호출로 가져오기 시도
    if (!pregnancyId) {
      try {
        console.log('임신 정보 조회 API 호출');
        const pregnancyResponse = await api.get('/accounts/pregnancies/');
        console.log('임신 정보 API 응답:', pregnancyResponse.data);
        
        if (pregnancyResponse.data && pregnancyResponse.data.length > 0) {
          const pregnancyData = pregnancyResponse.data[0];
          console.log('현재 임신 정보:', pregnancyData);
          
          // 임신 ID 가져오기 - pregnancy_id 필드 사용
          if (pregnancyData.pregnancy_id) {
            pregnancyId = pregnancyData.pregnancy_id;
            console.log('임신 ID 가져옴:', pregnancyId);
            
            // 스토어 업데이트
            calendarStore.setPregnancyId(pregnancyId);
            calendarStore.setPregnancyInfo(true, pregnancyData.baby_name || '아기', pregnancyId);
          }
        } else {
          console.log('임신 정보가 없습니다.');
          alert('임신 정보가 필요합니다. 임신 정보를 먼저 등록해주세요.');
          
          // 임신 정보 등록 페이지로 이동 여부 확인
          if (confirm('임신 정보 등록 페이지로 이동하시겠습니까?')) {
            window.location.href = '/pregnancy/register';
          }
          return;
        }
      } catch (error) {
        console.error('임신 정보 조회 중 오류:', error);
        alert('임신 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }
    
    // 임신 ID 확인
    if (!pregnancyId) {
      alert('임신 정보를 찾을 수 없습니다. 임신 정보를 먼저 등록해주세요.');
      return;
    }
    
    // 페이로드 구성
    const payload = {
      content: diaryContent.value,
      diary_date: diaryDate,
      pregnancy: pregnancyId
    };
    
    console.log('서버로 전송되는 페이로드:', payload);

    // 서버 호출
    const response = await createBabyDiary(payload);
    console.log('서버 응답:', response.data);
    
    // 성공 메시지
    alert('일기가 저장되었습니다.');
    
    // 캘린더 데이터 새로고침
    await calendarStore.fetchBabyDiaries();
    
    // 모달 닫기
    emit('close');
  } catch (error) {
    console.error('일기 저장 중 오류 발생:', error);
    handleSaveError(error);
  }
};

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

      <div class="h-96 p-6 bg-ivory h-128">
        <!-- 일정 탭 -->
        <div v-if="activeTab === 'schedule'" class="space-y-4">
          <div v-if="events && events.length > 0" class="space-y-2 h-128">
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
            <p class="text-dark-gray whitespace-pre-line h-128">
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
          <div class="bg-white p-4 rounded-lg shadow">
            <textarea
              v-model="diaryContent"
              class="w-full h-56 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none"
              placeholder="아기와의 소중한 하루를 기록해보세요...♥︎"
            />
            <div class="flex justify-end space-x-2 mt-4">
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

