<!-- eslint-disable import/no-duplicates -->
<script setup>
import { onMounted, onUnmounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import { useCalendarStore } from '@/store/calendar'
import { useCalendarConfig } from '@/composables/useCalendarConfig'
import { useModalManager } from '@/composables/useModalManager'
import { normalizeDate, formatDate } from '@/utils/dateUtils'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import CalendarHeader from '@/components/calendar/CalendarHeader.vue'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import DayEventsModal from '@/components/calendar/DayEventsModal.vue'
import EventDetailModal from '@/components/calendar/EventDetailModal.vue'
import LLMSummaryModal from '@/components/calendar/LLMSummaryModal.vue'
import AddEventModal from '@/components/calendar/AddEventModal.vue'
import AddDiaryTypeModal from '@/components/calendar/AddDiaryTypeModal.vue'
import EventModal from '@/components/calendar/EventModal.vue'
import BabyDiaryModal from '@/components/calendar/BabyDiaryModal.vue'
import { ref } from 'vue'

// 로깅 컨텍스트 설정
const CONTEXT = 'Calendar'

// 스토어 및 컴포저블 사용
const calendarStore = useCalendarStore()
const modalManager = useModalManager()

// 현재 년월 상태 관리
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// FAB 관련 상태 관리
const showFABMenu = ref(false)
const showEventModal = ref(false)
const showBabyDiaryModal = ref(false)
const selectedDate = ref(null)

// 날짜 클릭 핸들러
const handleDateClick = (info) => {
  logger.debug(CONTEXT, '날짜 클릭됨:', info.dateStr)
  calendarStore.setSelectedDate(info.dateStr)
  modalManager.openDayEventsModal(info.dateStr)
}

// 이벤트 클릭 핸들러
const handleEventClick = (info) => {
  const eventId = info.event.id
  logger.debug(CONTEXT, '이벤트 클릭됨:', eventId)

  try {
    const eventObj = calendarStore.events.find((e) => e.id === eventId)
    if (eventObj) {
      const dateStr = normalizeDate(eventObj.start)
      logger.debug(CONTEXT, '이벤트 날짜:', dateStr)

      // 먼저 현재 표시된 모든 모달 닫기
      modalManager.closeDayEventsModal()

      // 그런 다음 선택된 날짜를 설정하고 일일 일정 모달 열기
      calendarStore.setSelectedDate(dateStr)
      modalManager.openDayEventsModal(dateStr)
    } else {
      logger.warn(
        CONTEXT,
        `이벤트 ID(${eventId})에 해당하는 이벤트를 찾을 수 없음`
      )
    }
  } catch (error) {
    handleError(error, CONTEXT)
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

// 월 이동 핸들러
const handlePrevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  prevMonth()
}

const handleNextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  nextMonth()
}

const handleGoToToday = () => {
  const today = new Date()
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  goToToday()
}

// 컴포넌트 마운트 시 현재 날짜 정보 초기화
onMounted(() => {
  logger.info(CONTEXT, '캘린더 컴포넌트 마운트됨')

  try {
    // 현재 날짜로 초기화
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
    
    // 캘린더 API를 통해 날짜 설정
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.gotoDate(today)
      calendarApi.render()
    }
    
    logger.debug(CONTEXT, '현재 날짜 정보 업데이트됨')
    
    // 임신 상태 설정 (서버에서 가져온 값 사용)
    calendarStore.setPregnancyInfo(true, '애기')
    logger.debug(CONTEXT, '임신 상태 설정됨')
    
    // 아기 일기 데이터 불러오기
    calendarStore.fetchBabyDiaries()
    logger.debug(CONTEXT, '아기 일기 데이터 로드됨')
  } catch (error) {
    handleError(error, `${CONTEXT}.onMounted`)
  }

  // LLM 요약 삭제 이벤트 리스너
  document.addEventListener('llm-summary-deleted', handleLLMSummaryDeleted)
  logger.debug(CONTEXT, 'LLM 요약 삭제 이벤트 리스너 등록됨')
})

