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
import { isMultiDayEvent } from '@/utils/calendarUtils'
import '@/assets/styles/calendar.css'
import { useEventLoading } from '@/composables/useEventLoading'
import { refreshCalendar } from '@/utils/calendarRenderer'

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

// 축하 화면 표시 상태 관리
const showCongratulation = ref(false)

// 컴포넌트 마운트 시 로컬 스토리지 확인
onMounted(() => {
  const hideForever = localStorage.getItem('hideCongratulation')
  const isPregnant = localStorage.getItem('isPregnant') === 'true'
  const dueDate = localStorage.getItem('dueDate')
  
  if (dueDate) {
    const today = new Date()
    const dueDateObj = new Date(dueDate)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // 출산 예정일이 어제였고, 임신 중인 경우에만 축하 메시지 표시
    showCongratulation.value = !hideForever && 
                              isPregnant && 
                              dueDateObj.toDateString() === yesterday.toDateString()
  }
})

// 임신 정보 변경 감지
watch(() => calendarStore.isPregnant, (newValue) => {
  if (!newValue) {
    showCongratulation.value = false
  }
})

// 다시 보지 않기 함수
const neverShowAgain = () => {
  localStorage.setItem('hideCongratulation', 'true')
  showCongratulation.value = false
}

// 축하 화면 닫기 함수
const closeCongratulation = () => {
  showCongratulation.value = false
}

