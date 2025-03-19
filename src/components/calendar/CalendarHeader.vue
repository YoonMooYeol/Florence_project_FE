<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import * as logger from '@/utils/logger'
import { weekdays } from '@/utils/dateUtils'

const props = defineProps({
  currentYear: {
    type: Number,
    required: true
  },
  currentMonth: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['prev-month', 'next-month', 'today', 'select-date'])

const showDatePicker = ref(false)

// 년도 목록 생성 (현재 년도 기준 ±5년)
const years = computed(() => {
  const currentYear = props.currentYear
  const years = []
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i)
  }
  return years
})

// 월 목록
const months = Array.from({ length: 12 }, (_, i) => i + 1)

const selectedYear = ref(props.currentYear)
const selectedMonth = ref(props.currentMonth)

const prevMonth = () => {
  emit('prev-month')
}

const nextMonth = () => {
  emit('next-month')
}

const goToToday = () => {
  emit('today')
}

const handleDateSelect = () => {
  if (selectedYear.value !== props.currentYear || selectedMonth.value !== props.currentMonth) {
    emit('select-date', { year: selectedYear.value, month: selectedMonth.value })
  }
  showDatePicker.value = false
}

onMounted(() => {
  try {
    logger.debug('CalendarHeader', '초기 날짜 설정:', `${props.currentYear}년 ${props.currentMonth}월`)
  } catch (error) {
    logger.error('CalendarHeader', '초기화 중 오류:', error)
  }
})

// 년/월이 변경될 때마다 선택된 값 업데이트
watch(() => props.currentYear, (newYear) => {
  selectedYear.value = newYear
})

watch(() => props.currentMonth, (newMonth) => {
  selectedMonth.value = newMonth
})
</script>

<template>
  <div class="p-4 border-b border-gray-200 bg-base">
    <div class="flex justify-between items-center">
      <button @click="prevMonth" class="text-dark-gray hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="relative">
        <button 
          class="text-lg font-bold text-dark-gray flex items-center gap-1"
          @click="showDatePicker = !showDatePicker"
        >
          {{ currentYear }}년 {{ currentMonth }}월
          <svg 
            class="w-4 h-4 ml-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        
        <!-- 년/월 선택 드롭다운 -->
        <div 
          v-if="showDatePicker"
          class="absolute top-full mt-2 bg-white rounded-lg shadow-lg p-4 z-50 min-w-[200px]"
        >
          <div class="flex gap-4 mb-4">
            <!-- 년도 선택 -->
            <select 
              v-model="selectedYear"
              class="p-2 border rounded-md flex-1"
            >
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}년
              </option>
            </select>
            
            <!-- 월 선택 -->
            <select 
              v-model="selectedMonth"
              class="p-2 border rounded-md flex-1"
            >
              <option v-for="month in months" :key="month" :value="month">
                {{ month }}월
              </option>
            </select>
          </div>
          
          <!-- 확인 버튼 -->
          <button 
            @click="handleDateSelect"
            class="w-full bg-yellow-200 text-dark-gray py-2 rounded-md hover:bg-yellow-300 transition-colors font-bold"
          >
            이동
          </button>
        </div>
      </div>
      <button @click="nextMonth" class="text-dark-gray hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bg-base {
  background-color: var(--color-base);
}
.bg-ivory {
  background-color: #FFFAE0;
}
.bg-point {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}

/* 드롭다운 스타일 */
select {
  background-color: white;
  border-color: #e2e8f0;
  color: #353535;
}

select:focus {
  outline: none;
  border-color: var(--color-point);
  ring: 2px var(--color-point);
}
</style>
