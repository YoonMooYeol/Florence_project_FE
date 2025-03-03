<script setup>
import { onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import { useCalendarStore } from '@/store/calendar'
import { useCalendarConfig } from '@/composables/useCalendarConfig'
import { useModalManager } from '@/composables/useModalManager'
import { normalizeDate } from '@/utils/dateUtils'

// 컴포넌트 임포트
import CalendarHeader from '@/components/calendar/CalendarHeader.vue'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import DayEventsModal from '@/components/calendar/DayEventsModal.vue'
import EventDetailModal from '@/components/calendar/EventDetailModal.vue'
import LLMSummaryModal from '@/components/calendar/LLMSummaryModal.vue'
import AddEventModal from '@/components/calendar/AddEventModal.vue'

// 스토어 및 컴포저블 사용
const calendarStore = useCalendarStore()
const modalManager = useModalManager()

// 날짜 클릭 핸들러
const handleDateClick = (info) => {
  console.log(`캘린더에서 날짜 클릭: ${info.dateStr}`)
  console.log('일일 일정 모달만 열립니다.')
  modalManager.openDayEventsModal(info.dateStr)
}

// 이벤트 클릭 핸들러
const handleEventClick = (info) => {
  const eventId = info.event.id
  console.log(`캘린더에서 이벤트 클릭: ${eventId}`)
  
  const eventObj = calendarStore.events.find(e => e.id === eventId)
  if (eventObj) {
    const dateStr = normalizeDate(eventObj.start)
    console.log(`해당 이벤트의 날짜: ${dateStr}`)
    console.log('일일 일정 모달만 열립니다.')
    
    // 먼저 현재 표시된 모든 모달 닫기
    modalManager.closeDayEventsModal()
    
    // 그런 다음 선택된 날짜를 설정하고 일일 일정 모달 열기
    calendarStore.setSelectedDate(dateStr)
    modalManager.openDayEventsModal(dateStr)
    
    // 중요: 여기서는 아직 이벤트 상세 모달을 열지 않음
    // 사용자가 일일 일정 모달에서 해당 이벤트를 클릭할 때만 열림
  }
}

// 캘린더 설정 가져오기
const { 
  calendarRef, 
  calendarOptions, 
  updateCurrentDate,
  prevMonth,
  nextMonth,
  goToToday
} = useCalendarConfig(handleDateClick, handleEventClick)

// 컴포넌트 마운트 시 현재 날짜 정보 초기화
onMounted(() => {
  // 약간의 지연을 두고 초기화 (캘린더가 완전히 렌더링된 후)
  setTimeout(() => {
    updateCurrentDate()
  }, 100)
})

// 플로팅 액션 버튼 클릭 핸들러
const handleFabClick = () => {
  // 현재 날짜를 선택하고 일정 추가 모달 열기
  const today = new Date().toISOString().split('T')[0]
  calendarStore.setSelectedDate(today)
  modalManager.openAddEventModal()
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 상단 헤더 -->
    <CalendarHeader 
      :current-year="calendarStore.currentYear" 
      :current-month="calendarStore.currentMonth"
      @prev-month="prevMonth"
      @next-month="nextMonth"
      @today="goToToday"
    />
    
    <!-- 캘린더 -->
    <div class="px-4 pb-24 pt-2 bg-ivory">
      <FullCalendar 
        ref="calendarRef"
        :options="calendarOptions"
      />
    </div>
    
    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="calendar" />
    
    <!-- 추가 버튼 (우측 하단 고정) -->
    <FloatingActionButton @click="handleFabClick" />
    
    <!-- 일일 일정 모달 -->
    <DayEventsModal
      :show="modalManager.showDayEventsModal.value"
      :date="calendarStore.selectedDate"
      :events="calendarStore.eventsForSelectedDate"
      :llm-summary="calendarStore.llmSummaryForSelectedDate"
      @close="() => { console.log('Calendar.vue: 일일 일정 모달 닫기 이벤트'); modalManager.closeDayEventsModal(); }"
      @add-event="() => { console.log('Calendar.vue: 일정 추가 버튼 클릭 이벤트'); modalManager.openAddEventModal(); }"
      @view-event="(event) => { console.log('Calendar.vue: 일정 상세 보기 클릭 이벤트', event); modalManager.openEventDetailModal(event); }"
      @view-llm-summary="(summary) => { console.log('Calendar.vue: LLM 요약 보기 클릭 이벤트', summary); modalManager.openLLMDetailModal(summary); }"
    />
    
    <!-- 일정 상세 모달 -->
    <EventDetailModal
      :show="modalManager.showEventDetailModal.value"
      :event="calendarStore.selectedEvent"
      @close="modalManager.closeEventDetailModal"
      @delete="modalManager.deleteEvent"
    />
    
    <!-- LLM 대화 요약 상세 모달 -->
    <LLMSummaryModal
      :show="modalManager.showLLMDetailModal.value"
      :summary="calendarStore.selectedLLMSummary"
      @close="modalManager.closeLLMDetailModal"
      @delete="modalManager.deleteLLMSummary"
    />
    
    <!-- 일정 등록 모달 -->
    <AddEventModal
      :show="modalManager.showAddEventModal.value"
      :selected-date="calendarStore.selectedDate"
      @close="modalManager.closeAddEventModal"
      @save="modalManager.saveEvent"
    />
  </div>
</template>

<style>
/* 색상 변수 */
:root {
  --color-base: #FFED90;
  --color-white: #FFFFFF;
  --color-dark-gray: #353535;
  --color-ivory: #FFFAE0;
  --color-point: #FFD600;
}

/* FullCalendar 커스텀 스타일 */
.fc {
  font-family: 'Noto Sans KR', 'Roboto', sans-serif;
  border: none;
}

.fc-day-today {
  background-color: rgba(255, 214, 0, 0.1) !important;
}

/* 이벤트 스타일 개선 */
.fc-daygrid-event {
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.8rem;
  border: none !important;
  background-color: #FFD600 !important;
  color: #353535 !important;
  font-weight: 500;
}

/* 모달 z-index 관리 */
.day-events-modal {
  z-index: 50;
}

.detail-modal {
  z-index: 60;
}

/* 이벤트 스타일 개선 */
.fc-daygrid-event {
  border-radius: 4px !important;
  padding: 2px 6px !important;
  font-size: 0.8rem !important;
  cursor: pointer !important;
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  width: 90% !important;
  display: block !important;
  text-align: center !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  height: auto !important;
  min-height: 22px !important;
}

/* 커스텀 이벤트 콘텐츠 스타일 */
.custom-event-content {
  font-size: 0.8rem;
  font-weight: 500;
  color: #353535;
  text-align: center;
  width: 100%;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.fc-h-event {
  background-color: #FFD600 !important;
  border-color: #FFD600 !important;
  color: #353535 !important;
  border-width: 0 !important;
  border-left-width: 0 !important;
  height: auto !important;
}

/* 이벤트 메인 컨텐츠 스타일 */
.fc-event-main {
  padding: 1px 3px !important;
  display: block !important;
  text-align: center !important;
  color: #353535 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}

/* 이벤트 컨테이너 스타일 개선 */
.fc-daygrid-event-harness {
  margin: 1px 0 !important;
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  height: auto !important;
}

/* 날짜 바디 영역 조정 */
.fc-daygrid-day-events {
  padding: 0 2px !important;
  margin-top: 2px !important;
  flex-grow: 1 !important;
  width: 100% !important;
  min-height: 25px !important;
}

/* 종일 이벤트 스타일 */
.fc-daygrid-block-event {
  margin: 2px 0 !important;
  width: 90% !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

/* dot 이벤트 스타일 숨기기 및 변환 */
.fc-daygrid-dot-event {
  display: block !important;
  padding: 2px 6px !important;
  background-color: #FFD600 !important;
  border-color: #FFD600 !important;
}

.fc-daygrid-dot-event .fc-event-title {
  font-weight: 500 !important;
  flex-grow: 1 !important;
  display: block !important;
  color: #353535 !important;
}

/* 다른 월의 날짜 스타일 */
.fc-day-other {
  opacity: 0.4;
  background-color: rgba(0, 0, 0, 0.02) !important;
}

/* 이벤트 "더보기" 링크 스타일 */
.fc-daygrid-more-link {
  font-size: 0.8rem !important;
  color: #3182ce !important;
  font-weight: 500 !important;
  margin: 0 auto !important;
  display: block !important;
  text-align: center !important;
}

/* 날짜 셀 스타일 */
.fc-daygrid-day {
  border: none !important;
  background-color: transparent;
  cursor: pointer;
}

.fc-daygrid-day-frame {
  padding: 2px;
  border-radius: 8px;
  min-height: 80px;
}

/* 날짜 상단 영역 스타일 강제 재정의 - 좌측 정렬 보장 */
.fc-daygrid-day-top {
  justify-content: flex-start !important;
  flex-direction: row !important;
  padding: 2px 0 0 4px !important;
}

/* 날짜와 LLM 표시 컨테이너 스타일 */
.day-cell-content {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: auto !important;
}

/* 날짜 셀 전체 구조 조정 */
.fc-daygrid-day-frame {
  display: flex !important;
  flex-direction: column !important;
  padding: 2px !important;
}

/* 날짜 숫자 스타일 강제 재정의 */
.fc-daygrid-day-number {
  font-size: 0.9rem !important;
  padding: 0 !important;
  color: #353535 !important;
  font-weight: 400 !important;
  text-align: left !important;
  position: static !important;
  width: auto !important;
  margin: 0 !important;
}

/* 요일별 날짜 색상 */
.fc-day-sun .fc-daygrid-day-number {
  color: #e53e3e !important;
}

.fc-day-sat .fc-daygrid-day-number {
  color: #3182ce !important;
}

/* LLM 요약 표시 스타일 */
.llm-indicator {
  font-size: 1rem !important;
  color: #3182ce !important;
  font-weight: 800 !important;
  margin-left: 2px !important;
  display: inline !important;
}

/* a 태그 인라인 스타일 강제 적용 */
.fc a {
  text-decoration: none !important;
  min-width: auto !important;
  display: inline !important;
}

/* 특별히 날짜 셀의 패딩을 더 명시적으로 설정 */
.fc .fc-daygrid-day-top a {
  display: inline !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* 요일 헤더 영역 높이 최소화 */
.fc-col-header {
  height: 0;
  visibility: hidden;
  display: none;
}
</style> 