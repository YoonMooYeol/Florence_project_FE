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
    
    try {
      // 임신 ID가 없는 경우 현재 저장된 ID 사용
      if (!newEvent.pregnancy && pregnancyId.value) {
        newEvent.pregnancy = pregnancyId.value;
      }
      
      // 임신 ID가 여전히 없는 경우 API로 조회
      if (!newEvent.pregnancy) {
        try {
          const pregnancyResponse = await api.get('/accounts/pregnancies/');
          
          // 임신 정보가 있는 경우 첫 번째 항목의 ID 사용
          if (pregnancyResponse.data && pregnancyResponse.data.length > 0) {
            // 임신 ID와 상태 업데이트
            newEvent.pregnancy = pregnancyResponse.data[0].id;
            setPregnancyInfo(true, pregnancyResponse.data[0].baby_nickname, pregnancyResponse.data[0].id);
          }
        } catch (pregnancyError) {
          // 임신 정보 조회 실패시에도 일정 등록은 계속 진행
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
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/events/', apiPayload);
      
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
      
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const eventId = updatedEvent.id;
      const response = await api.put(`calendars/events/${eventId}/`, apiPayload);
      
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
  async function deleteRecurringEvents(eventId) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const baseEvent = events.value.find(e => e.id === eventId);
      
      if (!baseEvent) {
        throw new Error('삭제할 일정을 찾을 수 없습니다.');
      }
      
      if (!baseEvent.recurring || baseEvent.recurring === 'none') {
        return await deleteEvent(eventId);
      }
      
      // 백엔드에 반복 일정 삭제 요청
      await api.delete(`calendars/events/${eventId}/?delete_all=true`);
      
      // 성공 후 fetchEvents 호출하여 최신 데이터로 갱신
      await fetchEvents();
      
      return true;
    } catch (err) {
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
    
    try {
      const baseEvent = events.value.find(e => e.id === eventId);
      
      if (!baseEvent) {
        throw new Error('수정할 일정을 찾을 수 없습니다.');
      }
      
      if (!baseEvent.recurring || baseEvent.recurring === 'none') {
        return await deleteEvent(eventId);
      }
      
      // 백엔드에 특정 날짜까지의 반복 일정 삭제 요청
      await api.delete(`calendars/events/${eventId}/?until_date=${untilDate}`);
      
      // 성공 후 fetchEvents 호출하여 최신 데이터로 갱신
      await fetchEvents();
      
      return true;
    } catch (err) {
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
    
    try {
      console.log('아기 일기 조회 시작');
      
      // 현재 표시 중인 년월의 시작일과 종료일 계산
      const year = currentYear.value;
      const month = currentMonth.value;
      
      // 월의 시작일과 종료일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 다음 달의 0일 = 현재 달의 마지막 일
      
      // YYYY-MM-DD 형식으로 변환
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`${year}년 ${month}월 아기 일기 데이터 조회 시도 (${startDateStr} ~ ${endDateStr})`);
      
      // 현재 월의 일기만 조회하는 API 호출
      const response = await api.get(`calendars/baby-diaries/?start_date=${startDateStr}&end_date=${endDateStr}`);
      
      console.log('아기 일기 조회 성공:', response.data ? response.data.length : 0, '개');
      babyDiaries.value = response.data || [];
      return response.data;
    } catch (err) {
      console.error('아기 일기 조회 중 오류:', err);
      if (err.response) {
        console.error('서버 응답 상태:', err.response.status);
        if (err.response.data) {
          console.error('서버 응답 데이터:', err.response.data);
        }
      }
      
      error.value = '태교일기를 불러오는데 실패했습니다.';
      
      // 빈 배열 반환
      babyDiaries.value = [];
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // 임신 정보 초기화 함수 개선
  async function initPregnancyInfo () {
    try {
      console.log('임신 정보 초기화 시작');
      const response = await api.get('/accounts/pregnancies/');
      console.log('임신 정보 API 응답:', response);
      
      if (response.data && response.data.length > 0) {
        const pregnancyData = response.data[0];
        console.log('현재 임신 정보:', pregnancyData);
        
        isPregnant.value = true;
        
        // 아기 이름 설정 - nickname 또는 baby_name 필드 사용
        if (pregnancyData.nickname) {
          babyNickname.value = pregnancyData.nickname;
        } else if (pregnancyData.baby_name) {
          babyNickname.value = pregnancyData.baby_name;
        } else {
          babyNickname.value = '아기';
        }
        
        // ID 설정 - id 또는 pregnancy_id 필드 사용
        if (pregnancyData.id) {
          pregnancyId.value = pregnancyData.id;
          console.log('임신 ID 설정 (id 필드):', pregnancyId.value);
        } else if (pregnancyData.pregnancy_id) {
          pregnancyId.value = pregnancyData.pregnancy_id;
          console.log('임신 ID 설정 (pregnancy_id 필드):', pregnancyId.value);
        }
        
        return true;
      } else {
        console.log('임신 정보가 없습니다.');
        isPregnant.value = false;
        babyNickname.value = '아기';
        pregnancyId.value = null;
        
        // 개발 환경에서는 임시 데이터 생성
        if (process.env.NODE_ENV === 'development') {
          console.warn('개발 환경에서 임시 임신 정보 생성');
          isPregnant.value = true;
          babyNickname.value = '개발아기';
          pregnancyId.value = 1;
          return true;
        }
        
        return false;
      }
    } catch (err) {
      console.error('임신 정보 초기화 중 오류:', err);
      
      // 개발 환경에서는 임시 데이터 생성
      if (process.env.NODE_ENV === 'development') {
        console.warn('개발 환경에서 임시 임신 정보 생성');
        isPregnant.value = true;
        babyNickname.value = '개발아기';
        pregnancyId.value = 1;
        return true;
      }
      
      return false;
    }
  }

  // 특정 날짜의 아기 일기 조회
  async function fetchBabyDiaryByDate(date) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 임신 정보가 없으면 먼저 초기화 시도
      if (!pregnancyId.value) {
        console.log('임신 정보가 없어 초기화 시도');
        await initPregnancyInfo();
      }
      
      // 날짜 정규화
      const normalizedDate = normalizeDate(date);
      
      console.log('특정 날짜 일기 데이터 조회 시도:', normalizedDate);
      
      // 우선 이미 캐시된 일기 데이터에서 해당 날짜의 일기를 찾음
      if (babyDiaries.value && babyDiaries.value.length > 0) {
        console.log('캐시된 일기 데이터 확인 (총', babyDiaries.value.length, '개)');
        const foundDiary = babyDiaries.value.find(diary => diary.diary_date === normalizedDate);
        
        if (foundDiary) {
          console.log('캐시에서 일기 데이터 찾음:', foundDiary);
          selectedBabyDiary.value = foundDiary;
          return foundDiary;
        }
        
        console.log('캐시에서 해당 날짜의 일기를 찾을 수 없음, API 호출 시도');
      }
      
      // API로 특정 날짜의 일기를 직접 조회
      try {
        console.log(`API로 ${normalizedDate} 일기 조회 시도`);
        const response = await api.get(`calendars/baby-diaries/?diary_date=${normalizedDate}`);
        
        // 응답 데이터 처리
        if (response.data && response.data.length > 0) {
          const diaryData = response.data[0]; // 첫 번째 항목을 사용
          console.log('API에서 일기 데이터 찾음:', diaryData);
          
          // 캐시 업데이트 (해당 날짜의 일기가 캐시에 없는 경우에만)
          const existingIndex = babyDiaries.value.findIndex(diary => diary.diary_date === normalizedDate);
          if (existingIndex === -1) {
            console.log('캐시에 일기 데이터 추가');
            babyDiaries.value.push(diaryData);
          } else {
            console.log('캐시의 일기 데이터 업데이트');
            babyDiaries.value[existingIndex] = diaryData;
          }
          
          selectedBabyDiary.value = diaryData;
          return diaryData;
        } else {
          console.log('API에서 일기 데이터를 찾을 수 없음');
          selectedBabyDiary.value = null;
          return null;
        }
      } catch (apiError) {
        console.error('특정 날짜 일기 조회 API 오류:', apiError);
        
        // API 오류 발생 시 (서버 500 오류 등) 기존 방식으로 폴백
        console.log('API 오류 발생, 모든 일기 조회 후 클라이언트에서 필터링 시도');
        const allDiariesResponse = await api.get('calendars/baby-diaries/');
        
        // 전체 일기 데이터 캐싱
        babyDiaries.value = allDiariesResponse.data || [];
        console.log('전체 일기 데이터 조회 완료:', babyDiaries.value.length, '개');
        
        // 해당 날짜의 일기 찾기
        const diaryData = babyDiaries.value.find(diary => diary.diary_date === normalizedDate);
        
        if (diaryData) {
          console.log('전체 일기 데이터에서 일기 찾음:', diaryData);
          selectedBabyDiary.value = diaryData;
          return diaryData;
        } else {
          console.log('전체 일기 데이터에서도 해당 날짜 일기를 찾을 수 없음');
          selectedBabyDiary.value = null;
          return null;
        }
      }
    } catch (err) {
      console.error('일기 데이터 조회 중 오류:', err);
      if (err.response) {
        console.error('서버 응답 상태:', err.response.status);
        if (err.response.data) {
          console.error('서버 응답 데이터:', err.response.data);
        }
      }
      
      error.value = '일기 데이터를 불러오는데 실패했습니다.';
      selectedBabyDiary.value = null;
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 태교일기 추가
  async function addBabyDiary(newDiary) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.post('calendars/baby-diaries/', newDiary);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      babyDiaries.value.push(response.data);
      
      return response.data;
    } catch (err) {
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
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      const response = await api.put(`calendars/baby-diaries/${date}/`, { content });
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = babyDiaries.value.findIndex(d => d.date === date);
      if (index !== -1) {
        babyDiaries.value[index] = response.data;
      }
      
      return response.data;
    } catch (err) {
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
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/baby-diaries/${date}/`);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = babyDiaries.value.findIndex(d => d.date === date);
      if (index !== -1) {
        babyDiaries.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
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

  async function deleteLLMSummary(date) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // API 호출 (baseURL에 v1이 포함되어 있음)
      await api.delete(`calendars/llm-summaries/${date}/`);
      
      // 로컬 상태 업데이트 (UI 갱신용)
      const index = llmSummaries.value.findIndex(s => s.date === date);
      if (index !== -1) {
        llmSummaries.value.splice(index, 1);
      }
      
      return true;
    } catch (err) {
      error.value = 'LLM 요약 삭제에 실패했습니다.';
      
      throw err;
    } finally {
      isLoading.value = false;
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
    isPregnant.value = isPregnantStatus
    babyNickname.value = nickname
    if (id !== null) {
      pregnancyId.value = id
    }
  }

  function setPregnancyId (id) {
    pregnancyId.value = id
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

  // 특정 날짜에 일기가 있는지 확인하는 함수
  function hasBabyDiary(date) {
    // 날짜 정규화
    const normalizedDate = normalizeDate(date);
    
    // 일기 데이터가 없거나 빈 배열이면 false 반환
    if (!babyDiaries.value || babyDiaries.value.length === 0) {
      console.log('hasBabyDiary: 일기 데이터가 없음');
      return false;
    }
    
    console.log('hasBabyDiary: 날짜 확인', normalizedDate, '일기 데이터 개수:', babyDiaries.value.length);
    
    // 해당 날짜의 일기가 있는지 확인
    const hasDiary = babyDiaries.value.some(diary => {
      const result = diary.diary_date === normalizedDate;
      if (result) {
        console.log('hasBabyDiary: 일치하는 일기 찾음', diary);
      }
      return result;
    });
    
    return hasDiary;
  }

  // 게터 (getters)
  const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) {
      return []
    }

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
