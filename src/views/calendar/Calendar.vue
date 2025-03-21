<!-- eslint-disable no-unused-vars -->
<!-- eslint-disable import/no-duplicates -->
<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import { useCalendarStore } from '@/store/calendar'
import { useCalendarConfig } from '@/composables/useCalendarConfig'
import { useModalManager } from '@/composables/useModalManager'
import { normalizeDate, formatDate, weekdays, formatTime } from '@/utils/dateUtils'
import * as logger from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import CalendarHeader from '@/components/calendar/CalendarHeader.vue'
import BottomNavBar from '@/components/common/BottomNavBar.vue'
import DayEventsModal from '@/components/calendar/DayEventsModal.vue'
import EventDetailModal from '@/components/calendar/EventDetailModal.vue'
import LLMSummaryModal from '@/components/calendar/LLMSummaryModal.vue'
import AddEventModal from '@/components/calendar/AddEventModal.vue'
import AddDiaryTypeModal from '@/components/calendar/AddDiaryTypeModal.vue'
import EventModal from '@/components/calendar/EventModal.vue'
import { savePregnancyId } from '@/utils/auth'

// import TodoList from './TodoList.vue'

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

const popupActive = computed(() => {
  return showEventModal.value ||
         showBabyDiaryModal.value ||
         modalManager.showDayEventsModal.value ||
         modalManager.showEventDetailModal.value ||
         modalManager.showLLMDetailModal.value ||
         modalManager.showAddEventModal.value ||
         modalManager.showDiaryTypeModal.value
})

// 날짜 클릭 핸들러
const handleDateClick = (info) => {
  try {
    if (!info || !info.dateStr) {
      logger.error(CONTEXT, '날짜 클릭 이벤트에 날짜 정보가 없습니다', info)
      return
    }

    // 날짜 형식 검증
    const dateStr = normalizeDate(info.dateStr) // YYYY-MM-DD 형식으로 정규화
    logger.debug(CONTEXT, '날짜 클릭됨 (정규화 후):', dateStr)

    // 이미 같은 날짜의 모달이 열려있는지 확인
    const isSameDateModalOpen =
      modalManager.showDayEventsModal.value &&
      calendarStore.selectedDate.value === dateStr

    if (isSameDateModalOpen) {
      logger.debug(CONTEXT, '이미 열린 날짜 모달 재클릭. 모달 닫기')
      // 이미 열려 있다면 그냥 닫기만 함
      modalManager.closeDayEventsModal()
      return
    }

    // 이전에 선택된 이벤트 초기화
    calendarStore.setSelectedEvent(null)

    // 날짜 설정 및 모달 열기
    logger.debug(CONTEXT, `날짜(${dateStr}) 설정 시도`)
    const result = calendarStore.setSelectedDate(dateStr)
    logger.debug(CONTEXT, '날짜 설정 결과:', result)

    // 실제 모달 열기
    logger.debug(CONTEXT, '일일 일정 모달 열기 시도')
    modalManager.openDayEventsModal(dateStr)
  } catch (error) {
    logger.error(CONTEXT, '날짜 클릭 처리 중 오류 발생:', error)
    handleError(error, CONTEXT)
  }
}

