<template>
  <div class="daily-summary-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p class="text-center text-gray-500">요약 정보를 불러오는 중...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p class="text-center text-red-500">{{ error }}</p>
    </div>
    
    <div v-else-if="!summary" class="empty-state">
      <p class="text-center text-gray-500">
        {{ selectedDate }} 날짜에 대한 요약 정보가 없습니다.
      </p>
      <button 
        v-if="canCreateSummary"
        @click="generateSummary" 
        class="generate-btn"
        :disabled="generatingSummary"
      >
        {{ generatingSummary ? '요약 생성 중...' : '요약 생성하기' }}
      </button>
    </div>
    
    <div v-else class="summary-content">
      <div class="summary-header">
        <h3 class="date-title">{{ formattedDate }}</h3>
        <div class="action-buttons">
          <button @click="openFullSummary" class="view-btn">전체보기</button>
        </div>
      </div>
      
      <div class="summary-body">
        <p>{{ summary.summary_text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import api from '@/utils/axios'

const props = defineProps({
  selectedDate: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['openFullSummary'])

// 상태 변수들
const summary = ref(null)
const loading = ref(false)
const error = ref(null)
const generatingSummary = ref(false)
const canCreateSummary = ref(true)

// 포맷된 날짜 표시
const formattedDate = computed(() => {
  if (!props.selectedDate) return ''
  
  try {
    const date = new Date(props.selectedDate)
    return format(date, 'yyyy년 M월 d일 (E)', { locale: ko })
  } catch (error) {
    console.error('날짜 형식 변환 오류:', error)
    return props.selectedDate
  }
})

// 선택된 날짜에 대한 요약 정보 가져오기
const fetchSummary = async () => {
  if (!props.selectedDate) return
  
  loading.value = true
  error.value = null
  
  try {
    const response = await api.get('/calendars/conversation-summaries/', {
      params: {
        summary_date: props.selectedDate
      }
    })
    
    // 결과가 배열인 경우 첫 번째 요소 사용, 없으면 null
    summary.value = response.data.length > 0 ? response.data[0] : null
    
  } catch (err) {
    console.error('요약 정보 가져오기 오류:', err)
    error.value = '요약 정보를 불러오는 중 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}

// LLM 요약 생성하기
const generateSummary = async () => {
  if (!props.selectedDate || generatingSummary.value) return
  
  generatingSummary.value = true
  error.value = null
  
  try {
    const response = await api.post('/calendars/conversation-summaries/auto_summarize/', {
      summary_date: props.selectedDate
    })
    
    // 생성된 요약 정보 설정
    summary.value = response.data
    
  } catch (err) {
    console.error('요약 생성 오류:', err)
    
    if (err.response && err.response.data && err.response.data.error) {
      // 서버에서 반환한 오류 메시지 표시
      error.value = err.response.data.error
      
      // 데이터가 없는 경우 버튼 비활성화
      if (err.response.status === 404) {
        canCreateSummary.value = false
      }
    } else {
      error.value = '요약을 생성하는 중 오류가 발생했습니다.'
    }
  } finally {
    generatingSummary.value = false
  }
}

// 전체 요약 모달 열기
const openFullSummary = () => {
  if (summary.value) {
    emit('openFullSummary', summary.value)
  }
}

// 날짜가 변경될 때 자동으로 요약 정보 다시 가져오기
watch(() => props.selectedDate, (newDate) => {
  if (newDate) {
    fetchSummary()
    canCreateSummary.value = true
  }
})

// 컴포넌트 마운트 시 요약 정보 가져오기
onMounted(() => {
  if (props.selectedDate) {
    fetchSummary()
  }
})
</script>

<style scoped>
.daily-summary-container {
  padding: 16px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.loading-state, .empty-state, .error-state {
  padding: 20px;
  text-align: center;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ffd600;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.generate-btn {
  background-color: #ffd600;
  color: #353535;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  margin-top: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background-color: #ffed90;
}

.generate-btn:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.date-title {
  font-weight: 600;
  color: #353535;
  font-size: 1.1rem;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.view-btn {
  background-color: #f0f0f0;
  color: #353535;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.view-btn:hover {
  background-color: #e0e0e0;
}

.summary-body {
  background-color: #fffef0;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  border-left: 3px solid #ffd600;
}
</style> 