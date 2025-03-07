<script setup>
import { ref } from 'vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  date: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const diaryData = ref({
  date: props.date,
  content: ''
})

const handleSave = () => {
  if (diaryData.value.content.trim()) {
    emit('save', { ...diaryData.value })
  } else {
    alert('내용을 입력해주세요.')
  }
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
          아기와의 하루
        </h3>
        <button
          class="text-dark-gray hover:text-gray-700"
          @click="emit('close')"
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

      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            날짜
          </label>
          <input
            type="date"
            v-model="diaryData.date"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            내용
          </label>
          <textarea
            v-model="diaryData.content"
            class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-point resize-none h-56"
            placeholder="아기와의 소중한 하루를 기록해보세요...♥︎"
          />
        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="emit('close')"
          >
            취소
          </button>
          <button
            class="px-4 py-2 bg-point text-dark-gray rounded-lg hover:bg-yellow-500 transition-colors font-bold"
            @click="handleSave"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-point {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style> 