// LLM 요약 삭제 이벤트 핸들러
const handleLLMSummaryDeleted = (event) => {
  logger.info(CONTEXT, 'LLM 요약 삭제 이벤트 감지됨')
  if (!calendarRef.value) {
    logger.warn(CONTEXT, '캘린더 참조가 없어 이벤트를 처리할 수 없음')
    return
  }

  try {
    const calendarApi = calendarRef.value.getApi()
    const deletedDate = event.detail?.date

    if (!deletedDate) {
      logger.warn(CONTEXT, '삭제된 날짜 정보가 없습니다')
      return
    }

    // 최적화된 업데이트 방법 사용
    // 1. 이벤트를 다시 가져옴
    calendarApi.refetchEvents()
    logger.debug(CONTEXT, '캘린더 이벤트 리패치 완료')

    // 2. requestAnimationFrame을 사용하여 렌더링 최적화
    // 브라우저의 다음 렌더링 사이클에 렌더링을 예약하여 더 부드러운 업데이트 수행
    requestAnimationFrame(() => {
      // 3. 화면에 변경사항 반영
      calendarApi.render()
      logger.debug(CONTEXT, '캘린더 렌더링 완료')

      logger.info(CONTEXT, '캘린더 업데이트 완료 (날짜:', deletedDate, ')')
    })
  } catch (error) {
    handleError(error, `${CONTEXT}.handleLLMSummaryDeleted`)
  }
}

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  document.removeEventListener('llm-summary-deleted', handleLLMSummaryDeleted)
  logger.debug(CONTEXT, 'LLM 요약 삭제 이벤트 리스너 제거됨')
  logger.info(CONTEXT, '캘린더 컴포넌트 언마운트됨')
})

// FAB 메뉴 클릭 핸들러
const handleFABMenuClick = (action) => {
  showFABMenu.value = false
  selectedDate.value = formatDate(new Date())
  
  if (action === 'event') {
    showEventModal.value = true
  } else if (action === 'baby') {
    showBabyDiaryModal.value = true
  }
}

const handleEventSave = async (eventData) => {
  try {
    await calendarStore.addEvent(eventData)
    showEventModal.value = false
  } catch (error) {
    console.error('일정 저장 중 오류 발생:', error)
    alert('일정 저장에 실패했습니다. 다시 시도해주세요.')
  }
}

