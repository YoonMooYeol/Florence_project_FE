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
/* calendar.css에서 공통 스타일을 사용합니다 */
</style> 