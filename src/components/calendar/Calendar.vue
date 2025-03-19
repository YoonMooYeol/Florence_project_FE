<template>
  <div class="calendar-container">
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="day in calendarData"
        :key="day.date"
        class="relative aspect-square p-2 border border-gray-200"
        :class="{
          'bg-gray-50': !day.isCurrentMonth,
          'cursor-pointer hover:bg-gray-50': day.isCurrentMonth
        }"
        @click="day.isCurrentMonth && handleDateClick(day.date)"
      >
        <div class="flex justify-between items-start">
          <span
            class="text-sm"
            :class="{
              'text-gray-400': !day.isCurrentMonth,
              'font-bold': isToday(day.date)
            }"
          >
            {{ day.day }}
          </span>
          <span v-if="day.hasDiary" class="text-point text-sm">♥︎</span>
        </div>
        <div class="mt-1 space-y-1">
          <div
            v-for="event in day.events"
            :key="event.id"
            class="text-xs p-1 rounded bg-point text-dark-gray truncate"
          >
            {{ event.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCalendarStore } from '@/store/calendar'

const calendarStore = useCalendarStore()

// 달력 데이터 계산
const calendarData = computed(() => {
  const year = calendarStore.currentYear
  const month = calendarStore.currentMonth
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const days = []
  const prevMonthDays = new Date(year, month - 1, 0).getDate()

  // 이전 달의 날짜들
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push({
      date: `${year}-${String(month - 1).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`,
      day: prevMonthDays - i,
      isCurrentMonth: false,
      events: [],
      hasDiary: false
    })
  }

  // 현재 달의 날짜들
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const events = calendarStore.getEventsByDate(date)
    const hasDiary = calendarStore.hasBabyDiary(date)
    
    days.push({
      date,
      day: i,
      isCurrentMonth: true,
      events,
      hasDiary
    })
  }

  // 다음 달의 날짜들
  const remainingDays = 42 - days.length // 6주 달력을 위해
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      day: i,
      isCurrentMonth: false,
      events: [],
      hasDiary: false
    })
  }

  return days
})

// 오늘 날짜인지 확인
const isToday = (date) => {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return date === todayString
}

// 날짜 클릭 핸들러
const handleDateClick = (date) => {
  calendarStore.setSelectedDate(date)
}
</script>

<style scoped>
.calendar-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.text-point {
  color: #FFD600;
}

.text-dark-gray {
  color: #353535;
}

.bg-point {
  background-color: #FFD600;
}
</style> 