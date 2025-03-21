<script setup>
import { useCalendarStore } from '@/store/calendar'
import { useModalManager } from '@/composables/useModalManager'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const calendarStore = useCalendarStore()
const modalManager = useModalManager()

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
          v-if="calendarStore.isPregnant"
          class="w-full py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left relative group"
          @click="handleBabyDiaryClick"
        >
          <div class="flex items-center">
            <span class="text-xl mr-3">👶</span>
            <span class="font-medium text-dark-gray">
              {{ calendarStore.babyNickname }}{{ calendarStore.getJosa(calendarStore.babyNickname, '과', '와') }}의 하루
            </span>
          </div>
        </button>
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
</style> 