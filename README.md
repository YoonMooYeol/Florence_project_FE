# Florence Project Frontend

## 프로젝트 소개
Florence는 임산부를 위한 맞춤형 서비스를 제공하는 웹 애플리케이션입니다. Vue 3와 Vite를 기반으로 구축되었으며, 모던하고 사용자 친화적인 인터페이스를 제공합니다.

## 주요 기능
- 로그인
- 회원가입
- 아이디 찾기
- 비밀번호 찾기
- 소셜 로그인 (카카오, 구글, 네이버)
- 임신 캘린더 관리 (일정 등록, llm 요약, 태교일기)
- 채팅 상담
- 사용자 프로필 관리
- 임신 정보 관리
- 팔로잉, 팔로워 기능

## 기술 스택
- Vue 3
- Vite
- Pinia (상태 관리)
- Vue Router
- Axios
- Tailwind CSS
- FullCalendar
- Socket.IO Client

## 시작하기

### 필수 조건
- Node.js (v16 이상)
- npm

### 설치
```bash
# 프로젝트 클론
git clone [repository-url]

# 프로젝트 디렉토리로 이동
cd Florence_project_FE-1

# 의존성 설치
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```

### 린트 검사
```bash
# 린트 검사
npm run lint

# 린트 자동 수정
npm run lint:fix
```

## 환경 설정(.env)
프로젝트는 다음과 같은 환경 변수를 사용합니다:
- `VITE_API_BASE_URL`: 백엔드 API 서버 URL

### 소셜 로그인 설정
#### 카카오 로그인
- `VITE_KAKAO_REST_API_KEY`: 카카오 로그인 API 키
- `VITE_KAKAO_REDIRECT_URI`: 카카오 로그인 리다이렉트 URI

#### 구글 로그인
- `VITE_GOOGLE_CLIENT_ID`: 구글 로그인 클라이언트 ID
- `VITE_GOOGLE_REDIRECT_URI`: 구글 로그인 리다이렉트 URI

#### 네이버 로그인
- `VITE_NAVER_CLIENT_ID`: 네이버 로그인 클라이언트 ID
- `VITE_NAVER_REDIRECT_URI`: 네이버 로그인 리다이렉트 URI

## 프로젝트 구조
```
src/
├── api/          # API 관련 설정
├── assets/       # 정적 리소스
├── components/   # 재사용 가능한 컴포넌트
├── composables/  # Vue 컴포지션 API
├── config/       # 설정 파일
├── router/       # 라우터 설정
├── services/     # 서비스 로직
├── store/        # Pinia 스토어
├── utils/        # 유틸리티 함수
└── views/        # 페이지 컴포넌트
```

## 스타일 가이드
프로젝트는 Tailwind CSS를 사용하며, 다음과 같은 커스텀 색상을 정의합니다:
- `base-yellow`: #FFED90
- `ivory`: #FFFAE0
- `dark-gray`: #353535
- `point-yellow`: #FFD600

## 라이선스
[라이선스 정보 추가]
