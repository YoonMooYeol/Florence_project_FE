/* eslint-disable space-before-function-paren */
/* eslint-disable no-trailing-spaces */
/* eslint-disable semi */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate, isSameDay } from '@/utils/dateUtils'
import api from '@/utils/axios'

// 캘린더 스토어 정의
export const useCalendarStore = defineStore('calendar', () => {
  // 상태 (state)
  const events = ref([]) // 로컬 스토리지에서 읽지 않고 빈 배열로 초기화
  const isAfterDueDate = ref(false) // 출산 예정일 이후 여부

  // LLM 대화 요약 데이터
  const llmSummaries = ref([])

  // 아기 일기 데이터
  const babyDiaries = ref([])

  // 현재 표시 중인 년월
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  // 선택된 날짜 및 이벤트
  const selectedDate = ref(null)
  const selectedEvent = ref(null)
  const selectedLLMSummary = ref(null)
  const selectedBabyDiary = ref(null)
  const isPregnant = ref(false)
  const babyNickname = ref('')
  const pregnancyId = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // 추가: 모든 요청 헤더에 토큰 삽입을 위한 helper 함수
  function getAuthHeaders() {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`
    };
  }

  // 액션 (actions)
  async function fetchEvents() {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 현재 년월 기반으로 필터링 파라미터 구성
      const year = currentYear.value;
      const month = currentMonth.value;
      
      // 월의 시작일과 종료일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 다음 달의 0일 = 현재 달의 마지막 일
      
      // YYYY-MM-DD 형식으로 변환
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/?start_date=${startDateStr}&end_date=${endDateStr}`);
      
      // API 응답 형식에 맞게 데이터 매핑
      events.value = response.data.map(event => {
        // 기본 이벤트 객체 생성
        const mappedEvent = {
          id: event.event_id, // event_id를 id로 매핑
          title: event.title,
          description: event.description,
          event_day: event.event_day,
          // start: event.event_day, // event_day를 start로 매핑
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
          display: 'block',
          pregnancy: event.pregnancy,
          event_type: event.event_type,
          recurring: event.is_recurring ? event.recurrence_pattern : 'none',
          created_at: event.created_at,
          updated_at: event.updated_at
        };
        
        // 시작 시간 정보가 있으면 start에 통합
        if (event.start_time) {
          mappedEvent.start = `${event.event_day}T${event.start_time}`;
        }
        
        // 종료 시간 정보가 있으면 추가 
        if (event.end_time) {
          mappedEvent.end = `${event.event_day}T${event.end_time}`;
        }
        
        // 반복 이벤트면 allDay 속성 추가
        if (event.is_recurring) {
          mappedEvent.allDay = true;
        }
        
        return mappedEvent;
      });
      
      return events.value;
    } catch (err) {
      // 오류 응답 상세 분석
      if (err.response) {
        if (err.response.status === 500) {
          error.value = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (err.response.status === 401) {
          error.value = '로그인이 필요합니다.';
        } else {
          error.value = '일정을 불러오는데 실패했습니다.';
        }
      } else {
        error.value = '일정을 불러오는데 실패했습니다.';
      }
      
      // 오류 시 빈 배열 사용
      events.value = [];
      
      return events.value;
    } finally {
      isLoading.value = false;
    }
  }

  // 특정 날짜의 일정 조회
  async function fetchDayEvents(date) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/?event_day=${date}`);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvents = response.data.map(event => {
        // 기본 이벤트 객체 생성
        const mappedEvent = {
          id: event.event_id,
          title: event.title,
          description: event.description,
          event_day: event.event_day,
          // start: event.event_day,
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
          display: 'block',
          pregnancy: event.pregnancy,
          event_type: event.event_type,
          recurring: event.is_recurring ? event.recurrence_pattern : 'none',
          created_at: event.created_at,
          updated_at: event.updated_at
        };
        
        // 시작 시간 정보가 있으면 start에 통합
        if (event.start_time) {
          mappedEvent.start = `${event.event_day}T${event.start_time}`;
        }
        
        // 종료 시간 정보가 있으면 추가
        if (event.end_time) {
          mappedEvent.end = `${event.event_day}T${event.end_time}`;
        }
        
        // 반복 이벤트면 allDay 속성 추가
        if (event.is_recurring) {
          mappedEvent.allDay = true;
        }
        
        return mappedEvent;
      });
      
      // 해당 일의 이벤트 반환
      return mappedEvents;
    } catch (err) {
      error.value = '일정을 불러오는데 실패했습니다.';
      
      // 오류 시 빈 배열 반환
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // 특정 이벤트 상세 조회
  async function fetchEventDetail(eventId) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/${eventId}/`);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id,
        title: response.data.title,
        description: response.data.description,
        event_day: response.data.event_day,
        // start: response.data.event_day,
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
        display: 'block',
        pregnancy: response.data.pregnancy,
        event_type: response.data.event_type,
        recurring: response.data.is_recurring ? response.data.recurrence_pattern : 'none',
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };
      
      // 시작 시간 정보가 있으면 start에 통합
      if (response.data.start_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.start_time}`;
      }
      
      // 종료 시간 정보가 있으면 추가
      if (response.data.end_time) {
        mappedEvent.end = `${response.data.event_day}T${response.data.end_time}`;
      }
      
      // 반복 이벤트면 allDay 속성 추가
      if (response.data.is_recurring) {
        mappedEvent.allDay = true;
      }
      
      // 선택된 이벤트 업데이트
      selectedEvent.value = mappedEvent;
      
      return mappedEvent;
    } catch (err) {
      error.value = '이벤트 정보를 불러오는데 실패했습니다.';
      
      // 선택된 이벤트 초기화
      selectedEvent.value = null;
      
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // 일정 추가 함수 (API 연동)
  const addEvent = async (newEvent) => {
    try {
      console.log('일정 추가 시작:', newEvent)
      
      // pregnancy ID 확인 및 제거
      const { pregnancy, ...eventDataWithoutPregnancy } = newEvent
      
      console.log('addEvent에 전달된 데이터:', eventDataWithoutPregnancy);
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = {
        title: eventDataWithoutPregnancy.title
      };
      
      // event_day 필드 결정 (start 필드를 먼저 확인하고, 없으면 event_day 확인)
      if (eventDataWithoutPregnancy.start) {
        // start가 ISO 문자열 형식(YYYY-MM-DDT...)이면 날짜 부분만 추출
        if (typeof eventDataWithoutPregnancy.start === 'string' && eventDataWithoutPregnancy.start.includes('T')) {
          apiPayload.event_day = eventDataWithoutPregnancy.start.split('T')[0];
        } else {
          apiPayload.event_day = normalizeDate(eventDataWithoutPregnancy.start);
        }
      } else if (eventDataWithoutPregnancy.event_day) {
        apiPayload.event_day = normalizeDate(eventDataWithoutPregnancy.event_day);
      } else {
        // 둘 다 없으면 오늘 날짜 사용
        apiPayload.event_day = normalizeDate(new Date());
      }
      
      console.log('변환된 API 페이로드:', apiPayload);
      
      // 설명 필드가 있으면 추가
      if (eventDataWithoutPregnancy.description) {
        apiPayload.description = eventDataWithoutPregnancy.description;
      }
      
      // 시작 시간 정보가 있으면 추가
      if (eventDataWithoutPregnancy.start && typeof eventDataWithoutPregnancy.start === 'string' && eventDataWithoutPregnancy.start.includes('T')) {
        apiPayload.start_time = eventDataWithoutPregnancy.start.split('T')[1];
      }
      
      // 종료 시간 정보가 있으면 추가
      if (eventDataWithoutPregnancy.end && typeof eventDataWithoutPregnancy.end === 'string' && eventDataWithoutPregnancy.end.includes('T')) {
        apiPayload.end_time = eventDataWithoutPregnancy.end.split('T')[1];
      }
      
      // 반복 일정 정보가 있으면 추가
      if (eventDataWithoutPregnancy.recurring && eventDataWithoutPregnancy.recurring !== 'none') {
        apiPayload.is_recurring = true;
        apiPayload.recurrence_pattern = eventDataWithoutPregnancy.recurring;
      }
      
      // 이벤트 타입 정보가 있으면 추가
      if (eventDataWithoutPregnancy.event_type) {
        apiPayload.event_type = eventDataWithoutPregnancy.event_type;
      } else {
        apiPayload.event_type = 'other'; // 기본값
      }
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/events/', apiPayload);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id, // API 응답의 event_id를 id로 매핑
        title: response.data.title,
        start: response.data.event_day + (response.data.event_time ? `T${response.data.event_time}` : ''),
        end: response.data.event_day + (response.data.event_time ? `T${response.data.event_time}` : ''),
        description: response.data.description,
        event_day: response.data.event_day,
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
        display: 'block',
        event_type: response.data.event_type,
        recurring: response.data.is_recurring ? response.data.recurrence_pattern : 'none',
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };
      
      // 시작 시간 정보가 있으면 start에 통합
      if (response.data.start_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.start_time}`;
      }
      
      // 종료 시간 정보가 있으면 추가
      if (response.data.end_time) {
        mappedEvent.end = `${response.data.event_day}T${response.data.end_time}`;
      }
      
      // 반복 이벤트면 allDay 속성 추가
      if (response.data.is_recurring) {
        mappedEvent.allDay = true;
      }
      
      // UI 업데이트를 위해 로컬 상태 추가
      events.value.push(mappedEvent);
      
      return mappedEvent;
    } catch (err) {
      error.value = err.message || '일정 추가에 실패했습니다.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 일정 수정 함수 (API 연동)
  async function updateEvent(updatedEvent) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 임신 ID가 없는 경우 현재 저장된 ID 사용
      if (!updatedEvent.pregnancy && pregnancyId.value) {
        updatedEvent.pregnancy = pregnancyId.value;
      }

      console.log('updateEvent에 전달된 데이터:', updatedEvent);
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = {
        title: updatedEvent.title,
        pregnancy: updatedEvent.pregnancy
      };
      
      // event_day 필드 결정 (start 필드를 먼저 확인하고, 없으면 event_day 확인)
      if (updatedEvent.start) {
        // start가 ISO 문자열 형식(YYYY-MM-DDT...)이면 날짜 부분만 추출
        if (typeof updatedEvent.start === 'string' && updatedEvent.start.includes('T')) {
          apiPayload.event_day = updatedEvent.start.split('T')[0];
        } else {
          apiPayload.event_day = normalizeDate(updatedEvent.start);
        }
      } else if (updatedEvent.event_day) {
        apiPayload.event_day = normalizeDate(updatedEvent.event_day);
      } else {
        // 둘 다 없으면 오늘 날짜 사용
        apiPayload.event_day = normalizeDate(new Date());
      }
      
      console.log('변환된 API 페이로드:', apiPayload);
      
      // 설명 필드가 있으면 추가
      if (updatedEvent.description) {
        apiPayload.description = updatedEvent.description;
      }
      
      // 시작 시간 정보가 있으면 추가
      if (updatedEvent.start && typeof updatedEvent.start === 'string' && updatedEvent.start.includes('T')) {
        apiPayload.start_time = updatedEvent.start.split('T')[1];
      }
      
      // 종료 시간 정보가 있으면 추가
      if (updatedEvent.end && typeof updatedEvent.end === 'string' && updatedEvent.end.includes('T')) {
        apiPayload.end_time = updatedEvent.end.split('T')[1];
      }
      
      // 반복 일정 정보가 있으면 추가
      if (updatedEvent.recurring && updatedEvent.recurring !== 'none') {
        apiPayload.is_recurring = true;
        apiPayload.recurrence_pattern = updatedEvent.recurring;
      }
      
      // 이벤트 타입 정보가 있으면 추가
      if (updatedEvent.event_type) {
        apiPayload.event_type = updatedEvent.event_type;
      }
      
      console.log('API 요청 데이터:', apiPayload)
      
      // API 호출
      const eventId = updatedEvent.id;
      const response = await api.put(`calendars/events/${eventId}/`, apiPayload);
      console.log('API 응답:', response.data)
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id,
        title: response.data.title,
        description: response.data.description,
        event_day: response.data.event_day,
        // start: response.data.event_day,
      backgroundColor: '#FFD600',
      borderColor: '#FFD600',
      textColor: '#353535',
        display: 'block',
        pregnancy: response.data.pregnancy,
        event_type: response.data.event_type,
        recurring: response.data.is_recurring ? response.data.recurrence_pattern : 'none',
        created_at: response.data.created_at,
        updated_at: response.data.updated_at
      };
      
      // 시작 시간 정보가 있으면 start에 통합
      if (response.data.start_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.start_time}`;
      }
      
      // 종료 시간 정보가 있으면 추가
      if (response.data.end_time) {
        mappedEvent.end = `${response.data.event_day}T${response.data.end_time}`;
      }
      
      // 반복 이벤트면 allDay 속성 추가
      if (response.data.is_recurring) {
        mappedEvent.allDay = true;
      }
      
      // UI 업데이트를 위해 로컬 상태 업데이트
      const index = events.value.findIndex(e => e.id === eventId);
    if (index !== -1) {
        events.value[index] = mappedEvent;
      }
      
      return true;
    } catch (err) {
      error.value = '일정 수정에 실패했습니다.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 일정 삭제 함수 (API 연동)
  async function deleteEvent(eventId) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/events/${eventId}/`);
      
      // 로컬 상태에서도 해당 이벤트 제거 (UI 업데이트를 위함)
      const index = events.value.findIndex(e => e.id === eventId);
    if (index !== -1) {
        events.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
      error.value = '일정 삭제에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 반복 일정 삭제 함수 (API 연동)

  // 아기 일기 관련 함수들
  async function fetchBabyDiaries(year, month) {
    try {
      console.log('아기 일기 데이터 가져오기 시작')
      
      // 년도와 월 설정 (파라미터가 없으면 현재 날짜 사용)
      const currentYear = year || currentYear.value || new Date().getFullYear()
      const currentMonth = month || currentMonth.value || new Date().getMonth() + 1
      
      // 월의 시작일과 종료일 계산
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDay = new Date(currentYear, currentMonth, 0).getDate()
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      console.log(`일기 조회 기간: ${startDate} ~ ${endDate}`)
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get('calendars/baby-diaries/', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      })
      
      console.log('아기 일기 데이터 가져오기 성공:', response.data.length, '개')
      
      // 데이터 변환 및 저장 전 로그
      if (response.data.length > 0) {
        console.log('첫 번째 일기 데이터 샘플:', {
          diary_id: response.data[0].diary_id,
          diary_date: response.data[0].diary_date,
          content_preview: response.data[0].content ? response.data[0].content.substring(0, 20) + '...' : '(내용 없음)'
        })
      }
      
      // 데이터 변환 및 저장
      babyDiaries.value = response.data.map(diary => ({
        id: diary.diary_id,
        date: diary.diary_date,
        content: diary.content,
        photos: Array.isArray(diary.photos) 
          ? diary.photos.map(photo => ({
              id: photo.photo_id, // photo_id를 id로 매핑
              image: photo.image,
              created_at: photo.created_at
            }))
          : []
      }))
      
      // 변환 후 데이터 확인 로그
      console.log('변환된 일기 데이터:', babyDiaries.value.map(d => ({ 
        id: d.id, 
        date: d.date, 
        content_length: d.content ? d.content.length : 0,
        photos_count: d.photos.length 
      })))
      
      return babyDiaries.value
    } catch (error) {
      console.error('아기 일기 데이터 가져오기 실패:', error)
      return []
    }
  }

  // 특정 날짜의 아기 일기 조회
  async function fetchBabyDiaryByDate(date) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 날짜 형식 정규화
      const normalizedDate = normalizeDate(date)
      
      // 먼저 로컬 상태에서 해당 날짜의 일기 찾기
      const localDiary = babyDiaries.value.find(diary => diary.date === normalizedDate)
      
      // 로컬에 데이터가 있으면 그대로 사용
      if (localDiary) {
        selectedBabyDiary.value = localDiary
        return localDiary
      }
      
      // 임신 ID 확인
      if (!pregnancyId.value) {
        await initPregnancyInfo()
      }
      
      if (!pregnancyId.value) {
        console.error('임신 정보를 찾을 수 없습니다.')
        return null
      }
      
      try {
        // // API 호출 (GET 메서드로 변경 - 기존 일기를 조회만 함)
        // const response = await api.get(`calendars/baby-diaries/pregnancy/${pregnancyId.value}/${normalizedDate}/`)
        // API 호출
        const response = await api.get(`calendars/baby-diaries/`, {
          params: {
            diary_date: normalizedDate
          }
        })

        // 응답 데이터 변환
        const diaryData = {
          id: response.data.diary_id,
          date: response.data.diary_date,
          content: response.data.content,
          photos: Array.isArray(response.data.photos) 
            ? response.data.photos.map(photo => ({
                id: photo.photo_id,
                image: photo.image,
                created_at: photo.created_at
              }))
            : []
        }
        
        // 선택된 태교일기 업데이트
        selectedBabyDiary.value = diaryData
        
        return diaryData
      } catch (err) {
        // 404 오류는 일기가 없는 경우로 정상적인 상황으로 처리
        if (err.response && err.response.status === 404) {
          console.info(`[태교일기] ${normalizedDate} 날짜에 태교일기가 없습니다. 이는 정상적인 상황입니다.`)
          // 빈 일기 객체 반환 (id가 없음을 나타내기 위해 null이 아닌 빈 객체 사용)
          const emptyDiary = { date: normalizedDate, content: '', photos: [] }
          selectedBabyDiary.value = emptyDiary
          return emptyDiary
        } else {
          console.error('[태교일기] 일기 조회 중 오류 발생:', err)
          selectedBabyDiary.value = null
          return null
        }
      }
    } catch (err) {
      error.value = '태교일기를 불러오는데 실패했습니다.'
      console.error('태교일기 조회 오류:', err)
      selectedBabyDiary.value = null
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  // 태교일기 추가
  async function addBabyDiary(newDiary) {
    try {
      const { date, content } = newDiary
      
      // 날짜 로그 추가
      console.log('태교일기 추가 요청 - 원본 날짜:', date)
      
      // 날짜 정규화 (YYYY-MM-DD 형식)
      const normalizedDate = normalizeDate(date)
      console.log('태교일기 추가 - 정규화된 날짜:', normalizedDate)
      
      // pregnancyId가 없으면 임신 정보를 가져옴
      if (!pregnancyId.value) {
        await initPregnancyInfo()
      }
      
      if (!pregnancyId.value) {
        throw new Error('임신 정보가 존재하지 않습니다. 임신 정보를 먼저 등록해주세요.')
      }
      
      // 페이로드 구성 - 요구사항에 맞게 diary_date만 포함
      const payload = {
        diary_date: normalizedDate
      }
      
      // 서버 호출 - URL에 pregnancyId 포함
      const response = await api.post(`calendars/baby-diaries/pregnancy/${pregnancyId.value}/`, payload)
      
      // 응답에 content 필드가 있으면 그대로 사용, 없으면 사용자 입력 content 사용
      let diaryContent = response.data.content
      
      // 만약 응답에 content가 없거나 비어있고, 사용자가 입력한 content가 있으면
      // 업데이트 API를 사용하여 content 업데이트
      if ((!diaryContent || diaryContent.trim() === '') && content && content.trim() !== '') {
        try {
          // 일기 id로 content 업데이트
          const updateResponse = await api.put(`calendars/baby-diaries/${response.data.diary_id}/diary/`, {
            content: content
          })
          
          // 업데이트된 content 사용
          diaryContent = updateResponse.data.content
        } catch (updateError) {
          console.error('일기 내용 업데이트 실패:', updateError)
        }
      }
      
      // 서버 응답 확인 로그
      console.log('서버 응답 일기 ID:', response.data.diary_id)
      console.log('서버 응답 일기 날짜:', response.data.diary_date)
      
      // 로컬 상태 업데이트
      const newDiaryData = {
        id: response.data.diary_id,
        date: response.data.diary_date,
        content: diaryContent || content || '',  // API 응답 content, 사용자 입력 content 순으로 사용
        photos: response.data.photos || []
      }
      
      // 같은 날짜의 일기가 있는지 확인
      const existingIndex = babyDiaries.value.findIndex(d => d.date === normalizeDate(date))
      
      if (existingIndex !== -1) {
        // 기존 일기 업데이트
        babyDiaries.value[existingIndex] = newDiaryData
      } else {
        // 새 일기 추가
        babyDiaries.value.push(newDiaryData)
      }
      
      return newDiaryData
    } catch (error) {
      console.error('아기 일기 추가 실패:', error)
      throw error
    }
  }
  
  // 태교일기 수정
  async function updateBabyDiary(diaryId, content, ) {
    try {
      // API 호출 - diary_id로 접근
      const response = await api.put(`calendars/baby-diaries/${diaryId}/diary/`, {
        content: content
      })
      
      // 로컬 상태 업데이트
      const index = babyDiaries.value.findIndex(d => d.id === diaryId)
    if (index !== -1) {
        babyDiaries.value[index] = {
          id: response.data.diary_id,
          date: response.data.diary_date,
          content: response.data.content,
          photos: response.data.photos || babyDiaries.value[index].photos || []
        }
      }
      
      // 선택된 태교일기 업데이트
      if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId) {
        selectedBabyDiary.value = {
          ...selectedBabyDiary.value,
          content: response.data.content
        }
      }
      
      return response.data
    } catch (error) {
      console.error('태교일기 수정 실패:', error)
      throw error
    }
  }
  
  // 태교일기 삭제
  async function deleteBabyDiary(diaryId) {
    try {
      // API 호출 - diary_id로 접근
      await api.delete(`calendars/baby-diaries/${diaryId}/diary/`)
      
      // 삭제된 일기 찾기
      const deletedDiary = babyDiaries.value.find(d => d.id === diaryId)
      
      // 로컬 상태 업데이트
      const index = babyDiaries.value.findIndex(d => d.id === diaryId)
    if (index !== -1) {
      babyDiaries.value.splice(index, 1)
      }
      
      // 선택된 태교일기가 삭제된 일기와 같다면 초기화
      if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId) {
        selectedBabyDiary.value = null
      }
      
      return {
        success: true,
        deletedDate: deletedDiary ? deletedDiary.date : null
      }
    } catch (error) {
      console.error('태교일기 삭제 실패:', error)
      throw error
    }
  }
  
  // 태교일기 사진 추가
  async function addBabyDiaryPhoto(diaryId, photoFile) {
    isLoading.value = true
    error.value = null
    
    try {
      console.log(`태교일기 사진 업로드 시작 - diary_id: ${diaryId}, 파일 이름: ${photoFile.name}`)
      console.log(`파일 타입: ${photoFile.type}, 파일 크기: ${photoFile.size} bytes`)

      // FormData 객체 생성 및 파일 추가
      const formData = new FormData()
      formData.append('image', photoFile)
      formData.append('category', 'diary') // 필수 카테고리 필드 추가
      formData.append('diary_id', diaryId) // 일기 ID 추가

      // 디버깅 정보
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`FormData: ${key} = File(${value.name}, ${value.type}, ${value.size} bytes)`)
        } else {
          console.log(`FormData: ${key} = ${value}`)
        }
      }

      // API 호출 설정
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        }
      }

      // API URL 형식 확인
      const apiUrl = `calendars/baby-diaries/${diaryId}/photo/`
      console.log(`API 호출: POST ${apiUrl}`)

      const response = await api.post(apiUrl, formData, config)

      console.log('API 응답:', response.status, response.statusText)
      console.log('API 응답 데이터:', response.data)

      if (!response.data) {
        console.error('API 응답 데이터가 없습니다')
        throw new Error('서버 응답 데이터가 없습니다')
      }

      let newPhotos = []
      if (Array.isArray(response.data)) {
        console.log(`배열 응답 받음, 개수: ${response.data.length}`)
        newPhotos = response.data.map(photo => ({
          id: photo.photo_id,
          image: photo.image,
          image_thumbnail: photo.image_thumbnail || photo.image,
          created_at: photo.created_at
        }))
      } else {
        console.log('단일 객체 응답 받음')
        newPhotos = [{
          id: response.data.photo_id,
          image: response.data.image,
          image_thumbnail: response.data.image_thumbnail || response.data.image,
          created_at: response.data.created_at
        }]
      }

      console.log(`처리된 사진 데이터:`, newPhotos)

      const babyDiary = babyDiaries.value.find(diary => diary.id === diaryId)
      if (babyDiary) {
        // 이미 배열인지 확인하고, 없으면 초기화
        if (!Array.isArray(babyDiary.photos)) {
          babyDiary.photos = []
        }
        babyDiary.photos = [...babyDiary.photos, ...newPhotos]
        console.log(`일기 사진 목록 업데이트 완료, 현재 사진 개수: ${babyDiary.photos.length}`)
        
        if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId) {
          // 선택된 일기도 같은 방식으로 처리
          if (!Array.isArray(selectedBabyDiary.value.photos)) {
            selectedBabyDiary.value.photos = []
          }
          selectedBabyDiary.value.photos = [...selectedBabyDiary.value.photos, ...newPhotos]
          console.log('선택된 일기의 사진 목록도 업데이트 완료')
        }
      } else {
        console.log(`일기 ID ${diaryId}를 찾을 수 없음`)
      }

      console.log('태교일기 사진 업로드 성공')
      return newPhotos
    } catch (err) {
      console.error('태교일기 사진 업로드 오류:', err)
      if (err.response) {
        console.error('오류 상태:', err.response.status)
        console.error('오류 데이터:', err.response.data)
        if (err.response.status === 401) {
          error.value = '인증이 필요합니다. 다시 로그인해주세요.'
        } else if (err.response.status === 403) {
          error.value = '권한이 없습니다.'
        } else if (err.response.status === 500) {
          error.value = '서버 오류가 발생했습니다.'
        } else {
          error.value = `태교일기 사진을 업로드하는 중 오류가 발생했습니다. (${err.response.status})`
        }
      } else {
        error.value = '태교일기 사진을 업로드하는 중 오류가 발생했습니다.'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 태교일기 사진 삭제
  async function deleteBabyDiaryPhoto(diaryId, photoId) {
    try {
      // API 호출
      await api.delete(`calendars/baby-diaries/${diaryId}/photo/${photoId}/`)
      
      // 로컬 상태 업데이트
      const diaryIndex = babyDiaries.value.findIndex(d => d.id === diaryId)
      if (diaryIndex !== -1 && babyDiaries.value[diaryIndex].photos) {
        // 해당 사진 삭제
        const photoIndex = babyDiaries.value[diaryIndex].photos.findIndex(p => p.id === photoId)
        if (photoIndex !== -1) {
          babyDiaries.value[diaryIndex].photos.splice(photoIndex, 1)
        }
      }
      
      // 현재 선택된 일기에서도 사진 삭제
      if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId && selectedBabyDiary.value.photos) {
        const photoIndex = selectedBabyDiary.value.photos.findIndex(p => p.id === photoId)
        if (photoIndex !== -1) {
          selectedBabyDiary.value.photos.splice(photoIndex, 1)
        }
      }
      
      return true
    } catch (error) {
      console.error('태교일기 사진 삭제 실패:', error)
      throw error
    }
  }
  
  // 태교일기 사진 조회
  async function fetchBabyDiaryPhotos(diaryId) {
    isLoading.value = true
    error.value = null
    
    try {
      console.log(`태교일기 사진 불러오기 시작 - diary_id: ${diaryId}`)

      // 변경: 모든 헤더에 토큰 추가
      const config = {
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      }

      console.log(`API 호출: GET calendars/baby-diaries/${diaryId}/photo/`)
      const response = await api.get(`calendars/baby-diaries/${diaryId}/photo/`, config)

      console.log('API 응답:', response.status, response.statusText)
      console.log('API 응답 데이터 개수:', Array.isArray(response.data) ? response.data.length : 'not array')

      const mappedPhotos = Array.isArray(response.data) 
        ? response.data.map(photo => ({
            id: photo.photo_id,
            image: photo.image,
            image_thumbnail: photo.image_thumbnail || photo.image,
            created_at: photo.created_at
          }))
        : []

      console.log(`매핑된 사진 데이터 개수: ${mappedPhotos.length}`)

      const diary = babyDiaries.value.find(d => d.id === diaryId)
      if (diary) {
        diary.photos = mappedPhotos
        console.log(`일기 사진 목록 업데이트 완료, 현재 사진 개수: ${mappedPhotos.length}`)
      }
      
      if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId) {
        selectedBabyDiary.value.photos = mappedPhotos
        console.log('선택된 일기의 사진 목록도 업데이트 완료')
      }

      console.log('태교일기 사진 불러오기 성공')
      return mappedPhotos
    } catch (err) {
      console.error('태교일기 사진 불러오기 오류:', err)
      if (err.response) {
        console.error('오류 상태:', err.response.status)
        console.error('오류 데이터:', err.response.data)
        if (err.response.status === 401) {
          error.value = '인증이 필요합니다. 다시 로그인해주세요.'
        } else if (err.response.status === 403) {
          error.value = '권한이 없습니다.'
        } else if (err.response.status === 500) {
          error.value = '서버 오류가 발생했습니다.'
        } else {
          error.value = `태교일기 사진을 불러오는 중 오류가 발생했습니다. (${err.response.status})`
        }
      } else {
        error.value = '태교일기 사진을 불러오는 중 오류가 발생했습니다.'
      }
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 태교일기 사진 업데이트 (교체)
  async function updateBabyDiaryPhoto(diaryId, photoId, newPhotoFile) {
    isLoading.value = true
    error.value = null
    
    try {
      console.log(`태교일기 사진 업데이트 시작 - diary_id: ${diaryId}, photo_id: ${photoId}`)
      console.log(`파일 타입: ${newPhotoFile.type}, 파일 크기: ${newPhotoFile.size} bytes`)

      const formData = new FormData()
      formData.append('image', newPhotoFile)
      formData.append('category', 'diary') // 필수 카테고리 필드 추가

      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`FormData: ${key} = File(${value.name}, ${value.type}, ${value.size} bytes)`)
        } else {
          console.log(`FormData: ${key} = ${value}`)
        }
      }

      // API 호출 설정
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        }
      }

      // API URL 형식 확인
      const apiUrl = `calendars/baby-diaries/${diaryId}/photo/${photoId}/`
      console.log(`API 호출: PATCH ${apiUrl}`)

      const response = await api.patch(apiUrl, formData, config)

      console.log('API 응답:', response.status, response.statusText)
      console.log('API 응답 데이터:', response.data)

      const updatedPhoto = {
        id: response.data.photo_id || photoId,
        image: response.data.image,
        image_thumbnail: response.data.image_thumbnail || response.data.image,
        created_at: response.data.created_at
      };

      const diary = babyDiaries.value.find(d => d.id === diaryId)
      if (diary && diary.photos) {
        const photoIndex = diary.photos.findIndex(p => p.id === photoId)
        if (photoIndex !== -1) {
          diary.photos[photoIndex] = updatedPhoto
          console.log('일기 사진 업데이트 완료')
        }
      }
      
      if (selectedBabyDiary.value && selectedBabyDiary.value.id === diaryId && selectedBabyDiary.value.photos) {
        const photoIndex = selectedBabyDiary.value.photos.findIndex(p => p.id === photoId)
        if (photoIndex !== -1) {
          selectedBabyDiary.value.photos[photoIndex] = updatedPhoto
          console.log('선택된 일기의 사진도 업데이트 완료')
        }
      }

      console.log('태교일기 사진 업데이트 성공')
      return updatedPhoto
    } catch (err) {
      console.error('태교일기 사진 업데이트 오류:', err)
      if (err.response) {
        console.error('오류 상태:', err.response.status)
        console.error('오류 데이터:', err.response.data)
        if (err.response.status === 401) {
          error.value = '인증이 필요합니다. 다시 로그인해주세요.'
        } else if (err.response.status === 403) {
          error.value = '권한이 없습니다.'
        } else if (err.response.status === 500) {
          error.value = '서버 오류가 발생했습니다.'
        } else {
          error.value = `태교일기 사진을 업데이트하는 중 오류가 발생했습니다. (${err.response.status})`
        }
      } else {
        error.value = '태교일기 사진을 업데이트하는 중 오류가 발생했습니다.'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // LLM 요약 관련 함수들은 서버 API를 통해 처리
  // 로컬 데이터 저장 기능 제거
  async function addLLMSummary(newSummary) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/llm-summaries/', newSummary);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      llmSummaries.value.push(response.data);
      
      return response.data;
    } catch (err) {
      error.value = 'LLM 요약 저장에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteLLMSummary(summaryId) {
    try {
      // API 호출하여 요약 삭제
      await api.delete(`/v1/calendars/conversation-summaries/${summaryId}/`)
      
      // 로컬 상태에서도 삭제
      const index = llmSummaries.value.findIndex(s => s.summary_id === summaryId)
      if (index !== -1) {
        llmSummaries.value.splice(index, 1)
      }
      
      // 선택된 요약 초기화
      setSelectedLLMSummary(null)
      
      return true
    } catch (error) {
      console.error('LLM 요약 삭제 실패:', error)
    return false
    }
  }

  // 월별 LLM 요약 데이터 가져오기
  async function fetchLLMSummaries(year, month) {
    try {
      // 월의 시작일과 종료일 계산
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      const response = await api.get('/calendars/conversation-summaries/', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      })
      
      // 응답 데이터를 저장
      llmSummaries.value = response.data
      return response.data
    } catch (error) {
      console.error('LLM 요약 데이터 가져오기 실패:', error)
      return []
    }
  }

  function setSelectedDate (date) {
    try {
      // null 또는 undefined 검사
      if (date === null || date === undefined) {
        selectedDate.value = null;
        return null;
      }
      
      // 날짜 정규화 (YYYY-MM-DD 형식으로 변환)
      if (typeof date === 'string') {
        // 이미 문자열인 경우 normalizeDate 사용
        selectedDate.value = normalizeDate(date);
      } else if (date instanceof Date) {
        // Date 객체인 경우 normalizeDate 사용
        selectedDate.value = normalizeDate(date);
      } else {
        // 다른 형식인 경우 문자열로 변환 후 normalizeDate 사용
        selectedDate.value = normalizeDate(String(date));
      }
      
      return selectedDate.value;
    } catch (error) {
      // 오류 발생 시 오늘 날짜로 설정
      const today = new Date();
      selectedDate.value = normalizeDate(today)
      return selectedDate.value;
    }
  }

  function setSelectedEvent (event) {
    selectedEvent.value = event
  }

  function setSelectedLLMSummary (summary) {
    selectedLLMSummary.value = summary
  }

  function setSelectedBabyDiary (diary) {
    selectedBabyDiary.value = diary
  }

  function updateCurrentYearMonth (year, month) {
    currentYear.value = year
    currentMonth.value = month
  }

  function setPregnancyInfo (isPregnantStatus, nickname, id = null) {
    console.log('[setPregnancyInfo] 임신 정보 설정:', isPregnantStatus, nickname, id)
    isPregnant.value = isPregnantStatus
    
    // 태명이 비어있는 경우 기본값 사용
    if (!nickname || nickname.trim() === '') {
      console.log('[setPregnancyInfo] 태명이 비어있어 기본값 사용')
      babyNickname.value = '(태명)'
    } else {
    babyNickname.value = nickname
    }
    
    if (id !== null) {
      pregnancyId.value = id
    }
    
    console.log('[setPregnancyInfo] 설정 결과:', isPregnant.value, babyNickname.value, pregnancyId.value)
  }

  function setPregnancyId (id) {
    pregnancyId.value = id
  }

  async function initPregnancyInfo () {
    try {
      console.log('[initPregnancyInfo] 임신 정보 초기화 시작')
      
      // 초기화 전에 기존 태명 정보 임시 저장
      const prevBabyNickname = babyNickname.value
      
      // 모든 태명 관련 값 초기화
      babyNickname.value = null
      
      // 이미 임신 ID가 있으면 재사용
      if (pregnancyId.value) {
        console.log('[initPregnancyInfo] 이미 스토어에 임신 ID 있음:', pregnancyId.value)
        console.log('[initPregnancyInfo] 현재 태명:', babyNickname.value)
        
        // 기존 ID가 있다면 서버에서 최신 정보 가져오기
        try {
          const detailResponse = await api.get(`/accounts/pregnancies/${pregnancyId.value}/`)
          if (detailResponse.data) {
            updatePregnancyInfo(detailResponse.data)
          }
    } catch (err) {
          console.error('[initPregnancyInfo] 기존 임신 ID로 정보 조회 실패:', err)
          // 에러 발생 시 임신 ID 초기화
          pregnancyId.value = null
        }
        
        return true
      }
      
      // 스토리지에 저장된 임신 ID
      const storedPregnancyId = localStorage.getItem('pregnancyId') || sessionStorage.getItem('pregnancyId')
      
      // 스토리지에 임신 ID가 있는 경우
      if (storedPregnancyId) {
        try {
          // 임신 ID로 상세 정보 조회
          console.log('[initPregnancyInfo] 저장된 임신 ID로 상세 정보 조회 시도:', storedPregnancyId)
          const detailResponse = await api.get(`/accounts/pregnancies/${storedPregnancyId}/`)
          
          if (detailResponse.data) {
            // 서버에서 가져온 임신 정보로 업데이트
            updatePregnancyInfo(detailResponse.data)
            return true
          }
        } catch (detailErr) {
          // 저장된 ID가 유효하지 않은 경우, 스토리지에서 제거
          console.error('[initPregnancyInfo] 임신 상세 정보 조회 실패:', detailErr)
          localStorage.removeItem('pregnancyId')
          sessionStorage.removeItem('pregnancyId')
        }
      }
      
      // 임신 정보 API 호출
      console.log('[initPregnancyInfo] 임신 정보 목록 API 호출 시도')
      const response = await api.get('/accounts/pregnancies/')
      console.log('[initPregnancyInfo] 임신 정보 API 응답:', response.data)
      
      if (response.data && response.data.length > 0) {
        // 서버에서 가져온 임신 정보로 업데이트
        updatePregnancyInfo(response.data[0])
      return true
      } else {
        console.log('[initPregnancyInfo] 임신 정보 없음')
        // 임신 정보가 없는 경우 초기화
        isPregnant.value = false
        babyNickname.value = null
        pregnancyId.value = null
        
        // 태명 관련 스토리지 정보 삭제
        localStorage.removeItem('babyNickname')
        sessionStorage.removeItem('babyNickname')
        
        return false
      }
    } catch (err) {
      console.error('[initPregnancyInfo] 임신 정보 초기화 오류:', err)
      return false
    }
  }
  
  // 서버에서 가져온 임신 정보로 상태 업데이트하는 헬퍼 함수
  function updatePregnancyInfo(pregnancyData) {
    if (!pregnancyData) return
    
    // 임신 관련 정보 설정
    isPregnant.value = true
    
    console.log('[updatePregnancyInfo] 임신 상세 정보:', pregnancyData)
    
    // 태명 찾기 (여러 필드 순서대로 확인)
    if (pregnancyData.baby_name) {
      babyNickname.value = pregnancyData.baby_name
      console.log('[updatePregnancyInfo] 태명 설정 (baby_name):', babyNickname.value)
    } else if (pregnancyData.baby_nickname) {
      babyNickname.value = pregnancyData.baby_nickname
      console.log('[updatePregnancyInfo] 태명 설정 (baby_nickname):', babyNickname.value)
    } else if (pregnancyData.nickname) {
      babyNickname.value = pregnancyData.nickname
      console.log('[updatePregnancyInfo] 태명 설정 (nickname):', babyNickname.value)
    } else {
      console.log('[updatePregnancyInfo] 태명 없음, 사용자가 직접 설정해야 함')
      babyNickname.value = null
    }
    
    // 태명이 있다면 스토리지에 저장
    if (babyNickname.value) {
      const rememberMe = localStorage.getItem('rememberMe') === 'true'
      if (rememberMe) {
        localStorage.setItem('babyNickname', babyNickname.value)
      } else {
        sessionStorage.setItem('babyNickname', babyNickname.value)
      }
    }
    
    // 임신 ID 설정 (id와 pregnancy_id 필드 모두 확인)
    if (pregnancyData.id) {
      pregnancyId.value = pregnancyData.id
      console.log('[updatePregnancyInfo] 임신 ID 설정 (id):', pregnancyId.value)
    } else if (pregnancyData.pregnancy_id) {
      pregnancyId.value = pregnancyData.pregnancy_id
      console.log('[updatePregnancyInfo] 임신 ID 설정 (pregnancy_id):', pregnancyId.value)
    }
    
    // 자동 로그인 여부에 따라 적절한 스토리지에 저장
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    if (rememberMe) {
      localStorage.setItem('pregnancyId', pregnancyId.value)
      localStorage.setItem('isPregnant', 'true')
    } else {
      sessionStorage.setItem('pregnancyId', pregnancyId.value)
      sessionStorage.setItem('isPregnant', 'true')
    }
  }

  // 받침 유무에 따라 적절한 조사 선택 함수
  function getJosa (word, josa1, josa2) {
    // word가 없거나 빈 문자열인 경우 기본값 반환
    if (!word || typeof word !== 'string' || word.trim() === '') {
      console.log('[getJosa] 단어가 없어 기본 조사 사용:', josa1)
      return josa1
    }

    const charCode = word.charCodeAt(word.length - 1)
    if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
      // 한글인 경우 받침 유무에 따라 조사 선택
      const hasJongseong = (charCode - 0xAC00) % 28 > 0
      console.log('[getJosa] 한글 단어:', word, '받침 있음:', hasJongseong, '선택된 조사:', hasJongseong ? josa1 : josa2)
      return hasJongseong ? josa1 : josa2
    }
    // 한글이 아닌 경우 기본값 반환
    console.log('[getJosa] 한글이 아닌 단어:', word, '기본 조사 사용:', josa1)
    return josa1
  }

  // 게터 (getters)
  const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) {
      return []
    }

    try {
      const filteredEvents = events.value.filter(event => {
        // event나 event.event_day가 없는 경우 필터링에서 제외
        if (!event || !event.event_day) {
          return false
        }
        
        try {
          // 선택된 날짜 문자열 정규화 (YYYY-MM-DD 형식)
          const normalizedSelectedDate = normalizeDate(selectedDate.value)
          
          // event.event_day가 문자열이고 T를 포함하는 경우 (ISO 형식)
          if (typeof event.event_day === 'string' && event.start.includes('T')) {
            const eventStartDate = event.start.split('T')[0]
            return eventStartDate === normalizedSelectedDate
          }
          
          // event.event_day가 일반 날짜 문자열인 경우
          if (typeof event.event_day === 'string') {
            const normalizedEventDate = normalizeDate(event.event_day)
            return normalizedEventDate === normalizedSelectedDate
          }
          
          // 그 외의 경우, 이벤트 날짜를 정규화하여 비교
          return normalizeDate(event.event_day) === normalizedSelectedDate
        } catch (error) {
          return false
        }
      })
      
      return filteredEvents
    } catch (error) {
      return []
    }
  })

  const llmSummaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null

    // 날짜 형식 정규화 (YYYY-MM-DD)
    const formattedDate = normalizeDate(selectedDate.value)
    return llmSummaries.value.find(summary => summary.summary_date === formattedDate)
  })

  const babyDiaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    const formattedDate = normalizeDate(selectedDate.value)
    return babyDiaries.value.find(diary => diary.date === formattedDate)
  })

  const hasLLMSummary = (dateStr) => {
    // 날짜 문자열 정규화 (YYYY-MM-DD 형식으로)
    const formattedDate = normalizeDate(dateStr)
    return llmSummaries.value.some(summary => summary.summary_date === formattedDate)
  }

  /**
   * 특정 날짜에 태교일기가 존재하는지 확인
   * @param {string} dateStr YYYY-MM-DD 형식의 날짜 문자열
   * @returns {boolean} 태교일기 존재 여부
   */
  const hasBabyDiary = (dateStr) => {
    // 날짜 정규화
    const formattedDate = normalizeDate(dateStr)
    
    // babyDiaries 배열에서 해당 날짜의 일기가 있는지 확인
    return babyDiaries.value.some(diary => diary.date === formattedDate && diary.id)
  }

  // 스토어 초기화 함수
  function $reset() {
    events.value = []
    llmSummaries.value = []
    babyDiaries.value = []
    selectedDate.value = null
    selectedEvent.value = null
    selectedLLMSummary.value = null
    selectedBabyDiary.value = null
    isPregnant.value = false
    babyNickname.value = ''
    pregnancyId.value = null
    error.value = null
  }

  /**
   * 반복 일정 중 이 일정만 삭제
   * @param {string} eventId - 삭제할 이벤트 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async function deleteRecurringEventThisOnly(eventId) {
    try {
      console.log('이 일정만 삭제 API 호출:', eventId)
      const response = await api.delete(`/calendars/events/${eventId}/delete_recurring/`, {
        headers: getAuthHeaders(),
        params: {
          delete_type: 'this_only'
        }
      })
      
      if (response.status === 204 || response.status === 200) {
        console.log('이 일정만 삭제 성공')
        
        // 캐시에서 삭제된 이벤트 제거
        const index = events.value.findIndex(e => e.id === eventId)
        if (index !== -1) {
          events.value.splice(index, 1)
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('이 일정만 삭제 실패:', error)
      throw error
    }
  }

  /**
   * 반복 일정 중 이 일정과 이후 모든 일정 삭제
   * @param {string} eventId - 삭제 시작점이 되는 이벤트 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async function deleteRecurringEventsThisAndFuture(eventId) {
    try {
      console.log('이 일정과 이후 모든 일정 삭제 API 호출:', eventId)
      const response = await api.delete(`/calendars/events/${eventId}/delete_recurring/`, {
        headers: getAuthHeaders(),
        params: {
          delete_type: 'this_and_future'
        }
      })
      
      if (response.status === 204 || response.status === 200) {
        console.log('이 일정과 이후 모든 일정 삭제 성공')
        
        // 캐시에서 삭제된 이벤트와 관련된 이벤트들 제거
        const deleted = events.value.find(e => e.id === eventId)
        if (deleted) {
          const recurringId = deleted.recurringEventId || deleted.id
          // 재귀적으로 연결된 모든 이벤트 찾기
          const toRemove = events.value.filter(e => 
            e.id === eventId || 
            e.recurringEventId === recurringId || 
            e.parentId === recurringId
          )
          for (const item of toRemove) {
            const idx = events.value.findIndex(e => e.id === item.id)
            if (idx !== -1) {
              events.value.splice(idx, 1)
            }
          }
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('이 일정과 이후 모든 일정 삭제 실패:', error)
      throw error
    }
  }

  /**
   * 모든 반복 일정 삭제
   * @param {string} eventId - 반복 일정 중 하나의 이벤트 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async function deleteRecurringEventsAll(eventId) {
    try {
      console.log('모든 반복 일정 삭제 API 호출:', eventId)
      const response = await api.delete(`/calendars/events/${eventId}/delete_recurring/`, {
        headers: getAuthHeaders(),
        params: {
          delete_type: 'all'
        }
      })
      
      if (response.status === 204 || response.status === 200) {
        console.log('모든 반복 일정 삭제 성공')
        
        // 캐시에서 삭제된 이벤트와 관련된 모든 이벤트 제거
        const deleted = events.value.find(e => e.id === eventId)
        if (deleted) {
          const recurringId = deleted.recurringEventId || deleted.id
          // 같은 반복 일정에 속한 모든 이벤트 찾기
          const toRemove = events.value.filter(e => 
            e.id === eventId || 
            e.recurringEventId === recurringId || 
            e.parentId === recurringId ||
            e.id === recurringId
          )
          for (const item of toRemove) {
            const idx = events.value.findIndex(e => e.id === item.id)
            if (idx !== -1) {
              events.value.splice(idx, 1)
            }
          }
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('모든 반복 일정 삭제 실패:', error)
      throw error
    }
  }

  /**
   * 반복 일정 중 이 일정만 수정
   * @param {Object} eventData - 수정할 이벤트 데이터
   * @returns {Promise<Object>} 수정된 이벤트 객체
   */
  async function updateRecurringEventThisOnly(eventData) {
    isLoading.value = true;
    error.value = null;
    
    try {
      console.log('이 일정만 수정 API 호출:', eventData.id)
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = prepareEventPayload(eventData);
      
      // API 호출
      const response = await api.put(`calendars/events/${eventData.id}/update_recurring/`, apiPayload, {
        headers: getAuthHeaders(),
        params: {
          update_type: 'this_only'
        }
      });
      
      // 응답 데이터 매핑
      const updatedEvent = mapEventResponse(response.data);
      
      // UI 업데이트를 위해 로컬 상태 업데이트
      const index = events.value.findIndex(e => e.id === eventData.id);
    if (index !== -1) {
        events.value[index] = updatedEvent;
      }
      
      return updatedEvent;
    } catch (err) {
      error.value = '일정 수정에 실패했습니다.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 반복 일정 중 이 일정과 이후 모든 일정 수정
   * @param {Object} eventData - 수정할 이벤트 데이터
   * @returns {Promise<Object>} 수정된 이벤트 객체
   */
  async function updateRecurringEventsThisAndFuture(eventData) {
    isLoading.value = true;
    error.value = null;
    
    try {
      console.log('이 일정과 이후 모든 일정 수정 API 호출:', eventData.id)
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = prepareEventPayload(eventData);
      
      // API 호출
      const response = await api.put(`calendars/events/${eventData.id}/update_recurring/`, apiPayload, {
        headers: getAuthHeaders(),
        params: {
          update_type: 'this_and_future'
        }
      });
      
      // 응답 데이터 매핑
      const updatedEvent = mapEventResponse(response.data);
      
      // UI 업데이트를 위해 로컬 상태 업데이트
      // 여러 일정이 업데이트될 수 있으므로 전체 일정 새로고침이 필요할 수 있음
      await fetchEvents();
      
      return updatedEvent;
    } catch (err) {
      error.value = '일정 수정에 실패했습니다.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 모든 반복 일정 수정
   * @param {Object} eventData - 수정할 이벤트 데이터
   * @returns {Promise<Object>} 수정된 이벤트 객체
   */
  async function updateRecurringEventsAll(eventData) {
    isLoading.value = true;
    error.value = null;
    
    try {
      console.log('모든 반복 일정 수정 API 호출:', eventData.id)
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = prepareEventPayload(eventData);
      
      // API 호출
      const response = await api.put(`calendars/events/${eventData.id}/update_recurring/`, apiPayload, {
        headers: getAuthHeaders(),
        params: {
          update_type: 'all'
        }
      });
      
      // 응답 데이터 매핑
      const updatedEvent = mapEventResponse(response.data);
      
      // UI 업데이트를 위해 로컬 상태 업데이트
      // 모든 반복 일정이 업데이트되므로 전체 일정 새로고침
      await fetchEvents();
      
      return updatedEvent;
    } catch (err) {
      error.value = '일정 수정에 실패했습니다.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 회원 탈퇴
  const deleteAccount = async () => {
    try {
      // 1. 회원 탈퇴 API 호출
      const response = await api.delete('/v1/accounts/users/me/delete-account/')
      console.log('회원 탈퇴 성공:', response.data)

      // 2. 로컬 상태 초기화
      $reset()

      // 3. 로컬/세션 스토리지 초기화
      localStorage.clear()
      sessionStorage.clear()

      return response.data
    } catch (error) {
      console.error('회원 탈퇴 실패:', error)
      throw error
    }
  }

  // 출산 예정일 체크 함수
  async function checkDueDate() {
    try {
      const response = await api.get('/accounts/pregnancies/')
      if (response.data && response.data.length > 0) {
        const pregnancy = response.data[0]
        const dueDate = new Date(pregnancy.due_date)
        const today = new Date()
        
        // 출산 예정일 다음날인지 확인
        const isAfterDue = today > dueDate
        isAfterDueDate.value = isAfterDue
        
        return isAfterDue
      }
      return false
    } catch (error) {
      console.error('출산 예정일 확인 실패:', error)
      return false
    }
  }

  return {
    // 상태
    events,
    llmSummaries,
    babyDiaries,
    currentYear,
    currentMonth,
    selectedDate,
    selectedEvent,
    selectedLLMSummary,
    selectedBabyDiary,
    isPregnant,
    babyNickname,
    pregnancyId,
    isLoading,
    error,
    isAfterDueDate,

    // 액션
    fetchEvents,
    fetchDayEvents,
    fetchEventDetail,
    addEvent,
    updateEvent,
    deleteEvent,
    fetchBabyDiaries,
    fetchBabyDiaryByDate,
    addBabyDiary,
    updateBabyDiary,
    deleteBabyDiary,
    addBabyDiaryPhoto,
    deleteBabyDiaryPhoto,
    fetchBabyDiaryPhotos,
    updateBabyDiaryPhoto,
    setSelectedDate,
    setSelectedEvent,
    setSelectedLLMSummary,
    setSelectedBabyDiary,
    updateCurrentYearMonth,
    setPregnancyInfo,
    setPregnancyId,
    initPregnancyInfo,
    getJosa,
    deleteRecurringEventsThisAndFuture,
    deleteRecurringEventThisOnly,
    deleteRecurringEventsAll,
    $reset,
    fetchLLMSummaries,
    deleteLLMSummary,
    updateRecurringEventThisOnly,
    updateRecurringEventsThisAndFuture,
    updateRecurringEventsAll,
    deleteAccount,
    checkDueDate,

    // 게터
    eventsForSelectedDate,
    llmSummaryForSelectedDate,
    babyDiaryForSelectedDate,
    hasLLMSummary,
    hasBabyDiary
  }
})
