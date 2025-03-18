import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { normalizeDate, isSameDay } from '@/utils/dateUtils'
import api from '@/utils/axios'

// 캘린더 스토어 정의
export const useCalendarStore = defineStore('calendar', () => {
  // 상태 (state)
  const events = ref([]) // 로컬 스토리지에서 읽지 않고 빈 배열로 초기화

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

  // 액션 (actions)
  async function fetchEvents() {
    isLoading.value = true;
    error.value = null;
    
    console.log('일정 목록 조회 시작');
    
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
      
      console.log(`${startDateStr}부터 ${endDateStr}까지의 일정 조회`);
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/?start_date=${startDateStr}&end_date=${endDateStr}`);
      console.log('일정 조회 성공:', response.data);
      
      // API 응답 형식에 맞게 데이터 매핑
      events.value = response.data.map(event => {
        // 기본 이벤트 객체 생성
        const mappedEvent = {
          id: event.event_id, // event_id를 id로 매핑
          title: event.title,
          description: event.description,
          start: event.event_day, // event_day를 start로 매핑
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
        
        // 시간 정보가 있으면 start에 통합
        if (event.event_time) {
          mappedEvent.start = `${event.event_day}T${event.event_time}`;
        }
        
        // 반복 이벤트면 allDay 속성 추가
        if (event.is_recurring) {
          mappedEvent.allDay = true;
        }
        
        return mappedEvent;
      });
      
      return events.value;
    } catch (err) {
      console.error('일정 조회 중 오류 발생:', err);
      
      // 오류 응답 상세 분석
      if (err.response) {
        console.error('응답 상태 코드:', err.response.status);
        
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
    
    console.log(`${date} 일정 조회 시작`);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/?event_day=${date}`);
      console.log(`${date} 일정 조회 성공:`, response.data);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvents = response.data.map(event => {
        // 기본 이벤트 객체 생성
        const mappedEvent = {
          id: event.event_id,
          title: event.title,
          description: event.description,
          start: event.event_day,
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
        
        // 시간 정보가 있으면 start에 통합
        if (event.event_time) {
          mappedEvent.start = `${event.event_day}T${event.event_time}`;
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
      console.error(`${date} 일정 조회 중 오류 발생:`, err);
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
    
    console.log(`이벤트 상세 조회 시작: ${eventId}`);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/events/${eventId}/`);
      console.log(`이벤트 상세 조회 성공:`, response.data);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id,
        title: response.data.title,
        description: response.data.description,
        start: response.data.event_day,
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
      
      // 시간 정보가 있으면 start에 통합
      if (response.data.event_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.event_time}`;
      }
      
      // 반복 이벤트면 allDay 속성 추가
      if (response.data.is_recurring) {
        mappedEvent.allDay = true;
      }
      
      // 선택된 이벤트 업데이트
      selectedEvent.value = mappedEvent;
      
      return mappedEvent;
    } catch (err) {
      console.error(`이벤트 상세 조회 중 오류 발생:`, err);
      error.value = '이벤트 정보를 불러오는데 실패했습니다.';
      
      // 선택된 이벤트 초기화
      selectedEvent.value = null;
      
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // 일정 추가 함수 (API 연동)
  async function addEvent(newEvent) {
    isLoading.value = true;
    error.value = null;
    
    console.log('캘린더 스토어: 일정 추가 시도', newEvent);
    
    try {
      // 임신 ID가 없는 경우 현재 저장된 ID 사용
      if (!newEvent.pregnancy && pregnancyId.value) {
        newEvent.pregnancy = pregnancyId.value;
        console.log('임신 ID 자동 추가:', pregnancyId.value);
      }
      
      // 임신 ID가 여전히 없는 경우 API로 조회
      if (!newEvent.pregnancy) {
        try {
          console.log('임신 정보 조회 API 호출');
          const pregnancyResponse = await api.get('/accounts/pregnancies/');
          console.log('임신 정보 API 응답:', pregnancyResponse.data);
          
          if (pregnancyResponse.data && pregnancyResponse.data.length > 0) {
            const pregnancyData = pregnancyResponse.data[0];
            // API 응답의 pregnancy_id 필드 확인
            if (pregnancyData.pregnancy_id) {
              newEvent.pregnancy = pregnancyData.pregnancy_id;
              pregnancyId.value = pregnancyData.pregnancy_id;
              console.log('API로부터 임신 ID 설정:', newEvent.pregnancy);
            } else if (pregnancyData.id) {
              newEvent.pregnancy = pregnancyData.id;
              pregnancyId.value = pregnancyData.id;
              console.log('API로부터 임신 ID 설정:', newEvent.pregnancy);
            } else {
              throw new Error('임신 정보에 ID가 없습니다');
            }
          } else {
            throw new Error('임신 정보가 없습니다');
          }
        } catch (pregnancyError) {
          console.error('임신 정보 조회 중 오류:', pregnancyError);
          throw new Error('임신 정보를 찾을 수 없습니다. 임신 정보를 먼저 등록해주세요.');
        }
      }
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = {
        title: newEvent.title,
        event_day: normalizeDate(newEvent.start) || normalizeDate(new Date()),
        pregnancy: newEvent.pregnancy
      };
      
      // 설명 필드가 있으면 추가
      if (newEvent.description) {
        apiPayload.description = newEvent.description;
      }
      
      // 시간 정보가 있으면 추가
      if (newEvent.start && typeof newEvent.start === 'string' && newEvent.start.includes('T')) {
        apiPayload.event_time = newEvent.start.split('T')[1];
      }
      
      // 반복 일정 정보가 있으면 추가
      if (newEvent.recurring && newEvent.recurring !== 'none') {
        apiPayload.is_recurring = true;
        apiPayload.recurrence_pattern = newEvent.recurring;
      }
      
      // 이벤트 타입 정보가 있으면 추가
      if (newEvent.event_type) {
        apiPayload.event_type = newEvent.event_type;
      } else {
        apiPayload.event_type = 'other'; // 기본값
      }
      
      console.log('API 요청 페이로드:', apiPayload);
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/events/', apiPayload);
      console.log('일정 추가 성공:', response.data);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id, // API 응답의 event_id를 id로 매핑
        title: response.data.title,
        description: response.data.description,
        start: response.data.event_day, // event_day를 start로 매핑
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
      
      // 시간 정보가 있으면 start에 통합
      if (response.data.event_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.event_time}`;
      }
      
      // 반복 이벤트면 allDay 속성 추가
      if (response.data.is_recurring) {
        mappedEvent.allDay = true;
      }
      
      // UI 업데이트를 위해 로컬 상태 추가
      events.value.push(mappedEvent);
      
      return mappedEvent;
    } catch (err) {
      console.error('일정 추가 중 오류 발생:', err);
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
    
    console.log('캘린더 스토어: 일정 수정 시도', updatedEvent);
    
    try {
      // 임신 ID가 없는 경우 현재 저장된 ID 사용
      if (!updatedEvent.pregnancy && pregnancyId.value) {
        updatedEvent.pregnancy = pregnancyId.value;
        console.log('임신 ID 자동 추가:', pregnancyId.value);
      }
      
      // API 요청 형식에 맞게 데이터 변환
      const apiPayload = {
        title: updatedEvent.title,
        event_day: normalizeDate(updatedEvent.start) || normalizeDate(new Date()),
        pregnancy: updatedEvent.pregnancy
      };
      
      // 설명 필드가 있으면 추가
      if (updatedEvent.description) {
        apiPayload.description = updatedEvent.description;
      }
      
      // 시간 정보가 있으면 추가
      if (updatedEvent.start && typeof updatedEvent.start === 'string' && updatedEvent.start.includes('T')) {
        apiPayload.event_time = updatedEvent.start.split('T')[1];
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
      
      console.log('API 요청 페이로드:', apiPayload);
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const eventId = updatedEvent.id;
      const response = await api.put(`calendars/events/${eventId}/`, apiPayload);
      console.log('일정 수정 성공:', response.data);
      
      // API 응답 형식에 맞게 데이터 매핑
      const mappedEvent = {
        id: response.data.event_id,
        title: response.data.title,
        description: response.data.description,
        start: response.data.event_day,
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
      
      // 시간 정보가 있으면 start에 통합
      if (response.data.event_time) {
        mappedEvent.start = `${response.data.event_day}T${response.data.event_time}`;
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
      console.error('일정 수정 중 오류 발생:', err);
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
    
    console.log('캘린더 스토어: 일정 삭제 시도', eventId);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/events/${eventId}/`);
      console.log('일정 삭제 성공');
      
      // 로컬 상태에서도 해당 이벤트 제거 (UI 업데이트를 위함)
      const index = events.value.findIndex(e => e.id === eventId);
      if (index !== -1) {
        events.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
      console.error('일정 삭제 중 오류 발생:', err);
      error.value = '일정 삭제에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 반복 일정 삭제 함수 (API 연동)
  async function deleteRecurringEvents(eventId) {
    isLoading.value = true;
    error.value = null;
    
    console.log('캘린더 스토어: 반복 일정 삭제 시도', eventId);
    
    try {
      const baseEvent = events.value.find(e => e.id === eventId);
      
      if (!baseEvent) {
        console.error('기준 이벤트를 찾을 수 없음:', eventId);
        throw new Error('삭제할 일정을 찾을 수 없습니다.');
      }
      
      if (!baseEvent.recurring || baseEvent.recurring === 'none') {
        return await deleteEvent(eventId);
      }
      
      // 백엔드에 반복 일정 삭제 요청
      await api.delete(`calendars/events/${eventId}/?delete_all=true`);
      console.log('반복 일정 삭제 성공');
      
      // 성공 후 fetchEvents 호출하여 최신 데이터로 갱신
      await fetchEvents();
      
      return true;
    } catch (err) {
      console.error('반복 일정 삭제 중 오류 발생:', err);
      error.value = '반복 일정 삭제에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 특정 날짜까지의 반복 일정 유지 함수 (API 연동)
  async function deleteRecurringEventsUntil(eventId, untilDate) {
    isLoading.value = true;
    error.value = null;
    
    console.log('특정 날짜까지 반복 일정 유지 함수 호출:', { eventId, untilDate });
    
    try {
      const baseEvent = events.value.find(e => e.id === eventId);
      
      if (!baseEvent) {
        console.error('기준 이벤트를 찾을 수 없음:', eventId);
        throw new Error('수정할 일정을 찾을 수 없습니다.');
      }
      
      if (!baseEvent.recurring || baseEvent.recurring === 'none') {
        console.log('반복 일정이 아님, 단일 일정 삭제');
        return await deleteEvent(eventId);
      }
      
      // 백엔드에 특정 날짜까지의 반복 일정 삭제 요청
      await api.delete(`calendars/events/${eventId}/?until_date=${untilDate}`);
      console.log('특정 날짜까지 반복 일정 유지 성공');
      
      // 성공 후 fetchEvents 호출하여 최신 데이터로 갱신
      await fetchEvents();
      
      return true;
    } catch (err) {
      console.error('반복 일정 특정 날짜까지 유지 중 오류 발생:', err);
      error.value = '반복 일정 수정에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // 아기 일기 조회 함수 (개선 버전)
  async function fetchBabyDiaries() {
    isLoading.value = true;
    error.value = null;
    
    console.log('태교일기 목록 조회 시작');
    
    try {
      // 현재 년월 기반으로 필터링
      const year = currentYear.value;
      const month = currentMonth.value;
      
      // 월의 시작일과 종료일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // YYYY-MM-DD 형식으로 변환
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`${startDateStr}부터 ${endDateStr}까지의 태교일기 조회`);
      
      // API 호출 시도 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/baby-diaries/?start_date=${startDateStr}&end_date=${endDateStr}`);
      
      console.log('태교일기 조회 성공:', response.data);
      babyDiaries.value = response.data;
      return response.data;
    } catch (err) {
      console.error('태교일기 조회 중 오류 발생:', err);
      
      // 오류 처리
      error.value = '태교일기를 불러오는데 실패했습니다.';
      console.error('태교일기 조회 오류:', err);
      
      // 빈 배열 반환
      babyDiaries.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // 특정 날짜의 아기 일기 조회
  async function fetchBabyDiaryByDate(date) {
    isLoading.value = true;
    error.value = null;
    
    console.log(`${date} 태교일기 조회 시작`);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.get(`calendars/baby-diaries/${date}/`);
      console.log(`${date} 태교일기 조회 성공:`, response.data);
      
      // 선택된 태교일기 업데이트
      selectedBabyDiary.value = response.data;
      
      return response.data;
    } catch (err) {
      console.error(`${date} 태교일기 조회 중 오류 발생:`, err);
      error.value = '태교일기를 불러오는데 실패했습니다.';
      
      if (err.response && err.response.status === 404) {
        console.log('해당 날짜의 태교일기가 없습니다');
        return null;
      } else {
        console.error('태교일기 조회 오류:', err);
        return null;
      }
    } finally {
      isLoading.value = false;
    }
  }
  
  // 태교일기 추가
  async function addBabyDiary(newDiary) {
    isLoading.value = true;
    error.value = null;
    
    console.log('태교일기 추가 시도:', newDiary);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/baby-diaries/', newDiary);
      console.log('태교일기 추가 성공:', response.data);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      babyDiaries.value.push(response.data);
      
      return response.data;
    } catch (err) {
      console.error('태교일기 추가 중 오류 발생:', err);
      
      if (err.response) {
        if (err.response.status === 400) {
          error.value = '입력한 정보가 올바르지 않습니다.';
          if (err.response.data && err.response.data.detail) {
            error.value = err.response.data.detail;
          }
        } else if (err.response.status === 409) {
          error.value = '해당 날짜에 이미 태교일기가 존재합니다.';
        } else {
          error.value = '태교일기 저장에 실패했습니다.';
        }
      } else {
        error.value = '태교일기 저장에 실패했습니다.';
      }
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 태교일기 수정
  async function updateBabyDiary(date, content) {
    isLoading.value = true;
    error.value = null;
    
    console.log(`${date} 태교일기 수정 시도:`, content);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.put(`calendars/baby-diaries/${date}/`, { content });
      console.log('태교일기 수정 성공:', response.data);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = babyDiaries.value.findIndex(d => d.date === date);
      if (index !== -1) {
        babyDiaries.value[index] = response.data;
      }
      
      return response.data;
    } catch (err) {
      console.error('태교일기 수정 중 오류 발생:', err);
      
      if (err.response) {
        if (err.response.status === 400) {
          error.value = '입력한 정보가 올바르지 않습니다.';
          if (err.response.data && err.response.data.detail) {
            error.value = err.response.data.detail;
          }
        } else if (err.response.status === 404) {
          error.value = '수정할 태교일기를 찾을 수 없습니다.';
        } else {
          error.value = '태교일기 수정에 실패했습니다.';
        }
      } else {
        error.value = '태교일기 수정에 실패했습니다.';
      }
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 태교일기 삭제
  async function deleteBabyDiary(date) {
    isLoading.value = true;
    error.value = null;
    
    console.log(`${date} 태교일기 삭제 시도`);
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/baby-diaries/${date}/`);
      console.log('태교일기 삭제 성공');
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = babyDiaries.value.findIndex(d => d.date === date);
      if (index !== -1) {
        babyDiaries.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
      console.error('태교일기 삭제 중 오류 발생:', err);
      
      if (err.response) {
        if (err.response.status === 404) {
          error.value = '삭제할 태교일기를 찾을 수 없습니다.';
        } else {
          error.value = '태교일기 삭제에 실패했습니다.';
        }
      } else {
        error.value = '태교일기 삭제에 실패했습니다.';
      }
      
      throw err;
    } finally {
      isLoading.value = false;
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
      console.log('LLM 요약 추가 성공:', response.data);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      llmSummaries.value.push(response.data);
      
      return response.data;
    } catch (err) {
      console.error('LLM 요약 추가 중 오류 발생:', err);
      error.value = 'LLM 요약 저장에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteLLMSummary(date) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/llm-summaries/${date}/`);
      console.log('LLM 요약 삭제 성공');
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = llmSummaries.value.findIndex(s => s.date === date);
      if (index !== -1) {
        llmSummaries.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
      console.error('LLM 요약 삭제 중 오류 발생:', err);
      error.value = 'LLM 요약 삭제에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function setSelectedDate (date) {
    console.log('calendarStore: 선택된 날짜 설정 시도:', date)
    
    try {
      // null 또는 undefined 검사
      if (date === null || date === undefined) {
        console.log('선택된 날짜가 null/undefined로 설정됨')
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
      
      console.log('선택된 날짜가 성공적으로 설정됨:', selectedDate.value)
      
      // 해당 날짜의 이벤트 개수 미리 계산 (디버깅용)
      try {
        const eventsCount = events.value.filter(e => {
          if (!e || !e.start) return false;
          
          const eventStart = typeof e.start === 'string' && e.start.includes('T') 
            ? e.start.split('T')[0] 
            : normalizeDate(e.start);
            
          return eventStart === selectedDate.value;
        }).length;
        
        console.log(`선택된 날짜(${selectedDate.value})에 ${eventsCount}개의 이벤트가 있습니다.`)
      } catch (countError) {
        console.warn('이벤트 개수 계산 중 오류:', countError)
      }
      
      return selectedDate.value;
    } catch (error) {
      console.error('선택된 날짜 설정 중 오류 발생:', error)
      // 오류 발생 시 오늘 날짜로 설정
      const today = new Date();
      selectedDate.value = normalizeDate(today)
      console.log('오류로 인해 오늘 날짜로 설정됨:', selectedDate.value)
      return selectedDate.value;
    }
  }

  function setSelectedEvent (event) {
    console.log('calendarStore: 선택된 일정 설정:', event)
    selectedEvent.value = event
  }

  function setSelectedLLMSummary (summary) {
    console.log('calendarStore: 선택된 LLM 요약 설정:', summary)
    selectedLLMSummary.value = summary
  }

  function setSelectedBabyDiary (diary) {
    selectedBabyDiary.value = diary
  }

  function updateCurrentYearMonth (year, month) {
    console.log('calendarStore: 현재 년월 업데이트:', year, month)
    currentYear.value = year
    currentMonth.value = month
  }

  function setPregnancyInfo (isPregnantStatus, nickname, id = null) {
    console.log('임신 정보 설정:', isPregnantStatus, nickname, id)
    isPregnant.value = isPregnantStatus
    babyNickname.value = nickname
    if (id !== null) {
      pregnancyId.value = id
    }
  }

  function setPregnancyId (id) {
    console.log('임신 ID 설정:', id)
    pregnancyId.value = id
  }

  async function initPregnancyInfo () {
    try {
      const response = await api.get('/accounts/pregnancies/')
      console.log('임신 정보 조회 응답:', response.data)
      
      if (response.data && response.data.length > 0) {
        const pregnancyData = response.data[0]
        isPregnant.value = true
        if (pregnancyData.nickname) {
          babyNickname.value = pregnancyData.nickname
        }
        if (pregnancyData.id) {
          pregnancyId.value = pregnancyData.id
          console.log('임신 ID 설정됨:', pregnancyId.value)
        }
        return true
      } else {
        console.log('임신 정보가 없습니다.')
        return false
      }
    } catch (err) {
      console.error('임신 정보 초기화 오류:', err)
      return false
    }
  }

  // 받침 유무에 따라 적절한 조사 선택 함수
  function getJosa (word, josa1, josa2) {
    if (!word || word.length === 0) return josa1

    const charCode = word.charCodeAt(word.length - 1)
    if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
      return (charCode - 0xAC00) % 28 > 0 ? josa1 : josa2
    }
    return josa1
  }

  // 게터 (getters)
  const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) {
      console.log('선택된 날짜가 없습니다.')
      return []
    }

    console.log(`${selectedDate.value} 날짜의 이벤트 필터링 시작`, events.value.length)
    
    try {
      const filteredEvents = events.value.filter(event => {
        // event나 event.start가 없는 경우 필터링에서 제외
        if (!event || !event.start) {
          return false
        }
        
        try {
          // 선택된 날짜 문자열 정규화 (YYYY-MM-DD 형식)
          const normalizedSelectedDate = normalizeDate(selectedDate.value)
          
          // event.start가 문자열이고 T를 포함하는 경우 (ISO 형식)
          if (typeof event.start === 'string' && event.start.includes('T')) {
            const eventStartDate = event.start.split('T')[0]
            return eventStartDate === normalizedSelectedDate
          }
          
          // event.start가 일반 날짜 문자열인 경우
          if (typeof event.start === 'string') {
            const normalizedEventDate = normalizeDate(event.start)
            return normalizedEventDate === normalizedSelectedDate
          }
          
          // 그 외의 경우, 이벤트 날짜를 정규화하여 비교
          return normalizeDate(event.start) === normalizedSelectedDate
        } catch (error) {
          console.error('이벤트 필터링 중 오류 발생:', error, event)
          return false
        }
      })
      
      console.log(`${selectedDate.value} 날짜의 이벤트 필터링 결과:`, filteredEvents.length)
      return filteredEvents
    } catch (error) {
      console.error('이벤트 필터링 과정에서 오류 발생:', error)
      return []
    }
  })

  const llmSummaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null

    // 날짜 형식 정규화 (YYYY-MM-DD)
    const formattedDate = normalizeDate(selectedDate.value)
    return llmSummaries.value.find(summary => summary.date === formattedDate)
  })

  const babyDiaryForSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    const formattedDate = normalizeDate(selectedDate.value)
    return babyDiaries.value.find(diary => diary.date === formattedDate)
  })

  const hasLLMSummary = (dateStr) => {
    // 날짜 문자열 정규화 (YYYY-MM-DD 형식으로)
    const formattedDate = normalizeDate(dateStr)
    return llmSummaries.value.some(summary => summary.date === formattedDate)
  }

  const hasBabyDiary = (dateStr) => {
    const formattedDate = normalizeDate(dateStr)
    return babyDiaries.value.some(diary => diary.date === formattedDate)
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
    setSelectedDate,
    setSelectedEvent,
    setSelectedLLMSummary,
    setSelectedBabyDiary,
    updateCurrentYearMonth,
    setPregnancyInfo,
    setPregnancyId,
    initPregnancyInfo,
    getJosa,
    deleteRecurringEvents,
    deleteRecurringEventsUntil,
    $reset,

    // 게터
    eventsForSelectedDate,
    llmSummaryForSelectedDate,
    babyDiaryForSelectedDate,
    hasLLMSummary,
    hasBabyDiary
  }
})
