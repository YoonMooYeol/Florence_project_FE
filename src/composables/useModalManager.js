import { ref, computed } from 'vue'
import { useCalendarStore } from '@/store/calendar'
import * as logger from '@/utils/logger'
import { asyncErrorHandler } from '@/utils/errorHandler'
import { normalizeDate } from '@/utils/dateUtils'

/**
 * 캘린더 관련 모달 상태 관리를 위한 컴포저블
 * @returns {Object} 모달 상태 및 관련 함수들
 */
export function useModalManager () {
  const calendarStore = useCalendarStore()
  const CONTEXT = 'useModalManager' // 로깅 컨텍스트

  // 모달 상태
  const showDiaryTypeModal = ref(false)
  const showDayEventsModal = ref(false)
  const showEventDetailModal = ref(false)
  const showAddEventModal = ref(false)
  const showLLMDetailModal = ref(false)
  const showDailyDiaryModal = ref(false)
  const showBabyDiaryModal = ref(false)

  // 모달 데이터 상태
  const dayEvents = ref([])
  const llmSummary = computed(() => calendarStore.selectedLLMSummary)
  const babyDiary = computed(() => calendarStore.selectedBabyDiary)

  /**
   * 모달이 사용하는 데이터 초기화
   */
  const initializeModalData = () => {
    // 이벤트 데이터 초기화
    dayEvents.value = []
  }

  /**
   * 모달 열기 전 다른 모달들을 닫는 유틸리티 함수
   * @param {string} keepModalOpen - 열린 상태로 유지할 모달 이름
   */
  const closeOtherModals = (keepModalOpen) => {
    if (keepModalOpen !== 'dayEvents') showDayEventsModal.value = false
    if (keepModalOpen !== 'addEvent') showAddEventModal.value = false
    if (keepModalOpen !== 'eventDetail') showEventDetailModal.value = false
    if (keepModalOpen !== 'llmDetail') showLLMDetailModal.value = false
    if (keepModalOpen !== 'dailyDiary') showDailyDiaryModal.value = false
    if (keepModalOpen !== 'babyDiary') showBabyDiaryModal.value = false
  }

  // 일정 유형 선택 모달
  const openDiaryTypeModal = () => {
    showDiaryTypeModal.value = true
  }

  const closeDiaryTypeModal = () => {
    showDiaryTypeModal.value = false
  }

  // 일일 일정 모달
  const openDayEventsModal = async (date) => {
    logger.info(CONTEXT, `일일 일정 모달 열기 요청 (날짜: ${date})`)
    
    if (!date) {
      logger.warn(CONTEXT, '날짜 정보가 없어 모달을 열 수 없습니다');
      return;
    }
    
    try {
      // 날짜 정규화
      const normalizedDate = normalizeDate(date);
      
      // 날짜 정규화 후 유효성 체크
      if (!normalizedDate) {
        logger.warn(CONTEXT, '날짜 정규화 실패, 유효하지 않은 날짜 형식입니다:', date);
        return;
      }
      
      logger.debug(CONTEXT, `정규화된 날짜: ${normalizedDate}`);
    
      // 선택된 이벤트 초기화 (중요!)
      calendarStore.setSelectedEvent(null);
      
      // 모달 데이터 초기화
      initializeModalData();
      
      // 다른 모달은 모두 닫기 (먼저 실행하여 UI 정리)
      logger.debug(CONTEXT, '다른 모달들을 모두 닫습니다.')
      closeOtherModals('dayEvents')
      
      // 선택된 날짜 설정
      logger.debug(CONTEXT, `선택된 날짜 설정: ${normalizedDate}`);
      const selectedDate = calendarStore.setSelectedDate(normalizedDate);
      
      // 날짜 설정 실패 체크
      if (!selectedDate) {
        logger.warn(CONTEXT, '날짜 설정에 실패했습니다. 모달을 열지 않습니다.');
        return;
      }
      
      logger.debug(CONTEXT, `날짜 설정 완료: ${selectedDate}`);
      
      // 이벤트 객체 다시 한번 초기화 (확실히 처리)
      calendarStore.setSelectedEvent(null);
      
      // 일일 일정 모달 표시 (데이터 로드 전에 UI 먼저 표시)
      logger.debug(CONTEXT, '일일 일정 모달을 엽니다.')
      showDayEventsModal.value = true
      
      // 약간의 지연 후 데이터 로드 (UI 렌더링 완료 후)
      setTimeout(async () => {
        try {
          // 해당 날짜의 이벤트 로딩 시도
          logger.debug(CONTEXT, '해당 날짜의 이벤트를 로드합니다');
          const events = await calendarStore.fetchDayEvents(normalizedDate);
          dayEvents.value = events || [];
          logger.debug(CONTEXT, `해당 날짜의 이벤트 로드 완료: ${events?.length || 0}개 이벤트`);
          
          // 아기 일기 정보도 함께 로드
          try {
            const diary = await calendarStore.fetchBabyDiaryByDate(normalizedDate);
            logger.debug(CONTEXT, '아기 일기 정보 로드 완료:', diary ? 'O' : 'X');
          } catch (diaryError) {
            logger.error(CONTEXT, '아기 일기 로드 중 오류:', diaryError);
          }
        } catch (loadError) {
          logger.error(CONTEXT, '데이터 로드 중 오류:', loadError);
        }
      }, 50);
      
    } catch (error) {
      logger.error(CONTEXT, '모달 열기 중 오류:', error);
      // 오류가 발생한 경우 모달 상태 정리
      showDayEventsModal.value = false;
      calendarStore.setSelectedDate(null);
      calendarStore.setSelectedEvent(null);
      calendarStore.setSelectedLLMSummary(null);
      calendarStore.setSelectedBabyDiary(null);
      initializeModalData();
    }
  }

  const closeDayEventsModal = () => {
    logger.info(CONTEXT, '일일 일정 모달 닫기')
    showDayEventsModal.value = false
    
    // 선택된 이벤트 정보 초기화
    calendarStore.setSelectedEvent(null)
    
    // 모달 데이터 초기화
    initializeModalData();
    
    // 모든 모달 닫기
    closeOtherModals(null)
  }

  // 일정 상세 모달
  const openEventDetailModal = (event) => {
    logger.info(CONTEXT, '일정 상세 모달 열기 요청:', event)
    
    // 이벤트 객체가 없거나 필수 속성이 없으면 모달을 열지 않음
    if (!event || !event.id || typeof event !== 'object') {
      logger.warn(CONTEXT, '이벤트 객체가 없어 모달을 열 수 없습니다');
      return;
    }

    // 일일 일정 모달이 열려있는지 확인
    if (!showDayEventsModal.value) {
      logger.warn(CONTEXT, '일일 일정 모달이 열려있지 않습니다. 먼저 일일 일정 모달을 열어야 합니다.');
      
      // 날짜 정보가 있으면 일일 일정 모달만 열고, 이벤트 상세 모달은 열지 않음
      if (event.start) {
        const eventDate = typeof event.start === 'string' && event.start.includes('T') 
          ? event.start.split('T')[0] 
          : normalizeDate(event.start);
        
        logger.debug(CONTEXT, '일정이 선택되었지만 일일 일정 모달이 닫혀 있어 일일 일정 모달만 엽니다. 날짜:', eventDate);
        openDayEventsModal(eventDate);
      }
      return;
    }

    // 일일 일정 모달은 유지하고 다른 모달은 닫기
    closeOtherModals('eventDetail')
    showDayEventsModal.value = true // 일일 일정 모달은 열린 상태 유지

    // 일정 상세 모달 표시
    calendarStore.setSelectedEvent(event)
    logger.debug(CONTEXT, '일정 상세 모달이 열립니다 (일일 일정 모달은 그대로 유지)')
    showEventDetailModal.value = true
  }

  const closeEventDetailModal = () => {
    logger.info(CONTEXT, '일정 상세 모달 닫기')
    showEventDetailModal.value = false
    calendarStore.setSelectedEvent(null)
    // 일일 일정 모달로 돌아가기 (이미 표시되어 있음)
  }

  // 일정 추가 모달
  const openAddEventModal = () => {
    logger.info(CONTEXT, '일정 추가 모달 열기')
    // 모든 모달 닫기
    closeOtherModals('addEvent')
    // 일정 추가 모달만 표시
    showAddEventModal.value = true
  }

  const closeAddEventModal = () => {
    logger.info(CONTEXT, '일정 추가 모달 닫기')
    showAddEventModal.value = false
    // 다른 모달로 돌아가지 않음
  }

  // LLM 요약 상세 모달
  const openLLMDetailModal = (summary) => {
    logger.info(CONTEXT, 'LLM 상세 모달 열기 요청:', summary)

    // 일일 일정 모달은 유지하고 다른 모달은 닫기
    closeOtherModals('llmDetail')
    showDayEventsModal.value = true // 일일 일정 모달은 열린 상태 유지

    // LLM 상세 모달 표시
    calendarStore.setSelectedLLMSummary(summary)
    logger.debug(CONTEXT, 'LLM 상세 모달이 열립니다 (일일 일정 모달은 그대로 유지)')
    showLLMDetailModal.value = true
  }

  const closeLLMDetailModal = () => {
    logger.info(CONTEXT, 'LLM 상세 모달 닫기')
    showLLMDetailModal.value = false
    calendarStore.setSelectedLLMSummary(null)
    // 일일 일정 모달로 돌아가기 (이미 표시되어 있음)
  }

  // 오늘의 하루 모달
  const openDailyDiaryModal = () => {
    showDailyDiaryModal.value = true
  }

  const closeDailyDiaryModal = () => {
    showDailyDiaryModal.value = false
  }

  // 아기와의 하루 모달
  const openBabyDiaryModal = () => {
    showBabyDiaryModal.value = true
  }

  const closeBabyDiaryModal = () => {
    showBabyDiaryModal.value = false
  }

  // 일정 저장 - 비동기 에러 핸들링 적용
  const saveEvent = asyncErrorHandler((newEvent) => {
    logger.info(CONTEXT, '일정 저장:', newEvent)
    const savedEvent = calendarStore.addEvent(newEvent)
    closeAddEventModal()
    // 일일 일정 모달로 돌아가지 않음
    return savedEvent
  }, CONTEXT)

  // 일정 삭제 - 비동기 에러 핸들링 적용
  const deleteEvent = asyncErrorHandler((eventId) => {
    logger.info(CONTEXT, '일정 삭제:', eventId)
    const success = calendarStore.deleteEvent(eventId)
    if (!success) {
      logger.warn(CONTEXT, `일정 삭제 실패. ID: ${eventId} - 해당 일정을 찾을 수 없음`)
    }
    showEventDetailModal.value = false
    // 일일 일정 모달은 이미 표시되어 있음
    return success
  }, CONTEXT)

  // LLM 요약 삭제 - 비동기 에러 핸들링 적용
  const deleteLLMSummary = asyncErrorHandler(async (date) => {
    try {
      logger.info(CONTEXT, 'LLM 요약 삭제:', date)
      // 먼저 LLM 모달만 닫기
      showLLMDetailModal.value = false

      // Vue의 반응성 시스템이 UI 업데이트를 위해 처리할 시간을 주기 위해
      // 다음 마이크로태스크 큐로 작업 연기
      await Promise.resolve()
      // LLM 요약 삭제
      const isDeleted = calendarStore.deleteLLMSummary(date)
      if (!isDeleted) {
        logger.warn(CONTEXT, 'LLM 요약 삭제 실패 - 해당 날짜의 요약을 찾을 수 없음:', date)
        return false
      }
      // LLM 요약 상태 업데이트
      calendarStore.setSelectedLLMSummary(null)
      // 이벤트 방출 - 외부 컴포넌트(Calendar.vue)에서 감지할 수 있도록
      document.dispatchEvent(new CustomEvent('llm-summary-deleted', { detail: { date } }))
      logger.info(CONTEXT, 'LLM 요약 삭제 완료 및 이벤트 발생:', date)
      return true
    } catch (innerError) {
      logger.error(CONTEXT, 'LLM 요약 삭제 과정에서 오류 발생:', innerError)
      return false
    }
  }, CONTEXT)

  return {
    // 모달 상태
    showDiaryTypeModal,
    showDayEventsModal,
    showEventDetailModal,
    showAddEventModal,
    showLLMDetailModal,
    showDailyDiaryModal,
    showBabyDiaryModal,

    // 모달 데이터
    dayEvents,
    llmSummary,
    babyDiary,

    // 모달 관련 함수
    openDiaryTypeModal,
    closeDiaryTypeModal,
    openDayEventsModal,
    closeDayEventsModal,
    openEventDetailModal,
    closeEventDetailModal,
    openAddEventModal,
    closeAddEventModal,
    openLLMDetailModal,
    closeLLMDetailModal,
    openDailyDiaryModal,
    closeDailyDiaryModal,
    openBabyDiaryModal,
    closeBabyDiaryModal,

    // 이벤트 관련 함수
    saveEvent,
    deleteEvent,
    deleteLLMSummary
  }
}
