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
  <div class="p-3 sm:p-4 border-b border-gray-200 bg-base">
    <div class="flex justify-between items-center">
      <button @click="prevMonth" class="p-2 text-dark-gray hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-point-yellow rounded-lg">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="relative">
        <button 
          class="text-base sm:text-lg font-bold text-dark-gray flex items-center gap-1 p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-point-yellow"
          @click="showDatePicker = !showDatePicker"
        >
          {{ currentYear }}년 {{ currentMonth }}월
          <svg 
            class="w-3 h-3 sm:w-4 sm:h-4 ml-1" 
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
          class="absolute top-full mt-2 bg-white rounded-lg shadow-lg p-3 sm:p-4 z-50 min-w-[280px] sm:min-w-[320px]"
        >
          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <!-- 년도 선택 -->
            <select 
              v-model="selectedYear"
              class="p-2.5 border rounded-lg flex-1 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-point-yellow"
            >
              <option v-for="year in years" :key="year" :value="year">
                {{ year }}년
              </option>
            </select>
            
            <!-- 월 선택 -->
            <select 
              v-model="selectedMonth"
              class="p-2.5 border rounded-lg flex-1 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-point-yellow"
            >
              <option v-for="month in months" :key="month" :value="month">
                {{ month }}월
              </option>
            </select>
          </div>
          
          <!-- 확인 버튼 -->
          <button 
            @click="handleDateSelect"
            class="w-full bg-point-yellow text-dark-gray py-2.5 rounded-lg hover:bg-yellow-400 transition-colors font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-point-yellow"
          >
            이동
          </button>
        </div>
      </div>
      <button @click="nextMonth" class="p-2 text-dark-gray hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-point-yellow rounded-lg">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23353535'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

select:focus {
  outline: none;
  border-color: var(--color-point);
  box-shadow: 0 0 0 2px rgba(255, 214, 0, 0.2);
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  select {
    font-size: 16px; /* iOS에서 자동 확대 방지 */
  }
}
</style>
