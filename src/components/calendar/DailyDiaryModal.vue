<script setup>
import { ref, watch } from 'vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: String,
    required: true
  },
  llmSummary: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">
      <div class="bg-point px-6 py-4 flex justify-between items-center">
        <h3 class="text-lg font-bold text-dark-gray">
          오늘의 하루 - {{ formatDate(selectedDate) }}
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

      <div class="p-6 bg-ivory">
        <div v-if="llmSummary" class="space-y-4">
          <div class="bg-white p-4 rounded-lg shadow min-h-[24rem]">
            <h4 class="text-sm font-medium text-gray-500 mb-2">
              AI 요약
            </h4>
            <p class="text-dark-gray whitespace-pre-line">
              {{ llmSummary.summary }}
            </p>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <p class="text-gray-500">
            아직 작성된 일기가 없습니다.
          </p>
        </div>
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