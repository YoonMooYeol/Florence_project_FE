<script setup>
import { watch } from 'vue'
import { formatDate } from '@/utils/dateUtils'

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({
      summary_id: '',
      summary_date: '',
      summary_text: ''
    })
  },
  show: {
    type: Boolean,
    default: false
  }
})

// show prop이 변경될 때마다 콘솔에 로그 출력
watch(() => props.show, (newValue) => {
  if (newValue) {
    console.log('LLMSummaryModal 컴포넌트에서 - LLM 상세 모달이 열렸습니다:', props.summary)
  } else {
    console.log('LLMSummaryModal 컴포넌트에서 - LLM 상세 모달이 닫혔습니다')
  }
})

const emit = defineEmits(['close', 'delete'])

const closeModal = () => {
  console.log('LLM 상세 모달 닫기 버튼 클릭')
  emit('close')
}

const deleteSummary = () => {
  if (props.summary && props.summary.summary_id) {
    console.log('LLM 요약 삭제 버튼 클릭:', props.summary.summary_id)
    emit('delete', props.summary.summary_id)
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 flex items-center justify-center detail-modal p-2 sm:p-4 pointer-events-none"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden pointer-events-auto">
      <!-- 모달 헤더 -->
      <div class="bg-blue-400 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <h3 class="text-base sm:text-lg font-bold text-white">
          대화 요약 상세
        </h3>
        <button
          class="p-2 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded-lg"
          @click="closeModal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 sm:h-6 sm:w-6"
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

      <!-- 모달 내용 -->
      <div class="p-4 sm:p-6 bg-ivory modal-content max-h-[60vh] overflow-y-auto">
        <div class="space-y-3 sm:space-y-4">
          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              날짜
            </h4>
            <p class="text-base sm:text-sm text-dark-gray">
              {{ formatDate(summary.summary_date) }}
            </p>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              대화 요약
            </h4>
            <div class="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <p class="text-base sm:text-sm text-dark-gray whitespace-pre-line">
                {{ summary.summary_text }}
              </p>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 mb-1">
              AI 추천 사항
            </h4>
            <div class="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <ul class="list-disc pl-5 text-base sm:text-sm text-dark-gray space-y-2">
                <li>규칙적인 약 복용을 계속 유지하세요.</li>
                <li>부작용이 없다면 현재 처방대로 계속 진행하는 것이 좋습니다.</li>
                <li>다음 병원 방문 시 의사에게 현재 상태를 자세히 알려주세요.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-200 flex justify-end">
        <button
          class="px-4 py-2.5 text-base sm:text-sm bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          @click="deleteSummary"
        >
          삭제
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
.text-dark-gray {
  color: #353535;
}

/* 스크롤바 스타일링 */
.modal-content {
  scrollbar-width: thin;
  scrollbar-color: #4A90E2 #FFFAE0;
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #FFFAE0;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #4A90E2;
  border-radius: 3px;
}

/* 모바일 최적화 */
@media (max-width: 640px) {
  .max-w-md {
    max-width: 100%;
    margin: 0;
  }

  .space-y-3 {
    margin-top: 0.75rem;
  }

  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
}
</style>
