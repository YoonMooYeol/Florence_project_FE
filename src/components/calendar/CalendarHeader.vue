<script setup>
import { ref, onMounted } from 'vue'
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

const emit = defineEmits(['prev-month', 'next-month', 'today'])

const prevMonth = () => {
  emit('prev-month')
}

const nextMonth = () => {
  emit('next-month')
}

const goToToday = () => {
  emit('today')
}

onMounted(() => {
  try {
    logger.debug('CalendarHeader', '초기 날짜 설정:', `${props.currentYear}년 ${props.currentMonth}월`)
  } catch (error) {
    logger.error('CalendarHeader', '초기화 중 오류:', error)
  }
})
</script>

<template>
  <div class="p-4 border-b border-gray-200 bg-base">
    <div class="flex justify-between items-center">
      <button @click="prevMonth" class="text-dark-gray hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-lg font-bold text-dark-gray">{{ currentYear }}년 {{ currentMonth }}월</span>
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
</style>