const handleBabyDiarySave = async (diaryData) => {
  try {
    await calendarStore.addBabyDiary(diaryData)
    showBabyDiaryModal.value = false
  } catch (error) {
    console.error('일기 저장 중 오류 발생:', error)
    alert('일기 저장에 실패했습니다. 다시 시도해주세요.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 상단 헤더 -->
    <CalendarHeader
      :current-year="currentYear"
      :current-month="currentMonth"
      @prev-month="handlePrevMonth"
      @next-month="handleNextMonth"
      @today="handleGoToToday"
    />

    <!-- 캘린더 -->
    <div class="calendar-container">
      <FullCalendar
        ref="calendarRef"
        :options="calendarOptions"
        class="calendar"
      />
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="calendar" class="bottom-nav" />

    <!-- FAB 메뉴 -->
    <div class="fab-container">
      <button
        class="fab-button"
        @click="showFABMenu = !showFABMenu"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
      
      <div v-if="showFABMenu" class="fab-menu">
        <button
          class="fab-menu-item"
          @click="handleFABMenuClick('event')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          일정 등록
        </button>
        <button
          v-if="calendarStore.isPregnant"
          class="fab-menu-item"
          @click="handleFABMenuClick('baby')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {{ calendarStore.babyNickname }}{{ calendarStore.getJosa(calendarStore.babyNickname, '과', '와') }}의 하루
        </button>
      </div>
    </div>

    <!-- 일정 등록 모달 -->
    <EventModal
      v-if="showEventModal"
      :show="showEventModal"
      :date="selectedDate"
      @close="showEventModal = false"
      @save="handleEventSave"
    />

    <!-- 아기와의 하루 모달 -->
    <BabyDiaryModal
      v-if="showBabyDiaryModal"
      :show="showBabyDiaryModal"
      :date="selectedDate"
      @close="showBabyDiaryModal = false"
      @save="handleBabyDiarySave"
    />

    <!-- 일일 일정 모달 -->
    <DayEventsModal
      :show="modalManager.showDayEventsModal.value"
      :date="calendarStore.selectedDate"
      :events="calendarStore.eventsForSelectedDate"
      :llm-summary="calendarStore.llmSummaryForSelectedDate"
      :baby-diary="calendarStore.babyDiaryForSelectedDate"
      @close="modalManager.closeDayEventsModal"
      @add-event="modalManager.openAddEventModal"
      @view-event="modalManager.openEventDetailModal"
      @view-llm-summary="modalManager.openLLMDetailModal"
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

    <!-- 일정 유형 선택 모달 -->
    <AddDiaryTypeModal
      :show="modalManager.showDiaryTypeModal.value"
      @close="modalManager.closeDiaryTypeModal"
    />
  </div>
</template>

<style>
/* 색상 변수 */
:root {
  --color-base: #ffed90;
  --color-white: #ffffff;
  --color-dark-gray: #353535;
  --color-ivory: #fffae0;
  --color-point: #ffd600;
}

/* 캘린더 컨테이너 스타일 */
.calendar-container {
  min-height: calc(10vh - 120px);
  background-color: var(--color-ivory);
  padding: 1rem;
  margin-bottom: 60px;
  position: relative;
  z-index: 1;
}

/* FullCalendar 기본 스타일 */
.fc {
  font-family: "Noto Sans KR", "Roboto", sans-serif;
  border: none;
  background-color: transparent;
  height: 100%;
  width: 100%;
}

.fc-day-today {
  background-color: rgba(255, 214, 0, 0.1);
}

/* 요일 헤더 영역 숨기기 */
.fc-col-header {
  height: 0;
  line-height: 0;
  visibility: hidden;
  display: none;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.fc .fc-col-header-cell-cushion {
  display: none;
}

.fc .fc-col-header-cell {
  height: 0;
  padding: 0;
  border: none;
}

/* 날짜 셀 스타일 */
.fc-daygrid-day {
  border: none;
  background-color: transparent;
  cursor: pointer;
  position: relative;
  min-height: 80px;
}

.fc-daygrid-day-frame {
  padding: 4px;
  border-radius: 8px;
  min-height: 80px;
  background-color: rgba(255, 255, 255, 0.6);
  transition: background-color 0.2s ease;
}

.fc-daygrid-day:hover .fc-daygrid-day-frame {
  background-color: rgba(255, 255, 255, 0.9);
}

/* 날짜 상단 영역 스타일 */
.fc-daygrid-day-top {
  justify-content: flex-start;
  flex-direction: row;
  padding: 2px 0 0 4px;
}

/* 날짜와 표시 아이콘 컨테이너 */
.day-cell-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  width: fit-content;
}

/* 날짜 숫자 스타일 */
.fc-daygrid-day-number {
  font-size: 0.9rem;
  padding: 0;
  color: #353535;
  font-weight: 400;
  text-align: left;
  position: static;
  width: auto;
  margin: 0;
}

/* 요일별 날짜 색상 */
.fc-day-sun .fc-daygrid-day-number {
  color: #e53e3e;
}

.fc-day-sat .fc-daygrid-day-number {
  color: #3182ce;
}

/* LLM 요약 표시 스타일 */
.llm-indicator {
  font-size: 1.2rem;
  color: #3182ce;
  font-weight: 800;
  line-height: 1;
  margin-top: -4px;
}

/* 아기 일기 표시 스타일 */
.baby-diary-indicator {
  font-size: 0.9rem;
  line-height: 1;
  vertical-align: middle;
  margin-top: -2px;
}

/* 이벤트 스타일 */
.fc-daygrid-event {
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 2px;
  margin-bottom: 2px;
  margin-left: auto;
  margin-right: auto;
  width: 90%;
  display: block;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: auto;
  min-height: 22px;
  background-color: #ffd600;
  color: #353535;
  font-weight: 500;
  border: none;
}

/* 이벤트 메인 콘텐츠 */
.fc-event-main {
  padding: 1px 3px;
  display: block;
  text-align: center;
  color: #353535;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 이벤트 컨테이너 */
.fc-daygrid-event-harness {
  margin: 1px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  height: auto;
}

/* 날짜 바디 영역 */
.fc-daygrid-day-events {
  padding: 0 2px;
  margin-top: 2px;
  flex-grow: 1;
  width: 100%;
  min-height: 25px;
}

/* 종일 이벤트 */
.fc-daygrid-block-event {
  margin: 2px 0;
  width: 90%;
  margin-left: auto;
  margin-right: auto;
}

/* dot 이벤트 스타일 */
.fc-daygrid-dot-event {
  display: block;
  padding: 2px 6px;
  background-color: #ffd600;
  border-color: #ffd600;
}

.fc-daygrid-dot-event .fc-event-title {
  font-weight: 500;
  flex-grow: 1;
  display: block;
  color: #353535;
}

/* 다른 월의 날짜 스타일 */
.fc-day-other {
  opacity: 0.4;
  background-color: rgba(0, 0, 0, 0.02);
}

/* 이벤트 "더보기" 링크 */
.fc-daygrid-more-link {
  font-size: 0.8rem;
  color: #3182ce;
  font-weight: 500;
  margin: 0 auto;
  display: block;
  text-align: center;
}

/* 커스텀 이벤트 콘텐츠 */
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

/* 하단 네비게이션 바 스타일 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: 56px;
}

/* 플로팅 액션 버튼 스타일 */
.floating-action-button {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 40;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--color-point);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.floating-action-button:hover {
  transform: scale(1.05);
}

.floating-action-button::before {
  content: '+';
  font-size: 32px;
  color: var(--color-dark-gray);
  font-weight: bold;
  line-height: 1;
}

/* 모달 z-index 관리 */
.day-events-modal {
  z-index: 50;
}

.detail-modal {
  z-index: 60;
}

/* 모달 스타일 */
.modal-container {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.modal-content {
  background-color: var(--color-white);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.event-detail-modal .modal-content {
  background-color: #ffffff;
  border: 3px solid var(--color-point);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.event-detail-header {
  background-color: var(--color-point);
  color: #000000;
  padding: 14px 18px;
  font-weight: 700;
  border-bottom: 2px solid rgba(0, 0, 0, 0.2);
  font-size: 1.1rem;
}

.event-detail-body {
  padding: 18px;
  background-color: #fffef8;
}

/* 일정 상세 모달 내부 요소 */
.event-detail-field {
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 12px;
}

.event-detail-label {
  font-weight: 600;
  color: #555555;
  margin-bottom: 4px;
}

.event-detail-value {
  color: #000000;
  font-size: 1.05rem;
}

/* 모달 버튼 스타일 */
.event-detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid rgba(0, 0, 0, 0.1);
}

.event-detail-button {
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  margin-left: 10px;
}

.event-detail-delete {
  background-color: #ff6b6b;
  color: white;
}

.event-detail-close {
  background-color: #e9e9e9;
  color: #353535;
}

.day-events-modal .modal-content {
  max-height: 25vh;
  max-width: 50%;
  width: 360px;
  overflow-y: auto;
  padding-bottom: 16px;
  margin: 20px auto;
  position: relative;
}

.day-events-modal .modal-body {
  padding: 12px;
  max-height: calc(25vh - 100px);
  overflow-y: auto;
}

.day-events-modal textarea {
  min-height: 30px;
  max-height: 80px;
  resize: vertical;
  padding: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.day-events-modal .modal-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-white);
  padding: 8px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1;
  margin-top: 8px;
}

.day-events-modal .save-button {
  width: 100%;
  padding: 10px;
  background-color: var(--color-point);
  color: var(--color-dark-gray);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 4px;
}

.day-events-modal .save-button:hover {
  background-color: #ffed90;
}

/* 일정 상세 모달 스타일 */
.event-detail-modal {
  z-index: 70;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
}

.fab-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: var(--color-point);
  color: var(--color-dark-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
  border: none;
  cursor: pointer;
}

.fab-button:hover {
  transform: scale(1.1);
}

.fab-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--color-dark-gray);
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.fab-menu-item:hover {
  background-color: var(--color-ivory);
}

.fab-menu-item svg {
  color: var(--color-point);
}
</style>
