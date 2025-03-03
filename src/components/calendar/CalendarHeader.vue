<script setup>
import { defineProps, defineEmits } from 'vue'
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
</script>

<template>
  <div class="pt-6 pb-4 px-6 border-b border-gray-200 bg-base">
    <h1 class="text-xl font-bold text-center text-dark-gray mb-4">캘린더</h1>
    
    <!-- 월 네비게이션 -->
    <div class="flex items-center justify-between mb-4">
      <button @click="prevMonth" class="text-dark-gray px-2 py-1 rounded hover:bg-ivory">
        <span class="text-lg">◀</span>
      </button>
      <div class="flex items-center">
        <span class="text-center text-lg font-bold text-dark-gray">{{ currentYear }}년 {{ currentMonth }}월</span>
        <button @click="goToToday" class="ml-2 text-sm bg-point text-dark-gray px-2 py-1 rounded hover:bg-yellow-500 transition-colors">
          오늘
        </button>
      </div>
      <button @click="nextMonth" class="text-dark-gray px-2 py-1 rounded hover:bg-ivory">
        <span class="text-lg">▶</span>
      </button>
    </div>
    
    <!-- 요일 헤더 -->
    <div class="grid grid-cols-7 text-center mb-2">
      <div v-for="(day, index) in weekdays" :key="index" 
           :class="[
             'py-1 text-sm font-bold', 
             index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-dark-gray'
           ]">
        {{ day }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-base { 
  background-color: #FFED90; 
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