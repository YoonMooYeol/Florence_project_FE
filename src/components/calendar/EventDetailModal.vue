<script setup>
import { watch, ref, computed } from 'vue'
import { formatDate, formatTime } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'

const props = defineProps({
  event: {
    type: Object,
    default: () => ({
      title: '',
      start: '',
      end: '',
      allDay: false,
      description: '',
      recurring: 'none'
    })
  },
  show: {
    type: Boolean,
    default: false
  }
})

// 이벤트가 반복 일정인지 확인하는 computed 속성
const isRecurringEvent = computed(() => {
  if (!props.event) return false;
  
  try {
    // 1. 직접적인 반복 일정 속성 확인 (명시적인 반복 일정인 경우)
    // 주요 판단 기준: recurring 속성이 'none'이 아니거나 is_recurring이 true인 경우
    const directRecurring = (props.event.recurring && props.event.recurring !== 'none') || 
                           props.event.is_recurring === true ||
                           (props.event.recurrence_pattern && props.event.recurrence_pattern !== 'none');
    
    // 2. 반복 일정의 일부인 경우 (명시적으로 마스터 이벤트와 연결된 경우)
    const isPartOfRecurring = props.event.recurringEventId || 
                             props.event.parentId || 
                             (typeof props.event.start === 'string' && props.event.start.includes('RRULE'));
    
    // 로깅
    console.log('반복 일정 확인 결과:', { 
      직접_반복_설정됨: directRecurring, 
      반복_일정의_일부: isPartOfRecurring,
      이벤트_제목: props.event.title
    });
    
    // 직접적인 반복 일정이거나 반복 일정의 일부인 경우만 true 반환
    return directRecurring || isPartOfRecurring;
  } catch (error) {
    console.error('반복 일정 확인 중 오류:', error);
    return false;
  }
})

// 서버에서 이벤트 세부 정보를 다시 확인하는 함수
const checkRecurringStatusFromServer = async () => {
  if (props.event && props.event.id) {
    try {
      console.log('서버에서 반복 일정 상태 확인 중...')
      const calendarStore = useCalendarStore()
      const serverEvent = await calendarStore.fetchEventDetail(props.event.id)
      
      // 서버 정보로 이벤트 상태 보강
      if (serverEvent) {
        console.log('서버에서 받은 이벤트 정보:', serverEvent)
        
        // 서버에서 확인된 반복 일정 상태 - 명시적으로 반복 속성이 있는 경우만 반복 일정으로 인식
        const isServerRecurring = (serverEvent.recurring && serverEvent.recurring !== 'none') || 
                                  serverEvent.is_recurring === true ||
                                  (serverEvent.recurrence_pattern && serverEvent.recurrence_pattern !== 'none') ||
                                  serverEvent.recurringEventId || 
                                  serverEvent.parentId
        
        // 클라이언트와 서버 상태가 다르면 로그 출력
        if (isServerRecurring !== isRecurringEvent.value) {
          console.log('클라이언트-서버 반복 일정 상태 불일치 발견:', {
            '클라이언트': isRecurringEvent.value,
            '서버': isServerRecurring
          })
          
          // 서버에서 반복 일정으로 확인된 경우, 클라이언트 상태 업데이트
          if (isServerRecurring) {
            console.log('서버에서 반복 일정으로 확인됨, 클라이언트 상태 업데이트')
            emit('update:event', {
              ...props.event,
              is_recurring: true,
              recurring: serverEvent.recurring || 'weekly',
              recurrence_pattern: serverEvent.recurrence_pattern || 'weekly',
              recurringEventId: serverEvent.recurringEventId,
              parentId: serverEvent.parentId
            })
          }
        }
      }
    } catch (error) {
      console.error('서버에서 반복 일정 상태 확인 중 오류:', error)
    }
  }
}

// show prop이 변경될 때마다 콘솔에 로그 출력
watch(() => props.show, (newValue) => {
  if (newValue) {
    console.log('EventDetailModal 컴포넌트에서 - 일정 상세 모달이 열렸습니다:', props.event)
    console.log('반복 일정 여부:', isRecurringEvent.value)
    // 모달이 열렸을 때 서버에서 반복 일정 상태 확인
    checkRecurringStatusFromServer()
  } else {
    console.log('EventDetailModal 컴포넌트에서 - 일정 상세 모달이 닫혔습니다')
  }
})

