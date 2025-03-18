<script setup>
// 라우터 뷰를 사용하기 위한 설정
import { onMounted } from 'vue'
import { useCalendarStore } from '@/store/calendar'

// 캘린더 스토어 인스턴스 생성
const calendarStore = useCalendarStore()

// 앱이 마운트될 때 임신 정보 초기화
onMounted(async () => {
  console.log('앱 마운트: 임신 정보 초기화 시작')
  
  try {
    const result = await calendarStore.initPregnancyInfo()
    console.log('임신 정보 초기화 결과:', result)
  } catch (error) {
    console.error('임신 정보 초기화 중 오류 발생:', error)
  }
})
</script>

<template>
  <div class="min-h-screen bg-ivory text-dark-gray">
    <router-view />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Noto Sans KR', 'Roboto', sans-serif;
  font-weight: 400;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
}
</style>
