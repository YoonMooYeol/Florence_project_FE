<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { formatDate } from '@/utils/dateUtils'
import { useCalendarStore } from '@/store/calendar'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  },
  event: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save', 'delete'])

const calendarStore = useCalendarStore()

// 폼 데이터 초기화
const formData = ref({
  title: '',
  description: '',
  start: props.date,
  end: props.date,
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  recurring: 'none',
  event_color: '#FFD600'  // 기본 색상 추가
})

// 반복 일정 수정 옵션 추가
const updateOption = ref('this_and_future')

// 색상 옵션 정의
const colorOptions = [
  { value: '#FFD600', label: '노랑' },
  { value: '#FF6B6B', label: '빨강' },
  { value: '#4ECDC4', label: '청록' },
  { value: '#45B7D1', label: '하늘' },
  { value: '#96CEB4', label: '민트' },
  { value: '#FFEEAD', label: '연한 노랑' },
  { value: '#D4A5A5', label: '연한 빨강' },
  { value: '#9B59B6', label: '보라' },
  { value: '#3498DB', label: '파랑' },
  { value: '#2ECC71', label: '초록' }
]

// 이 이벤트가 반복 일정인지 계산
const isRecurringEvent = computed(() => {
  return props.event && 
    ((props.event.recurring && props.event.recurring !== 'none') || 
    props.event.is_recurring === true)
})

// 이벤트 데이터로 폼 초기화
const initFormData = () => {  
  if (props.event) {
    // 수정 모드: 기존 이벤트 데이터로 초기화
    const event = props.event;
    
    // 날짜와 시간 형식 처리
    let startDate = props.date;
    let endDate = props.date;
    let startTime = '09:00';
    let endTime = '10:00';
    let isAllDay = event.allDay || false;
    
    // 반복 일정 여부 확인
    const isRecurringEvent = event.recurring && event.recurring !== 'none';
    
    // 시작 날짜/시간 처리
    if (event.start) {
      if (typeof event.start === 'string') {
        if (event.start.includes('T')) {
          // ISO 형식 (YYYY-MM-DDTHH:MM:SS)
          // 반복 일정인 경우 선택된 날짜 사용
          if (!isRecurringEvent) {
            startDate = event.start.split('T')[0];
          }
          startTime = event.start.split('T')[1].substring(0, 5);
        } else {
          // 날짜만 있는 형식 (YYYY-MM-DD)
          // 반복 일정인 경우 선택된 날짜 사용
          if (!isRecurringEvent) {
            startDate = event.start;
          }
        }
      } else if (event.start instanceof Date) {
        // Date 객체
        // 반복 일정인 경우 선택된 날짜 사용
        if (!isRecurringEvent) {
          startDate = event.start.toISOString().split('T')[0];
        }
        startTime = event.start.toTimeString().substring(0, 5);
      }
    }
    
    // 종료 날짜/시간 처리
    if (event.end) {
      if (typeof event.end === 'string') {
        if (event.end.includes('T')) {
          // ISO 형식 (YYYY-MM-DDTHH:MM:SS)
          // 반복 일정인 경우 선택된 날짜 사용
          if (!isRecurringEvent) {
            endDate = event.end.split('T')[0];
          }
          endTime = event.end.split('T')[1].substring(0, 5);
        } else {
          // 날짜만 있는 형식 (YYYY-MM-DD)
          // 반복 일정인 경우 선택된 날짜 사용
          if (!isRecurringEvent) {
            endDate = event.end;
          }
        }
      } else if (event.end instanceof Date) {
        // Date 객체
        // 반복 일정인 경우 선택된 날짜 사용
        if (!isRecurringEvent) {
          endDate = event.end.toISOString().split('T')[0];
        }
        endTime = event.end.toTimeString().substring(0, 5);
      }
    } else {
      // 종료 시간이 없으면 시작 시간 + 1시간으로 설정
      endDate = startDate;
      
      if (startTime) {
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const endHour = (startHour + 1) % 24;
        endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      }
    }
    
    // 종일 일정 여부 판단 - 명시적인 allDay 필드 외에도 시간으로 판단
    if (
      (startTime.startsWith('00:00') || startTime === '00:00:00') && 
      (endTime.startsWith('23:59') || endTime === '23:59:00' || endTime === '23:59:59')
    ) {
      console.log('시간 기반으로 종일 일정으로 판단됨 (00:00-23:59)')
      isAllDay = true;
    }
    
    console.log('선택된 날짜:', props.date);
    console.log('반복 일정 여부:', isRecurringEvent);
    
    // 폼 데이터 설정
    formData.value = {
      title: event.title || '',
      description: event.description || '',
      start: startDate,
      end: endDate,
      startTime: startTime,
      endTime: endTime,
      allDay: isAllDay,
      recurring: event.recurrence_rules?.pattern || event.recurring || event.recurrence_pattern || 'none',
      event_color: event.event_color || '#FFD600'  // 색상 추가
    };
    
    console.log('폼 데이터 초기화 완료:', formData.value);
    console.log('반복 패턴:', event.recurrence_rules?.pattern || '없음');
    
    // 반복 일정 수정 옵션 기본값
    updateOption.value = 'this_and_future';
  } else {
    console.log('새 이벤트 생성 모드');
    // 새 이벤트: 기본값으로 초기화
    formData.value = {
      title: '',
      description: '',
      start: props.date,
      end: props.date,
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      recurring: 'none',
      event_color: '#FFD600'  // 기본 색상
    }
  }
}