// event prop이 변경될 때마다 콘솔에 로그 출력
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    console.log('EventDetailModal - 이벤트 객체 변경:', newEvent)
    console.log('반복 일정 여부:', isRecurringEvent.value)
    // 이벤트가 변경되었을 때 서버에서 반복 일정 상태 확인
    checkRecurringStatusFromServer()
  }
})

const emit = defineEmits(['close', 'delete', 'edit', 'update:event'])

const deleteOption = ref('all')
const untilDate = ref('')
const showDeleteConfirm = ref(false)

const closeModal = () => {
  console.log('일정 상세 모달 닫기 버튼 클릭')
  emit('close')
}

const handleDelete = async () => {
  console.log('일정 삭제 버튼 클릭')
  // 로깅 추가
  console.log('삭제 대상 이벤트:', props.event)
  console.log('현재 감지된 반복 일정 여부:', isRecurringEvent.value)
  
  try {
    // 서버에서 최신 이벤트 정보로 반복 일정 여부 확인
    if (props.event?.id) {
      // 서버에서 최신 정보 확인
      await checkRecurringStatusFromServer()
    }
  } catch (error) {
    console.warn('이벤트 정보 확인 중 오류:', error)
  }
  
  // 반복 일정인지 최종 확인
  const finalIsRecurring = isRecurringEvent.value
  
  if (finalIsRecurring) {
    // 반복 일정인 경우 삭제 옵션 표시
    console.log('반복 일정 삭제 옵션 표시')
    // 반복 일정 유형에 따라 적절한 기본 삭제 옵션 설정
    deleteOption.value = 'all' // 기본값은 '모든 반복 일정 삭제'
    showDeleteConfirm.value = true
  } else {
    // 일반 일정인 경우 바로 확인 창 표시 후 삭제
    console.log('일반 일정 삭제 진행')
    if (confirm(`"${props.event.title}" 일정을 삭제하시겠습니까?`)) {
      emit('delete', props.event.id, false, {
        option: 'this_only' // 일반 일정은 항상 'this_only'
      })
      emit('close')
    }
  }
}