// 이벤트 클릭 핸들러
const handleEventClick = (info) => {
  const eventId = info.event.id
  logger.debug(CONTEXT, '이벤트 클릭됨:', eventId)

  try {
    // events 배열에서 해당 이벤트 찾기
    const eventObj = calendarStore.events.find((e) => e.id === eventId)
    if (eventObj) {
      console.log('찾은 이벤트:', eventObj)

      // 이벤트의 날짜 정보 추출
      let eventDate = null
      if (eventObj.start) {
        eventDate = typeof eventObj.start === 'string' && eventObj.start.includes('T')
          ? eventObj.start.split('T')[0]
          : normalizeDate(eventObj.start)
      }

      // 날짜가 있으면 일일 이벤트 모달 열기
      if (eventDate) {
        // 일일 이벤트 모달이 닫혀있거나 다른 날짜인 경우에만 열기
        if (!modalManager.showDayEventsModal.value || calendarStore.selectedDate.value !== eventDate) {
          logger.debug(CONTEXT, '일정 클릭: 일일 일정 모달을 엽니다:', eventDate)
          calendarStore.setSelectedDate(eventDate)
          modalManager.openDayEventsModal(eventDate)
        } else {
          // 이미 해당 날짜의 DayEventsModal이 열려있는 경우에는 아무 작업도 하지 않음
          logger.debug(CONTEXT, '이미 해당 날짜의 일일 일정 모달이 열려있습니다:', eventDate)
        }
      } else {
        logger.warn(CONTEXT, '이벤트에 날짜 정보가 없습니다:', eventObj)
        alert('일정의 날짜 정보가 없습니다.')
      }
    } else {
      console.warn('이벤트를 찾을 수 없음:', eventId)
      alert('해당 일정을 찾을 수 없습니다.')
    }
  } catch (error) {
    console.error('이벤트 클릭 처리 중 오류:', error)
    handleError(error, CONTEXT)
  }
}

// 캘린더 설정 가져오기
const {
  calendarRef,
  calendarOptions,
  prevMonth,
  nextMonth,
  goToToday
} = useCalendarConfig(handleDateClick, handleEventClick)

// 월별 view 및 이벤트 렌더링 커스터마이징
calendarOptions.initialView = 'dayGridMonth'
calendarOptions.dayMaxEvents = 3
calendarOptions.eventContent = function (arg) {
  console.log('이벤트 렌더링:', arg.event.title, arg.event)
  // 오직 타이틀만 표시합니다
  return { html: `<span class="fc-event-title">${arg.event.title}</span>` }
}

// 이벤트 소스 설정 - FullCalendar가 직접 데이터를 가져오게 함
calendarOptions.eventSources = [
  {
    // events 함수는 startStr, endStr, successCallback 파라미터를 받음
    events: async (info, successCallback, failureCallback) => {
      try {
        const startDate = info.startStr.split('T')[0] // YYYY-MM-DD 형식으로 변환
        const endDate = info.endStr.split('T')[0] // YYYY-MM-DD 형식으로 변환
        
        logger.info(CONTEXT, `이벤트 요청 범위: ${startDate} ~ ${endDate}`)
        
        // 현재 년월 정보 업데이트
        const startDateObj = new Date(startDate)
        currentYear.value = startDateObj.getFullYear()
        currentMonth.value = startDateObj.getMonth() + 1
        calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
        
        // API에서 직접 데이터 가져오기
        await calendarStore.fetchEvents()
        
        // calendarStore.events에서 FullCalendar 형식으로 변환
        const mappedEvents = calendarStore.events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.start,
          backgroundColor: event.backgroundColor || '#FFD600',
          borderColor: event.borderColor || '#FFD600',
          textColor: event.textColor || '#353535',
          allDay: event.allDay || false
        }))
        
        logger.info(CONTEXT, `${mappedEvents.length}개 이벤트 로드됨`)
        successCallback(mappedEvents)
      } catch (error) {
        logger.error(CONTEXT, '이벤트 로드 중 오류 발생:', error)
        failureCallback(error)
      }
    }
  }
]

// 월 이동 핸들러
const handlePrevMonth = async () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  prevMonth()
  
  // 월 변경 후 해당 월의 이벤트 로드
  await loadMonthEvents()
}

const handleNextMonth = async () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  nextMonth()
  
  // 월 변경 후 해당 월의 이벤트 로드
  await loadMonthEvents()
}

const handleGoToToday = async () => {
  const today = new Date()
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)
  goToToday()
  
  // 월 변경 후 해당 월의 이벤트 로드
  await loadMonthEvents()
}