// props.show가 변경될 때마다 폼 초기화
watch(() => props.show, (newValue) => {
  if (newValue) {
    initFormData()
  }
})

// props.event가 변경될 때도 폼 초기화
watch(() => props.event, (newEvent) => {
  if (newEvent && props.show) {
    console.log('이벤트 데이터 변경 감지, 폼 초기화:', newEvent)
    initFormData()
  }
}, { deep: true })

// 컴포넌트가 마운트될 때도 초기화
onMounted(() => {
  if (props.show && props.event) {
    console.log('컴포넌트 마운트 시 폼 초기화')
    initFormData()
  }
})

// 저장 처리
const handleSave = () => {
  if (!formData.value.title.trim()) {
    alert('제목을 입력해주세요.')
    return
  }

  // 종일 일정이 아닌 경우 시간 검증
  if (!formData.value.allDay) {
    if (formData.value.startTime >= formData.value.endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }
  }

  // 반복 일정 여부 확인
  const isRecurringEvent = formData.value.recurring && formData.value.recurring !== 'none';
  
  const eventData = {
    title: formData.value.title,
    description: formData.value.description,
    start: formData.value.allDay ? 
      `${formData.value.start}T00:00:00` : 
      `${formData.value.start}T${formData.value.startTime}:00`,
    end: formData.value.allDay ? 
      `${formData.value.end}T23:59:00` : 
      `${formData.value.end}T${formData.value.endTime}:00`,
    allDay: formData.value.allDay,
    recurring: formData.value.recurring,
    start_date: formData.value.start, // 시작일 별도 저장
    end_date: formData.value.end,     // 종료일 별도 저장
    startTime: formData.value.allDay ? '00:00' : formData.value.startTime,
    endTime: formData.value.allDay ? '23:59' : formData.value.endTime,
    event_color: formData.value.event_color,  // 색상 추가
    id: props.event?.id,
    event_type: props.event?.event_type || 'general',
    updateOption: isRecurringEvent ? updateOption.value : null
  }
  
  console.log('이벤트 저장/수정 데이터:', eventData)
  console.log('반복 일정 수정 옵션:', updateOption.value)
  emit('save', eventData)
}

// 시간 선택 옵션 생성
const timeOptions = computed(() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      options.push(`${hourStr}:${minuteStr}`)
    }
  }
  return options
})

// 삭제 확인 모달 상태
const showDeleteConfirm = ref(false)

// 삭제 처리
const handleDelete = async () => {
  console.log('EventModal: 일정 삭제 시도')
  showDeleteConfirm.value = true
}

// 삭제 확인
const confirmDelete = async () => {
  if (!props.event || !props.event.id) {
    alert('삭제할 이벤트 정보가 없습니다.');
    return;
  }
  
  // 삭제 범위에 따른 확인 메시지 설정
  let confirmMessage = '이 일정을 삭제하시겠습니까?';
  if (isRecurringEvent.value) {
    if (updateOption.value === 'this_only') {
      confirmMessage = '이 일정만 삭제하시겠습니까?';
    } else if (updateOption.value === 'this_and_future') {
      confirmMessage = '이 일정 및 이후 모든 반복 일정을 삭제하시겠습니까?';
    } else if (updateOption.value === 'all') {
      confirmMessage = '모든 반복 일정을 삭제하시겠습니까?';
    }
  }
  
  if (!confirm(confirmMessage)) {
    return;
  }
  console.log('EventModal: 일정 삭제 확인')
  // 이벤트 ID와 반복 여부 전달
  emit('delete', props.event.id, isRecurringEvent.value, { option: updateOption.value })
  showDeleteConfirm.value = false
  emit('close')
}

