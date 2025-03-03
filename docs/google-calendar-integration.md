# 구글 캘린더 연동 가이드

이 문서는 Florence 프로젝트의 캘린더 기능과 구글 캘린더를 연동하는 방법을 설명합니다.

## 필요 사항

1. Google Cloud Platform 계정
2. Google Calendar API 활성화
3. API 키 및 OAuth 2.0 클라이언트 ID

## 설정 방법

### 1. Google Cloud Platform에서 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 새 프로젝트를 생성합니다.
3. 생성된 프로젝트를 선택합니다.

### 2. Google Calendar API 활성화

1. 왼쪽 메뉴에서 "API 및 서비스" > "라이브러리"를 선택합니다.
2. 검색창에 "Google Calendar API"를 입력하고 검색합니다.
3. Google Calendar API를 선택하고 "사용 설정" 버튼을 클릭합니다.

### 3. API 키 생성

1. 왼쪽 메뉴에서 "API 및 서비스" > "사용자 인증 정보"를 선택합니다.
2. "사용자 인증 정보 만들기" 버튼을 클릭하고 "API 키"를 선택합니다.
3. 생성된 API 키를 복사합니다.
4. (선택 사항) API 키 제한 설정:
   - API 키 이름 지정
   - 애플리케이션 제한 설정 (HTTP 리퍼러 등)
   - API 제한 설정 (Google Calendar API만 허용)

### 4. OAuth 2.0 클라이언트 ID 생성 (사용자 인증 필요 시)

1. "사용자 인증 정보 만들기" 버튼을 클릭하고 "OAuth 클라이언트 ID"를 선택합니다.
2. 애플리케이션 유형으로 "웹 애플리케이션"을 선택합니다.
3. 이름을 입력합니다.
4. 승인된 JavaScript 출처에 애플리케이션 도메인을 추가합니다 (예: `http://localhost:8080`).
5. 승인된 리디렉션 URI에 콜백 URL을 추가합니다 (예: `http://localhost:8080/auth/google/callback`).
6. "만들기" 버튼을 클릭합니다.
7. 생성된 클라이언트 ID와 클라이언트 보안 비밀번호를 복사합니다.

### 5. 환경 변수 설정

1. 프로젝트 루트 디렉토리에 `.env` 파일을 생성합니다 (또는 `.env.example`을 복사하여 `.env`로 저장).
2. 다음 환경 변수를 설정합니다:

```
VUE_APP_GOOGLE_API_KEY=YOUR_API_KEY
VUE_APP_GOOGLE_CALENDAR_ID=primary
```

- `YOUR_API_KEY`: 위에서 생성한 API 키
- `primary`: 기본 구글 캘린더 ID (또는 특정 캘린더 ID)

## 사용 방법

### 기본 사용

환경 변수를 설정하면 캘린더 페이지에서 자동으로 구글 캘린더의 일정을 불러옵니다.

### 사용자 인증 (OAuth)

사용자 인증이 필요한 경우 (일정 추가/수정/삭제 등):

1. 캘린더 페이지에서 "구글 캘린더 연동" 버튼을 클릭합니다.
2. 구글 로그인 페이지로 리디렉션됩니다.
3. 사용자가 로그인하고 권한을 승인하면 앱으로 리디렉션됩니다.
4. 이후 사용자의 구글 캘린더에 일정을 추가/수정/삭제할 수 있습니다.

## 주의 사항

- API 키와 OAuth 클라이언트 정보는 보안에 주의하여 관리해야 합니다.
- 프로덕션 환경에서는 API 키에 적절한 제한을 설정하는 것이 좋습니다.
- 구글 캘린더 API는 할당량 제한이 있으므로 과도한 요청을 피해야 합니다.

## 참고 자료

- [Google Calendar API 문서](https://developers.google.com/calendar)
- [FullCalendar Google Calendar 플러그인 문서](https://fullcalendar.io/docs/google-calendar) 