// 현재 월의 이벤트 로딩 함수
const loadMonthEvents = async () => {
  try {
    logger.info(CONTEXT, `${currentYear.value}년 ${currentMonth.value}월 이벤트 로딩 시작`)
    
    // 이벤트 데이터 로드
    const events = await calendarStore.fetchEvents()
    logger.info(CONTEXT, `이벤트 ${events.length}개 로드됨`)
    
    // LLM 요약 데이터 로드
    const summaries = await calendarStore.fetchLLMSummaries(currentYear.value, currentMonth.value)
    logger.info(CONTEXT, `LLM 요약 ${summaries.length}개 로드됨`)
    
    // 태교일기 데이터 로드 
    const diaries = await calendarStore.fetchBabyDiaries(currentYear.value, currentMonth.value)
    logger.info(CONTEXT, `태교일기 ${diaries.length}개 로드됨`)
    
    if (calendarRef.value) {
      const calendarApi = calendarRef.value.getApi()
      calendarApi.refetchEvents()
      
      // 브라우저의 다음 렌더링 사이클에 렌더링을 예약
      requestAnimationFrame(() => {
        calendarApi.render()
        logger.info(CONTEXT, '캘린더 렌더링 완료')
      })
    }
  } catch (error) {
    logger.error(CONTEXT, '이벤트 로드 중 오류 발생:', error)
    handleError(error, `${CONTEXT}.loadMonthEvents`)
  }
}

// 컴포넌트 마운트 시 현재 날짜 정보 초기화
onMounted(async () => {
  logger.info(CONTEXT, '캘린더 컴포넌트 마운트')
  
  try {
    // 임신 정보 초기화
    await calendarStore.initPregnancyInfo()

    // 이전에 저장된 임신 ID가 있으면 설정
    const storedPregnancyId = localStorage.getItem('pregnancyId')
    if (storedPregnancyId) {
      calendarStore.setPregnancyId(storedPregnancyId)
    }

    // 임신 정보 초기화 성공 로깅
    if (calendarStore.pregnancyId.value) {
      logger.info(CONTEXT, '임신 정보 초기화 성공:', calendarStore.pregnancyId.value)
      savePregnancyId(calendarStore.pregnancyId.value)
    } else {
      logger.warn(CONTEXT, '임신 정보가 없습니다')
    }

    // 메인 캘린더 데이터 로드
    await loadMonthEvents() 

    // 저장된 모달 상태가 있는지 확인하고 있으면 모달 다시 열기
    const savedModalState = sessionStorage.getItem('modalState')
    if (savedModalState) {
      const modalState = JSON.parse(savedModalState)
      if (modalState.open && modalState.date) {
        logger.info(CONTEXT, '저장된 모달 상태 복원:', modalState)
        
        // 날짜 설정
        calendarStore.setSelectedDate(modalState.date)
        
        // 모달 열기
        modalManager.openDayEventsModal(modalState.date)
        
        // 활성 탭 설정 (태교일기 탭인 경우)
        if (modalState.activeTab === 'baby') {
          // 다음 틱에서 activeTab 설정 (DOM이 업데이트된 후)
          setTimeout(() => {
            document.querySelector('[data-tab="baby"]')?.click()
          }, 100)
        }
        
        // 사용 후 삭제
        sessionStorage.removeItem('modalState')
      }
    }
  } catch (error) {
    logger.error(CONTEXT, '캘린더 마운트 중 오류 발생:', error)
    handleError(error, CONTEXT)
  }
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
  try {
    document.removeEventListener('llm-summary-deleted', handleLLMSummaryDeleted)
    
    // 모달 상태 정리
    sessionStorage.removeItem('modalState')
    
    logger.info(CONTEXT, '캘린더 컴포넌트 언마운트: 이벤트 리스너 및 상태 정리 완료')
  } catch (error) {
    logger.error(CONTEXT, '캘린더 언마운트 중 오류 발생:', error)
  }
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
    console.log('일정 저장 시작:', eventData)
    // 입력받은 날짜를 YYYY-MM-DD 형식으로 정규화
    eventData.start = normalizeDate(eventData.start)
    
    // 반복 일정 여부 확인
    if (eventData.recurring && eventData.recurring !== 'none') {
      console.log('반복 일정 감지:', eventData.recurring)
    }

    const savedEvent = await calendarStore.addEvent(eventData)
    console.log('저장된 일정:', savedEvent)

    if (savedEvent) {
      console.log('일정 저장 성공')
      showEventModal.value = false

      // 캘린더 새로고침
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        // 이벤트를 다시 가져오고 즉시 렌더링
        await calendarApi.refetchEvents()
        requestAnimationFrame(() => {
          calendarApi.render()
          console.log('캘린더 렌더링 완료')
        })
      }
    } else {
      console.error('일정 저장 실패: savedEvent가 없음')
      alert('일정 저장에 실패했습니다. 다시 시도해주세요.')
    }
  } catch (error) {
    console.error('일정 저장 중 오류 발생:', error)
    alert('일정 저장에 실패했습니다. 다시 시도해주세요.')
  }
}