// 삭제 취소
const cancelDelete = () => {
  showDeleteConfirm.value = false
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-ivory rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <div class="bg-point px-6 py-3 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          {{ props.event ? '일정 수정' : '일정 등록' }}
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="$emit('close')"
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

      <div class="p-3 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              시작 날짜
            </label>
            <input
              type="date"
              v-model="formData.start"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              종료 날짜
            </label>
            <input
              type="date"
              v-model="formData.end"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            type="text"
            v-model="formData.title"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            v-model="formData.description"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-32 bg-white"
            placeholder="일정에 대한 설명을 입력하세요"
          />
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            v-model="formData.allDay"
            class="h-4 w-4 text-point focus:ring-point border-gray-300 rounded bg-white"
          />
          <label class="ml-2 text-sm text-gray-700">
            종일 일정
          </label>
        </div>

        <!-- 시간 선택 (종일 일정이 아닌 경우에만 표시) -->
        <div
          v-if="!formData.allDay"
          class="grid grid-cols-2 gap-4"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
            <select
              v-model="formData.startTime"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option
                v-for="time in timeOptions"
                :key="time"
                :value="time"
              >
                {{ time }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
            <select
              v-model="formData.endTime"
              class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option
                v-for="time in timeOptions"
                :key="time"
                :value="time"
              >
                {{ time }}
              </option>
            </select>
          </div>
        </div>

        <!-- 반복 설정 -->
        <div class="space-y-2">
          <div class="flex items-center">
            <label class="block text-sm font-medium text-gray-700">
              반복
            </label>
            <select
              v-model="formData.recurring"
              class="ml-2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point bg-white"
            >
              <option value="none">반복 안함</option>
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="yearly">매년</option>
            </select>
          </div>
        </div>

        <!-- 색상 선택 -->
        <div class="mb-2">
          <label class="block text-dark-gray font-medium mb-2">일정 색상</label>
          <div class="grid grid-cols-10 gap-1">
            <div
              v-for="color in colorOptions"
              :key="color.value"
              class="relative cursor-pointer"
              @click="formData.event_color = color.value"
            >
              <div
                class="w-full h-6 rounded-lg border-2 transition-all"
                :style="{ backgroundColor: color.value }"
                :class="{ 'border-point': formData.event_color === color.value }"
              />
              <div
                class="absolute inset-0 flex items-center justify-center text-xs text-white font-medium"
                v-if="formData.event_color === color.value"
              >
                ✓
              </div>
            </div>
          </div>
        </div>
        
        <!-- 반복 일정 수정 시 옵션 선택 UI -->
        <div v-if="props.event && isRecurringEvent" class="space-y-3 mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-700">적용 범위</h4>
          
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateThisOnly"
              v-model="updateOption"
              value="this_only"
              class="text-point focus:ring-point"
            />
            <label for="updateThisOnly" class="text-sm text-gray-700">이 일정만</label>
          </div>
          
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateThisAndFuture"
              v-model="updateOption"
              value="this_and_future"
              class="text-point focus:ring-point"
            />
            <label for="updateThisAndFuture" class="text-sm text-gray-700">이후 모든 일정</label>
          </div>
                 
          <div class="flex items-center space-x-2">
            <input
              type="radio"
              id="updateAll"
              v-model="updateOption"
              value="all"
              class="text-point focus:ring-point"
            />
            <label for="updateAll" class="text-sm text-gray-700">모든 반복 일정</label>
          </div>
        </div>

        <!-- 모달 푸터 -->
        <div class="px-5 py-2.5 bg-white border-t border-gray-200 flex justify-end gap-2">
          <button
            v-if="props.event"
            class="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
            @click="handleDelete"
          >
            삭제
          </button>
          <button
            class="px-6 py-2 bg-point text-dark-gray rounded-full hover:bg-yellow-500 transition-colors font-medium"
            @click="handleSave"
          >
            저장
          </button>
        </div>
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
.bg-point {
  background-color: #FFD600;
}
.text-point {
  color: #FFD600;
}
.ring-point {
  --tw-ring-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
.bg-ivory {
  background-color: #FFFAE0;
}
</style> 