// 축하 화면 저장 함수
const saveCongratulation = async () => {
  try {
    // 이미지 요소 가져오기
    const imgElement = document.querySelector('.after-due-date-image')
    if (!imgElement) {
      throw new Error('이미지를 찾을 수 없습니다.')
    }

    // Canvas 생성
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // Canvas 크기 설정
    canvas.width = imgElement.naturalWidth
    canvas.height = imgElement.naturalHeight

    // 이미지를 Canvas에 그리기
    ctx.drawImage(imgElement, 0, 0)

    // Canvas를 Blob으로 변환
    canvas.toBlob((blob) => {
      // Blob URL 생성
      const url = window.URL.createObjectURL(blob)

      // 다운로드 링크 생성
      const link = document.createElement('a')
      link.href = url
      link.download = '축하해요.png'

      // 링크 클릭하여 다운로드
      document.body.appendChild(link)
      link.click()

      // 정리
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      alert('이미지가 저장되었습니다!')
    }, 'image/png')
  } catch (error) {
    console.error('이미지 저장 중 오류 발생:', error)
    alert('이미지 저장에 실패했습니다.')
  }
}

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

    // 실제 모달 열기 - 여기가 중요: 클릭한 날짜를 전달
    logger.debug(CONTEXT, '일일 일정 모달 열기 시도')
    modalManager.openDayEventsModal(dateStr) // 클릭한 날짜를 명시적으로 전달
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
    const eventObj = calendarStore.events.find((e) => e.id === eventId || e.event_id === eventId)
    if (eventObj) {
      console.log('찾은 이벤트:', eventObj)

      // 이벤트의 날짜 정보 추출
      let eventDate = null
      if (eventObj.start_date) {
        // 새로운 모델 구조 사용
        eventDate = eventObj.start_date
      } else if (eventObj.start) {
        // FullCalendar 형식 처리
        eventDate = typeof eventObj.start === 'string' && eventObj.start.includes('T')
          ? eventObj.start.split('T')[0]
          : eventObj.start
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

// 월별 view 설정
calendarOptions.initialView = 'dayGridMonth'
calendarOptions.dayMaxEvents = 3

// 이벤트 소스 설정
calendarOptions.eventSources = [
  {
    events: async (info, successCallback, failureCallback) => {
      try {
        const startDate = info.startStr.split('T')[0]
        const endDate = info.endStr.split('T')[0]

        logger.info(CONTEXT, `이벤트 요청 범위: ${startDate} ~ ${endDate}`)

        // 날짜 범위에 따라 스토어 년/월 값 설정
        const startDateObj = new Date(startDate)
        currentYear.value = startDateObj.getFullYear()
        currentMonth.value = startDateObj.getMonth() + 1
        calendarStore.updateCurrentYearMonth(currentYear.value, currentMonth.value)

        // 확장된 범위의 이벤트 로드 (API가 현재 달과 다음 달 이벤트를 함께 가져옴)
        const events = await calendarStore.fetchEvents()

        // 뷰에 표시되는 이벤트 필터링
        const filteredEvents = events.filter(event => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end || event.start)

          // 뷰의 범위를 넓게 설정하여 다음 달 이벤트도 포함하도록 함
          const viewStart = new Date(startDate)

          // endDate를 기준으로 최소 한 달 이상 확장
          const viewEnd = new Date(endDate)
          viewEnd.setMonth(viewEnd.getMonth() + 1)

          // 이벤트가 확장된 뷰 범위에 포함되는지 확인
          return eventStart < viewEnd && eventEnd >= viewStart
        })

        logger.info(CONTEXT, `${filteredEvents.length}개 이벤트 로드됨 (확장 범위 포함)`)
        successCallback(filteredEvents)
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

// 기존 함수 중 loadMonthEvents 제거 및 useEventLoading에서 가져오기
const { loadMonthEvents } = useEventLoading(calendarStore, calendarRef, currentYear, currentMonth)

// 컴포넌트 마운트 시 현재 날짜 정보 초기화
onMounted(async () => {
  logger.info(CONTEXT, '캘린더 컴포넌트 마운트')

  try {
    // 임신 정보 초기화
    await calendarStore.initPregnancyInfo()

    // 임신 ID가 존재하는지 확인하기 전에 짧은 지연을 추가하여 모든 상태 업데이트가 완료되도록 함
    await new Promise(resolve => setTimeout(resolve, 100))

    // 임신 정보 초기화 성공 로깅
    if (calendarStore.pregnancyId && calendarStore.pregnancyId.value) {
      logger.info(CONTEXT, '임신 정보 초기화 성공:', calendarStore.pregnancyId.value)
    } else {
      logger.warn(CONTEXT, '임신 정보 초기화 실패 또는 임신 정보 없음')
    }

    // 메인 캘린더 데이터 로드
    await loadMonthEvents()

    // 멀티데이 이벤트가 제대로 렌더링되도록 약간의 지연 후 캘린더 리렌더링
    setTimeout(() => {
      if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi()
        calendarApi.refetchEvents()

        // 브라우저의 다음 렌더링 사이클에 렌더링을 예약
        requestAnimationFrame(() => {
          calendarApi.render()
        })
      }
    }, 300)

    // 세션 스토리지에 저장된 모달 상태가 있는지 확인하고 복원
    const storedModalState = sessionStorage.getItem('modalState')
    if (storedModalState) {
      try {
        const modalState = JSON.parse(storedModalState)

        if (modalState.open && modalState.date) {
          logger.info(CONTEXT, '저장된 모달 상태 복원:', modalState)

          // 날짜 설정
          calendarStore.setSelectedDate(modalState.date)

          // 모달 열기
          modalManager.openDayEventsModal(modalState.date)

          // 사용 후 삭제
          sessionStorage.removeItem('modalState')
        }
      } catch (error) {
        logger.error(CONTEXT, '모달 상태 복원 중 오류 발생:', error)
      }
    }

    // 캘린더 새로고침 이벤트 리스너 추가
    window.addEventListener('calendar-needs-refresh', handleCalendarRefresh)

    // 출산 예정일 체크
    await calendarStore.checkDueDate()
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

  // 캘린더 새로고침 이벤트 리스너 제거
  window.removeEventListener('calendar-needs-refresh', handleCalendarRefresh)
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
    eventData.event_day = normalizeDate(eventData.event_day)

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
      await loadMonthEvents()
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
      if (deleteOptions?.option === 'this_only') {
        console.log('이 일정만 삭제 시도')
        await calendarStore.deleteRecurringEventThisOnly(eventId)
        success = true
      } else if (deleteOptions?.option === 'this_and_future') {
        console.log('이후 모든 일정 삭제 시도')
        await calendarStore.deleteRecurringEventsThisAndFuture(eventId)
        success = true
      } else if (deleteOptions?.option === 'all') {
        console.log('모든 반복 일정 삭제 시도')
        await calendarStore.deleteRecurringEventsAll(eventId)
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
      await loadMonthEvents()
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
    // 전체 재렌더링 대신 날짜 표시만 업데이트
    requestAnimationFrame(() => {
      const calendarApi = calendarRef.value.getApi()
      // 기존 이벤트 유지하면서 UI만 업데이트
      calendarApi.updateSize()
      console.log('LLM 요약 변경 감지 - 날짜 표시만 업데이트')
    })
  }
}, { deep: true })

watch(() => calendarStore.babyDiaries, () => {
  if (calendarRef.value) {
    // 전체 재렌더링 대신 날짜 표시만 업데이트
    requestAnimationFrame(() => {
      const calendarApi = calendarRef.value.getApi()
      // 기존 이벤트 유지하면서 UI만 업데이트
      calendarApi.updateSize()
      console.log('태교일기 변경 감지 - 날짜 표시만 업데이트')
    })
  }
}, { deep: true })

// handleCalendarRefresh 함수 수정
const handleCalendarRefresh = async () => {
  try {
    logger.info(CONTEXT, '캘린더 새로고침 이벤트 처리 시작')

    if (!calendarRef.value) {
      logger.warn(CONTEXT, '캘린더 참조가 없어 이벤트를 처리할 수 없음')
      return
    }

    // 캘린더 새로고침 유틸리티 함수 직접 사용
    await refreshCalendar(calendarRef.value.getApi(), loadMonthEvents)
  } catch (error) {
    logger.error(CONTEXT, '캘린더 새로고침 중 오류 발생:', error)
    handleError(error, CONTEXT)
  }
}

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
      <div class="calendar-weekdays">
        <span
          v-for="(day, index) in weekdays"
          :key="index"
          class="text-base font-medium text-dark-gray weekday-label"
        >
          {{ day }}
        </span>
      </div>
    </div>

    <!-- 출산 예정일 이후 오버레이 -->
    <div v-if="calendarStore.isAfterDueDate && showCongratulation && calendarStore.isPregnant" class="after-due-date-overlay">
      <div class="bg-white rounded-lg p-8 shadow-lg relative w-[90%] max-w-4xl flex flex-col items-center justify-center">
        <!-- X 버튼 -->
        <button
          class="absolute top-2 right-2 z-8 bg-red-300 text-white rounded-full p-0.5 hover:bg-red-400 transition-colors"
          @click="closeCongratulation"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- 축하 이미지 컨테이너 -->
        <div class="w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src="/src/assets/images/Congratulation.png"
            alt="출산 예정일 이후"
            class="after-due-date-image"
          >
        </div>

        <!-- 저장하기 버튼 -->
        <button
          class="mt-4 px-5 py-1 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors font-bold text-l"
          @click="saveCongratulation"
        >
          저장하기
        </button>

        <!-- 다시 보지 않기 버튼 -->
        <button
          class="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          @click="neverShowAgain"
        >
          다시 보지 않기
        </button>
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
/* 스타일이 calendar.css로 통합되었습니다 */

/* 일정 앞쪽 마진 줄이기 */
.fc-event, .fc-daygrid-event {
  margin-left: 0 !important;
}

/* 멀티데이 이벤트에 대한 스타일 조정 */
.fc-daygrid-block-event .fc-event-main {
  padding-left: 2px !important;
}
</style>