const handleEventDelete = async (eventId, isRecurring, deleteOptions = {}) => {
  try {
    console.log('삭제 시도:', {
      eventId,
      isRecurring,
      deleteOptions,
      event: calendarStore.events.find(e => e.id === eventId)
    })

    let success = false

    if (isRecurring) {
      if (deleteOptions?.option === 'until') {
        if (!deleteOptions.untilDate) {
          alert('유지할 마지막 날짜를 선택해주세요.')
          return
        }
        console.log('특정 날짜까지 일정 유지 시도:', deleteOptions.untilDate)
        await calendarStore.deleteRecurringEventsUntil(eventId, deleteOptions.untilDate)
        success = true
      } else {
        console.log('모든 반복 일정 삭제 시도')
        await calendarStore.deleteRecurringEvents(eventId)
        success = true
      }
    } else {
      console.log('단일 일정 삭제 시도')
      await calendarStore.deleteEvent(eventId)
      success = true
    }

    if (success) {
      console.log('일정 삭제 성공')
      modalManager.closeEventDetailModal()

      // 캘린더 새로고침
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        await calendarApi.refetchEvents()
        requestAnimationFrame(() => {
          calendarApi.render()
          console.log('캘린더 렌더링 완료')
        })
      }
    }
  } catch (error) {
    console.error('일정 삭제 중 오류:', error)
    alert(error.message || '일정 삭제 중 오류가 발생했습니다.')
  }
}

// 년/월 선택 핸들러
const handleDateSelect = ({ year, month }) => {
  currentYear.value = year
  currentMonth.value = month
  calendarStore.updateCurrentYearMonth(year, month)
  
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.gotoDate(`${year}-${String(month).padStart(2, '0')}-01`)
    loadMonthEvents()
  }
}

// 추가: LLM 요약 및 태교일기 데이터 변경 시 캘린더를 재렌더링하여 날짜 옆 표시를 실시간 업데이트
watch(() => calendarStore.llmSummaries, () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.render()
    console.log('LLM 요약 변경 감지 - 캘린더 재렌더링')
  }
}, { deep: true })

watch(() => calendarStore.babyDiaries, () => {
  if (calendarRef.value) {
    const calendarApi = calendarRef.value.getApi()
    calendarApi.render()
    console.log('태교일기 변경 감지 - 캘린더 재렌더링')
  }
}, { deep: true })

</script>

