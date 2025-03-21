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
  <div class="py-4 min-h-screen bg-yellow-200">
    <!-- 달 아이콘 박스 -->
    <div 
      class="bg-point py-0 flex justify-center items-center cursor-pointer" 
      @click="handleGoToToday"
    >
      <div class="w-12 h-8">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 32 32" 
          class="w-full h-full"
        >
          <!-- 달 모양 -->
          <path 
            d="M20 4C13 4 8 9 8 16C8 22 13 28 20 28C23 28 25.5 27 27.5 25.5C23 26.5 18 24 16 20C14 16 15 10 19 7C20.5 5.5 22.5 4.5 25 4.5C23.5 4 21.5 4 20 4Z" 
            fill="#353535"
          />
          <!-- 별 1 -->
          <circle 
            cx="30" 
            cy="6" 
            r="1.2" 
            fill="#353535"
          />
          <!-- 별 2 -->
          <circle 
            cx="25" 
            cy="15" 
            r="1.5" 
            fill="#353535"
          />
          <!-- 별 3 -->
          <circle 
            cx="32" 
            cy="22" 
            r="2" 
            fill="#353535"
          />
          <!-- 별 4 -->
          <circle 
            cx="3" 
            cy="10" 
            r="2" 
            fill="#353535"
          />
          <!-- 별 5 -->
          <circle 
            cx="7" 
            cy="25" 
            r="1.2" 
            fill="#353535"
          />
        </svg>
      </div>
    </div>

    <!-- 상단 헤더 -->
    <CalendarHeader
      :current-year="currentYear"
      :current-month="currentMonth"
      @prev-month="handlePrevMonth"
      @next-month="handleNextMonth"
      @today="handleGoToToday"
      @select-date="handleDateSelect"
    />

    <!-- 요일 표시 (추가됨) -->
    <div class="bg-yellow-200 py-1">
      <div class="max-w-4xl mx-auto flex justify-around">
        <span
          v-for="(day, index) in weekdays"
          :key="index"
          class="text-base font-medium text-dark-gray"
        >
          {{ day }}
        </span>
      </div>
    </div>

    <!-- 캘린더 -->
    <div class="calendar-container">
      <FullCalendar
        ref="calendarRef"
        :options="calendarOptions"
        class="calendar"
      />
    </div>

    <!-- Todo List (추후 작업을 위해 주석 처리) -->
    <!-- <TodoList class="mt-0" /> -->

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar
      active-tab="calendar"
      class="bottom-nav"
    />

    <!-- FAB 메뉴 -->
    <!-- <div class="fab-container">
      <button
        class="fab-button"
        :disabled="popupActive"
        :class="{'opacity-50 cursor-not-allowed': popupActive}"
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

      <div
        v-if="showFABMenu"
        class="fab-menu"
      >
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
    </div> -->

    <!-- 일정 등록 모달 -->
    <EventModal
      v-if="showEventModal"
      :show="showEventModal"
      :date="selectedDate"
      @close="showEventModal = false"
      @save="handleEventSave"
    />

    <!-- 일정 등록 모달 -->
    <AddEventModal
      :show="modalManager.showAddEventModal.value"
      :selected-date="calendarStore.selectedDate"
      @close="modalManager.closeAddEventModal"
      @save="handleEventSave"
    />

    <!-- 일정 유형 선택 모달 -->
    <AddDiaryTypeModal
      :show="modalManager.showDiaryTypeModal.value"
      @close="modalManager.closeDiaryTypeModal"
    />

    <!-- Popup 배경 오버레이 -->
    <div
      v-if="modalManager.showDayEventsModal.value"
      class="modal-overlay"
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
      @delete="handleEventDelete"
    />

    <!-- LLM 대화 요약 상세 모달 -->
    <LLMSummaryModal
      :show="modalManager.showLLMDetailModal.value"
      :summary="calendarStore.selectedLLMSummary"
      @close="modalManager.closeLLMDetailModal"
      @delete="modalManager.deleteLLMSummary"
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
  flex: 1;
  background-color: var(--color-ivory);
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  padding-bottom: 0;
  position: relative;
  z-index: 0;
  height: calc(100vh - 100px);
  margin-bottom: 0;
}

/* FullCalendar 기본 스타일 */
.fc {
  font-family: "Noto Sans KR", "Roboto", sans-serif;
  border: none;
  background-color: transparent;
  height: calc(100vh - 120px);
  width: 100%;
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
  border: 1px solid rgba(181, 179, 179, 0.5);
  background-color: transparent;
  cursor: pointer;
  position: relative;
  min-height: 180px;
}

.fc-daygrid-day-frame {
  padding-top: 36px;
  min-height: 180px;
  background-color: rgba(255, 255, 255, 0.6);
}

/* 토요일과 일요일 칸 스타일 */
.fc-day-sat .fc-daygrid-day-frame,
.fc-day-sun .fc-daygrid-day-frame {
  background-color: rgba(255, 255, 255, 0);
}

/* 테이블 보더 스타일 */
.fc-theme-standard td {
  border: 1px solid rgba(181, 179, 179, 0.5);
}

.fc-theme-standard th {
  border: 1px solid rgba(181, 179, 179, 0.3);
}

.fc-theme-standard .fc-scrollgrid {
  border: 1px solid rgba(181, 179, 179, 0.3);
}

/* 마지막 주의 선도 유지 */
.fc .fc-scrollgrid-section:last-child > tr > td {
  border-bottom: 1px solid rgba(181, 179, 179, 0.3)
}

/* 날짜 상단 영역 스타일 */
.fc-daygrid-day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  padding: 2px 4px;
}

/* 날짜 숫자 스타일 */
.fc-daygrid-day-number {
  font-size: 0.85rem;
  color: #353535;
  font-weight: 400;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: -15px;
}

/* 오늘 날짜 스타일 */
.fc-day-today {
  background-color: #ffed90;
}

.fc-day-today .fc-daygrid-day-frame {
  background-color: #fff5c2;
}

.fc-day-today .fc-daygrid-day-number {
  color: var(--color-dark-gray);
  font-weight: 600;
}

/* LLM 요약 표시 스타일 */
.llm-indicator {
  font-size: 2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3986ce;
  width: 20px;
  height: 20px;
  position: absolute;
  left: 3px;
  margin-top: -21px;
}

/* 아기 일기 표시 스타일 */
.baby-diary-indicator {
  font-size: 0.8rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #f05454;
  width: 20px;
  height: 0px;
  position: absolute;
  left: 12px;
  margin-top: -12px;
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
  height: 64px;
  background-color: white;
  padding-bottom: 0px;
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

.fab-button:disabled:hover {
  transform: scale(1);
}

.fab-button:disabled {
  pointer-events: none;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 45;
}
</style>
