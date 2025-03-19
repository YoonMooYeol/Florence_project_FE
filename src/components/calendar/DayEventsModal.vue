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
const activeTab = ref('schedule')
const showDiaryModal = ref(false)
const isEditing = ref(false)
const currentDiaryId = ref(null)

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
  console.log('태교일기 데이터 감지됨:', newDiary);
  if (newDiary) {
    diaryContent.value = newDiary.content
    currentDiaryId.value = newDiary.diary_id || newDiary.id
    isEditing.value = false
    console.log('태교일기 데이터 설정:', diaryContent.value, currentDiaryId.value);
  } else {
    diaryContent.value = ''
    currentDiaryId.value = null
    isEditing.value = false
    console.log('태교일기 데이터 초기화');
  }
}, { immediate: true, deep: true })

const emit = defineEmits(['close', 'add-event', 'view-event', 'view-llm-summary', 'update:babyDiary'])

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

// 태교일기 저장/수정 함수
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
          
          // 임신 ID 가져오기
          if (pregnancyData.id) {
            pregnancyId = pregnancyData.id;
            console.log('임신 ID 가져옴:', pregnancyId);
            
            // 스토어 업데이트
            calendarStore.setPregnancyId(pregnancyId);
            calendarStore.setPregnancyInfo(true, pregnancyData.nickname || '아기', pregnancyId);
          }
        } else {
          console.log('임신 정보가 없습니다.');
          alert('임신 정보가 필요합니다. 임신 정보를 먼저 등록해주세요.');
          return;
        }
      } catch (error) {
        console.error('임신 정보 조회 중 오류:', error);
        alert('임신 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }
    
    // 페이로드 구성
    const payload = {
      pregnancy: pregnancyId,
      content: diaryContent.value.trim(),
      diary_date: diaryDate
    };
    
    console.log('서버로 전송되는 페이로드:', payload);

    let response;
    if (isEditing.value && currentDiaryId.value) {
      // 수정
      response = await api.put(`${baseUrl}${currentDiaryId.value}/`, payload);
      console.log('일기 수정 성공:', response.data);
    } else {
      // 새로 작성
      response = await api.post(baseUrl, payload);
      console.log('일기 저장 성공:', response.data);
    }
    
    // 성공 메시지
    alert(isEditing.value ? '일기가 수정되었습니다.' : '일기가 저장되었습니다.');
    
    // 캘린더 데이터 새로고침 (전체 일기 목록부터 업데이트)
    await calendarStore.fetchBabyDiaries();
    
    // 현재 날짜의 태교일기 다시 조회
    const updatedDiary = await calendarStore.fetchBabyDiaryByDate(diaryDate);
    console.log('업데이트된 태교일기:', updatedDiary);
    
    if (updatedDiary) {
      // 응답 데이터에 id 필드 추가 (diary_id를 id로도 저장)
      updatedDiary.id = updatedDiary.diary_id;
      
      // 로컬 데이터 업데이트 - 부모 컴포넌트로 데이터 전송 전에 로컬 상태도 업데이트
      diaryContent.value = updatedDiary.content;
      currentDiaryId.value = updatedDiary.diary_id;
      
      // 스토어에 바로 설정
      calendarStore.setSelectedBabyDiary(updatedDiary);
      
      // 부모 컴포넌트에 업데이트된 데이터 전달
      emit('update:babyDiary', updatedDiary);
    }
    
    // 일기 작성/수정 모달만 닫고 날짜 모달은 유지
    closeDiaryModal();
    
    // 페이지 새로고침 대신 activeTab을 'baby'로 설정하여 바로 일기 탭으로 이동
    activeTab.value = 'baby';
    
    // 캘린더 강제 갱신 - window 전체를 갱신하지 않고 캘린더 API로 렌더링
    if (calendarStore.calendarApi) {
      console.log('캘린더 API로 렌더링 강제 갱신 시도');
      calendarStore.calendarApi.render();
    }
  } catch (error) {
    console.error('일기 저장 중 오류 발생:', error);
    
    // 오류 응답 상세 분석 및 사용자 친화적인 메시지 표시
    if (error.response) {
      console.log('오류 응답 데이터:', error.response.data);
      console.log('오류 상태 코드:', error.response.status);
      
      if (error.response.status === 400) {
        // 중복 일기 작성 시도
        alert('일기를 이미 작성하셨습니다.');
      } else if (error.response.data) {
        // 서버에서 전달한 오류 메시지가 있으면 표시
        if (error.response.data.diary_date) {
          alert(`날짜 오류: ${error.response.data.diary_date[0]}`);
        } else if (error.response.data.content) {
          alert(`내용 오류: ${error.response.data.content[0]}`);
        } else if (error.response.data.pregnancy) {
          alert(`임신 정보 오류: ${error.response.data.pregnancy[0]}`);
        } else if (error.response.data.non_field_errors) {
          alert(`오류: ${error.response.data.non_field_errors[0]}`);
        } else if (error.response.data.detail) {
          alert(`오류: ${error.response.data.detail}`);
        } else {
          alert('일기 저장에 실패했습니다. 다시 시도해주세요.');
        }
      } else {
        alert('일기 저장에 실패했습니다. 네트워크 연결을 확인해주세요.');
      }
    } else {
      alert('일기 저장에 실패했습니다. 다시 시도해주세요.');
    }
  }
};

const openDiaryModal = () => {
  showDiaryModal.value = true
  console.log('일기 모달 열기, 현재 일기 데이터:', props.babyDiary);
  if (props.babyDiary) {
    diaryContent.value = props.babyDiary.content
    currentDiaryId.value = props.babyDiary.diary_id || props.babyDiary.id
    isEditing.value = true
    console.log('수정 모드로 열기:', diaryContent.value, currentDiaryId.value);
  } else {
    diaryContent.value = ''
    currentDiaryId.value = null
    isEditing.value = false
    console.log('새 일기 작성 모드로 열기');
  }
}

const closeDiaryModal = () => {
  showDiaryModal.value = false
  diaryContent.value = ''
  currentDiaryId.value = null
  isEditing.value = false
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
          <div v-if="props.babyDiary && props.babyDiary.content" class="bg-white p-4 rounded-lg shadow relative min-h-[300px]">
            <div class="bg-ivory p-4 rounded-lg mb-4 h-[200px] overflow-y-auto">
              <p class="text-dark-gray whitespace-pre-line">
                {{ props.babyDiary.content }}
              </p>
            </div>
            <div class="flex justify-end">
              <button
                class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
                @click="openDiaryModal"
              >
                수정하기
              </button>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500">
              기록된 일기가 없습니다.
            </p>
          </div>
          <div class="flex justify-center">
            <button
              class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
              @click="openDiaryModal"
            >
              {{ props.babyDiary ? '새로 기록하기' : '기록하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 태교일기 작성/수정 모달 -->
  <div v-if="showDiaryModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-full max-w-md mx-auto">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">{{ isEditing ? '일기 수정하기' : '오늘 하루 기록하기' }} ♥︎</h3>
        <textarea
          v-model="diaryContent"
          class="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-64"
          :placeholder="isEditing ? '일기를 수정해보세요...♥︎' : '아기와의 소중한 하루를 기록해보세요...♥︎'"
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
            {{ isEditing ? '수정하기' : '저장하기' }}
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