const confirmDelete = async () => {
  try {
    console.log('삭제 확인 - 옵션:', deleteOption.value)
    console.log('삭제 대상 이벤트:', props.event)
    console.log('반복 일정 여부:', isRecurringEvent.value)
    
    // 반복 일정인 경우에만 옵션에 따라 확인 메시지 구성
    let confirmMessage = '이 일정을 삭제하시겠습니까?';
    
    if (isRecurringEvent.value) {
      if (deleteOption.value === 'all') {
        confirmMessage = `"${props.event.title}" 모든 반복 일정을 삭제하시겠습니까?`;
      } else if (deleteOption.value === 'this_and_future') {
        // this_and_future 옵션의 경우 날짜 자동 설정
        if (!untilDate.value && props.event && props.event.start) {
          untilDate.value = typeof props.event.start === 'string' && props.event.start.includes('T') 
            ? props.event.start.split('T')[0] 
            : props.event.start;
        }
        
        confirmMessage = `"${props.event.title}" ${untilDate.value || '현재 날짜'} 이후의 모든 일정을 삭제하시겠습니까?`;
      } else {
        confirmMessage = `"${props.event.title}" 이 일정만 삭제하시겠습니까?`;
      }
    }
    
    // 사용자 최종 확인
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // 반복 일정 여부에 따라 처리
    emit('delete', props.event.id, isRecurringEvent.value, {
      option: deleteOption.value,
      untilDate: untilDate.value
    });
    
    showDeleteConfirm.value = false;
    emit('close');
  } catch (error) {
    console.error('EventDetailModal: 삭제 중 오류 발생', error);
    alert('일정 삭제 중 오류가 발생했습니다.');
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
}

const handleEdit = () => {
  console.log('일정 수정 버튼 클릭')
  emit('edit', props.event)
  emit('close')
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

// 이벤트 날짜 포맷팅
const formatEventDate = (event) => {
  if (!event) {
    return '';
  }
  
  try {
    // start가 없는 경우 start_date를 사용
    const startValue = event.start || event.start_date;
    const endValue = event.end || event.end_date;
    
    if (!startValue) {
      console.error('이벤트에 시작 날짜 정보가 없습니다:', event);
      return '';
    }
    
    if (event.allDay) {
      return formatDate(startValue);
    }
    
    // 날짜 형식이 ISO 문자열인지 확인 (T를 포함하는지)
    const hasTimeStart = typeof startValue === 'string' && startValue.includes('T');
    const hasTimeEnd = typeof endValue === 'string' && endValue && endValue.includes('T');
    
    if (hasTimeStart && hasTimeEnd) {
      // 시간이 있는 경우 시작 날짜와 시간, 종료 시간을 표시
      const startTimePart = startValue.split('T')[1];
      const endTimePart = endValue.split('T')[1];
      
      if (startTimePart && endTimePart) {
        const startTime = startTimePart.substring(0, 5);
        const endTime = endTimePart.substring(0, 5);
        return `${formatDate(startValue)} ${startTime} - ${endTime}`;
      }
    }
    
    // 시간 정보가 있는 경우 직접 조합
    if (event.start_date && event.start_time) {
      const dateStr = formatDate(event.start_date);
      const startTime = event.start_time.substring(0, 5);
      const endTime = event.end_time ? event.end_time.substring(0, 5) : '';
      
      if (endTime) {
        return `${dateStr} ${startTime} - ${endTime}`;
      }
      return `${dateStr} ${startTime}`;
    }
    
    // 기본적으로 시작 날짜만 표시
    return formatDate(startValue);
  } catch (error) {
    console.error('날짜 포맷팅 중 오류 발생:', error);
    return '';
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">일정 상세</h3>
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

      <!-- 모달 내용 -->
      <div class="p-6 space-y-4">
        <div>
          <h4 class="font-medium text-gray-700">{{ event.title }}</h4>
          <p class="text-sm text-gray-500">
            {{ formatEventDate(event) }}
          </p>
          <p v-if="event.description" class="mt-2 text-gray-600">
            {{ event.description }}
          </p>
          
          <!-- 반복 일정인 경우 표시 -->
          <p v-if="isRecurringEvent" class="mt-2 text-sm text-blue-600">
            <span class="font-medium">반복 유형:</span> {{ getRecurringText(event.recurring || event.recurrence_pattern) }}
          </p>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
        <button
          class="px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors"
          @click="handleDelete"
        >
          삭제
        </button>
        <button
          class="px-4 py-2 bg-yellow-200 text-dark-gray rounded-lg hover:bg-yellow-300 transition-colors"
          @click="handleEdit"
        >
          수정
        </button>
      </div>
    </div>
  </div>

  <!-- 삭제 확인 모달 -->
  <div
    v-if="showDeleteConfirm"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-auto p-6">
      <h3 class="text-lg font-bold text-gray-900 mb-4 text-center">일정 삭제</h3>
      <p class="text-gray-600 text-center mb-6">이 일정을 삭제하시겠습니까?</p>
      
      <!-- 삭제 옵션 표시 (반복 일정만) -->
      <div v-if="isRecurringEvent" class="mb-6 space-y-4">
        <div class="flex items-center space-x-2">
          <input
            type="radio"
            id="deleteConfirmAll"
            v-model="deleteOption"
            value="all"
            class="text-point focus:ring-point"
          />
          <label for="deleteConfirmAll" class="text-sm text-gray-700">모든 반복 일정 삭제</label>
        </div>
        <div class="flex items-center space-x-2">
          <input
            type="radio"
            id="deleteConfirmUntil"
            v-model="deleteOption"
            value="this_and_future"
            class="text-point focus:ring-point"
          />
          <label for="deleteConfirmUntil" class="text-sm text-gray-700">이후 모든 일정 삭제</label>
        </div>
        <div class="flex items-center space-x-2">
          <input
            type="radio"
            id="deleteConfirmThisOnly"
            v-model="deleteOption"
            value="this_only"
            class="text-point focus:ring-point"
          />
          <label for="deleteConfirmThisOnly" class="text-sm text-gray-700">이 일정만 삭제</label>
        </div>
      </div>

      <div class="flex justify-center gap-3">
        <button
          class="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors font-medium"
          @click="cancelDelete"
        >
          취소
        </button>
        <button
          class="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
          @click="confirmDelete"
        >
          확인
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* calendar.css에서 공통 스타일을 사용합니다 */
</style>