<template>
  <div class="flex flex-col min-h-screen bg-ivory">
    <!-- 헤더 -->
    <CalendarHeader
      :current-year="currentYear"
      :current-month="currentMonth"
      @prev-month="handlePrevMonth"
      @next-month="handleNextMonth"
      @go-to-today="handleGoToToday"
    />

    <!-- 캘린더 컨테이너 -->
    <div class="flex-1 p-2">
      <FullCalendar
        ref="calendarRef"
        v-bind="calendarOptions"
        class="h-full bg-white rounded-lg shadow-sm"
      />
    </div>

    <!-- FAB 메뉴 -->
    <div class="fixed bottom-20 right-4 z-40">
      <div
        v-if="showFABMenu"
        class="absolute bottom-16 right-0 flex flex-col space-y-2 mb-2"
      >
        <!-- 일정 추가 버튼 -->
        <button
          class="w-12 h-12 bg-point-yellow rounded-full shadow-lg flex items-center justify-center text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
          @click="showEventModal = true"
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

        <!-- 태교일기 추가 버튼 -->
        <button
          class="w-12 h-12 bg-point-yellow rounded-full shadow-lg flex items-center justify-center text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
          @click="showBabyDiaryModal = true"
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>

      <!-- FAB 토글 버튼 -->
      <button
        class="w-14 h-14 bg-point-yellow rounded-full shadow-lg flex items-center justify-center text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50"
        @click="showFABMenu = !showFABMenu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 transform transition-transform duration-200"
          :class="{ 'rotate-45': showFABMenu }"
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
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar />

    <!-- 모달 컴포넌트들 -->
    <DayEventsModal
      v-if="modalManager.showDayEventsModal"
      :date="calendarStore.selectedDate"
      @close="modalManager.closeDayEventsModal"
    />
    <EventDetailModal
      v-if="modalManager.showEventDetailModal"
      :event="calendarStore.selectedEvent"
      @close="modalManager.closeEventDetailModal"
    />
    <LLMSummaryModal
      v-if="modalManager.showLLMDetailModal"
      :summary="calendarStore.selectedLLMSummary"
      @close="modalManager.closeLLMDetailModal"
    />
    <AddEventModal
      v-if="modalManager.showAddEventModal"
      :date="selectedDate"
      @close="modalManager.closeAddEventModal"
    />
    <AddDiaryTypeModal
      v-if="modalManager.showDiaryTypeModal"
      :date="selectedDate"
      @close="modalManager.closeDiaryTypeModal"
    />
    <EventModal
      v-if="showEventModal"
      :date="selectedDate"
      @close="showEventModal = false"
    />
  </div>
</template>

<style>
/* FullCalendar 모바일 최적화 스타일 */
.fc {
  font-size: 0.875rem;
}

.fc .fc-toolbar {
  padding: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.fc .fc-toolbar-title {
  font-size: 1.25rem;
}

.fc .fc-button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.fc .fc-button-primary {
  background-color: #FFD600;
  border-color: #FFD600;
}

.fc .fc-button-primary:hover {
  background-color: #FFC600;
  border-color: #FFC600;
}

.fc .fc-button-primary:disabled {
  background-color: #E5E5E5;
  border-color: #E5E5E5;
}

.fc .fc-button-primary:not(:disabled):active,
.fc .fc-button-primary:not(:disabled).fc-button-active {
  background-color: #FFB600;
  border-color: #FFB600;
}

.fc .fc-button-primary:focus {
  box-shadow: 0 0 0 0.2rem rgba(255, 214, 0, 0.25);
}

.fc .fc-daygrid-day {
  min-height: 80px;
}

.fc .fc-daygrid-day-number {
  padding: 0.25rem;
  font-size: 0.875rem;
}

.fc .fc-event {
  padding: 0.125rem 0.25rem;
  margin: 0.125rem 0;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.fc .fc-event-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fc .fc-daygrid-more-link {
  font-size: 0.75rem;
  color: #666;
}

.fc .fc-daygrid-day.fc-day-today {
  background-color: rgba(255, 214, 0, 0.1);
}

.fc .fc-daygrid-day.fc-day-other {
  background-color: #F9F9F9;
}

.fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
  color: #999;
}

.fc .fc-daygrid-day.fc-day-other .fc-event {
  opacity: 0.8;
}

/* 모바일에서의 스크롤 최적화 */
@media (max-width: 640px) {
  .fc {
    height: calc(100vh - 180px);
  }

  .fc .fc-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .fc .fc-toolbar-title {
    font-size: 1.125rem;
  }

  .fc .fc-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .fc .fc-daygrid-day {
    min-height: 60px;
  }

  .fc .fc-daygrid-day-number {
    padding: 0.125rem;
    font-size: 0.75rem;
  }

  .fc .fc-event {
    padding: 0.125rem;
    margin: 0.0625rem 0;
    font-size: 0.7rem;
  }

  .fc .fc-daygrid-more-link {
    font-size: 0.7rem;
  }
}
</style>
