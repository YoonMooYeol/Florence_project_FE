<script setup>
import { useCalendarStore } from '@/store/calendar'
import { useModalManager } from '@/composables/useModalManager'
import { computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const calendarStore = useCalendarStore()
const modalManager = useModalManager()

// 모달이 열릴 때마다 상태 확인
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    console.log('[AddDiaryTypeModal] 모달 열림 - calendarStore 상태 확인:')
    console.log('  isPregnant:', calendarStore.isPregnant)
    console.log('  pregnancyId:', calendarStore.pregnancyId)
    console.log('  babyNickname:', calendarStore.babyNickname)
  }
})

// 태명 라벨 계산
const babyDiaryLabel = computed(() => {
  console.log('[AddDiaryTypeModal] 태명 라벨 계산 - isPregnant:', calendarStore.isPregnant, 'pregnancyId:', calendarStore.pregnancyId, 'babyNickname:', calendarStore.babyNickname)
  
  // 태명이 null인 경우에만 "그리움과의 하루"로 표시
  if (calendarStore.babyNickname === null) {
    console.log('[AddDiaryTypeModal] 태명이 null이어서 "그리움과의 하루" 표시')
    return '그리움과의 하루'
  }
  
  // 그 외의 경우 태명 사용 (태명이 없거나 undefined인 경우 '(태명)'을 사용)
  const nickname = calendarStore.babyNickname || '(태명)'
  const josa = calendarStore.getJosa(nickname, '과', '와')
  console.log('[AddDiaryTypeModal] 태명 탭 레이블 계산:', nickname, josa)
  return `${nickname}${josa}의 하루`
})

const closeModal = () => {
  emit('close')
}

const handleScheduleClick = () => {
  closeModal()
  modalManager.openAddEventModal()
}

const handleBabyDiaryClick = () => {
  closeModal()
  modalManager.openDayEventsModal(calendarStore.selectedDate)
  setTimeout(() => {
    const babyTab = document.querySelector('[data-tab="baby"]')
    if (babyTab) {
      babyTab.click()
    }
  }, 100)
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-auto overflow-hidden">
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          기록하기
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

      <div class="p-6 space-y-4 bg-ivory">
        <button
          class="w-full py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left relative group"
          @click="handleScheduleClick"
        >
          <div class="flex items-center">
            <span class="text-xl mr-3">📅</span>
            <span class="font-medium text-dark-gray">일정 등록</span>
          </div>
        </button>

        <button
          v-if="calendarStore.pregnancyId"
          class="w-full py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left relative group"
          @click="handleBabyDiaryClick"
        >
          <div class="flex items-center">
            <span class="text-xl mr-3">👶</span>
            <span class="font-medium text-dark-gray">
              {{ babyDiaryLabel }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* calendar.css에서 공통 스타일을 사용합니다 */
</style> 