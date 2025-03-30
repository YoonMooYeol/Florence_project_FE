# 🌙 누리달: AI 기반 산전 관리 시스템 

![누리달](https://github.com/YoonMooYeol/Florence_project/blob/main/config/source/%EB%88%84%EB%88%84%EB%A6%AC%EB%A6%AC%EB%8B%AC%EB%8B%AC.gif?raw=true)

[➡️ 누리달 홈페이지 바로가기](https://www.nooridal.com/)

---

## 💁🏻‍♀️ 프로젝트 소개

## 🌙 누리달: AI 기반 산전 관리 시스템

## 프로젝트 개요

>대한민국의 일부 지역, 특히 **서울 이외의 소도시에서는 산부인과 의료 접근성이 낮아** 임산부들이 적절한 산전 및 산후 관리를 받기 어려운 현실입니다.  
또한, **미성년 임산부들은 사회적 편견과 경제적 어려움**으로 인해 필요한 의료 지원과 상담을 충분히 받지 못하고 있습니다.

>누리달은 이러한 문제를 해결하고자 **AI 기반 산전 관리 시스템**을 개발하여,  
**의료 정보 제공, 맞춤 건강 관리, 정부 지원 정책 안내**를 통해 **임산부와 신생아의 건강을 증진**하는 것을 목표로 합니다.

## 주요 목표

>1. **의료 접근성 향상**
>
> - AI 에이전트를 활용한 **철저하게 검증된 맞춤형 의료 정보 제공**
> - 신뢰할 수 있는 건강 관리 정보로 **임산부의 모성 건강 증진**

>2. **정부 지원 정책 제공**
>
>- **임산부를 위한 지원 정책**을 쉽고 간편하게 검색
>   - 거주 지역 기반으로 **맞춤형 정책 정보 추천**

>3. **개인 맞춤 건강 관리**
>
>- **AI 분석을 통한 임산부 개개인의 건강 상태 관리**
>- 정기적인 건강 체크 및 **맞춤형 케어 솔루션 제공**
<br>

## 기대 효과

<br>

### "누리달은 단순한 AI 기반 시스템이 아닌, **대한민국에서 태어나는 소중한 생명**을 지키고자 합니다."

<br>

---

## 🔗 GitHub Link

BackEnd Github 링크 [ [Nooridal-BackEnd](https://github.com/YoonMooYeol/Florence_project.git) ]  

---

## 🕹️ 기술 스택
- **Vue.js 3**
    : 반응형 UI를 구축하는 데 유리한 프레임워크로, 컴포넌트 기반 개발을 지원하여 코드의 재사용성과 유지보수성을 높입니다.
- **Vite**
    : 빠른 빌드 및 Hot Module Replacement(HMR) 기능을 제공하여 개발 중 실시간으로 변경 사항을 반영할 수 있어 개발 효율성을 크게 향상시킵니다. 특히, Vue.js와의 호환성이 뛰어나 빠른 개발 속도를 지원합니다.
- **Pinia**
    :  Vue 3에 최적화된 상태 관리 라이브러리로, 직관적인 API와 뛰어난 TypeScript 통합을 제공하여 상태 관리의 효율성을 높입니다.
- **Axios**
    : HTTP 요청을 쉽게 처리할 수 있는 라이브러리로, Promise 기반의 비동기 처리와 직관적인 API를 제공해 서버와의 데이터 통신을 간편하게 합니다.
- **Tailwind CSS**
    : 유틸리티-first CSS 프레임워크로, 클래스를 조합해 빠르고 효율적으로 스타일링할 수 있으며, 커스터마이징이 용이해 유지보수성이 뛰어납니다.
- **FullCalendar**
    : JavaScript 기반의 달력 라이브러리로, 이벤트 관리와 일정 표시를 직관적으로 구현할 수 있으며, 다양한 뷰와 커스터마이징 옵션을 제공합니다.
- **Vercel**
    : 프론트엔드 프로젝트를 손쉽게 배포할 수 있는 클라우드 플랫폼으로, Git 연동 및 자동 배포를 지원합니다.



------
## 📱 주요 기능

 **1. 로그인**  : 소셜 로그인, ID/PW 찾기

 **2. 회원가입** 
    : 이메일 인증

 **3. 캘린더 페이지(메인)** 
    :일정 등록, llm 요약, 태교일기

 **4. 채팅 페이지** 
    : LLM, AI 에이전트

**5. 마이 페이지** 
    : 개인 정보 관리, 임신 정보 관리 

**6. 검색 페이지** 
    : 검색, 팔로잉, 팔로워 기능

------
## 📲 시작하기

### (1) 필수 조건
- Node.js (v16 이상)
- npm install

### (2) 설치
```bash
# 프로젝트 클론
git clone https://github.com/YoonMooYeol/Florence_project_FE.git
```

### (3) 환경 변수 설정

- `.env.example` 파일의 내용을 `.env` 파일을 생성 후 복사
- `.env` 파일의 환경 변수 값을 수정

### (4) 로컬 실행 방법
```bash
npm run dev -- --host
```


### (5) 개발 서버 실행
```bash
npm run dev
```
------
## 🖥️ 프로젝트 구조

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

<br><br>

---
## 🌊 Process Flow

<br>

### 1️⃣ 전체 플로우

![](./images/전체플로우.png)

<br><br>

---
### 2️⃣ AI agent 플로우

![](./images/AIAgent플로우.png)

<br><br>

---
## 🦾 Service Architecture

![](./images/서비스아키텍쳐.png)

<br><br>

------
## 🌈 스타일 가이드

프로젝트는 Tailwind CSS를 사용하며, 다음과 같은 커스텀 색상을 정의합니다:
- `base-yellow`: #FFED90
- `ivory`: #FFFAE0
- `dark-gray`: #353535
- `point-yellow`: #FFD600

------
##  🤝 역할 분담 및 협업 방식

### (1) **Detail Role**

| 이름   | 포지션   | 담당(개인별 기여점)                                                                                                            | Github 링크                       |
|--------|:----------:|-----------------------------------------------------------------------------------------------------------------------------|:-----------------------------------:|
| 윤무열 | 리더 | **풀스택, 배포(EBS+DockerCompose)**/ **기술 구현 목록**: AI 에이전트 초기 버전 구현 및 고도화, AI 챗봇 UI/UX 개발, 팔로우 및 사용자 인터랙션 기능, SSE 기반 실시간 응답 처리| [[Github](https://github.com/YoonMooYeol)] |
| 한세희 | 부리더  | **백엔드, AI agent**/ **기술 구현 목록**:  일정 및 사용자 정보 관련 API 구현, AI 에이전트 ORM 연결 및 고도화, 일일 대화 요약 및 임신 주차 스케줄러 | [[Github](https://github.com/hanmind)]    |
| 장지윤 | 팀원 | **프론트엔드, Figma 화면 디자인**/ **기술 구현 목록**: 프론트 화면 구현, API 연결, 디테일 기능 생성(화면, 모달, 탭), 임신 주차 계산, 스케줄 반복 도입, 온보딩 구현 |[[Github](https://github.com/jyun5928)]     |
| 최정은 | 팀원| **백엔드, SA문서 관리**/ **기술 구현 목록**: 이메일 인증 이용한 ID/PW 찾기, 이메일 인증(SMTP 설정), 비밀번호 재설정, 이메일 찾은 후 마스킹, 사진 기능 | [[Github](https://github.com/ouxrlo)]    |


### (2) **Ground Rule**

📍 **프로토 타입 제작** 
: 원하는 기능이 있다면 기능 추가 전 프로토타입을 제작하고, 튜터 및 팀원들과 사용성과 필요성을 검토한 후 도입 여부 결정하기  

📍 **빠르고 적극적인 피드백** 
: 개발 진행 중 발생하는 문제나 아이디어에 대해 빠르게 공유하고, 즉각적인 피드백을 주고받아 개선점을 빠르게 반영하기 

📍 **정기적인 회의**  
: 회의 시간을 정해서 (아침, 저녁) 아침에는 할 일에 대해 논의하고 저녁에는 체크하는 시간 갖기

📍 **원활한 일정 관리** 
: 각자 주요 역할과 업무를 정하고, 팀원들과 주간 혹은 격주 단위로 진행 상황을 점검하며 유연하게 일정 조정하며 업무 효율을 극대화 하기 

📍 **문서화 작업**
: SA문서를 하루 단위로 만들어서 버전 관리

📍 **버전 관리 시스템 활용**
: Git을 활용해 각자 브랜치를 생성해 코드 버전을 관리하고, 협업 시 충돌을 방지하기

📍 **모든 구성원의 의견을 존중하고 꼭 말 이쁘게 하기**

 ------
 ## 🥒 성과 및 회고 

 ### (1) 잘된 점
 - **사용자 정보와 연계된 맞춤형 AI 에이전트 `플로렌스` 구축**
    - 태명, 임신 주차, 고위험 임신 여부 및 사용자 컨디션 등 다양한 정보를 바탕으로 사용자 개개인에게 최적화된 정보를 제공할 수 있도록 함
    - 대화 중 사용자가 추가하고 싶은 일정이 있을 경우 에이전트가 자동으로 일정을 등록할 수 있게 하여 사용자 편의성 향상
    - 감성적이고 공감 능력이 뛰어난 에이전트를 구현하여 사용자가 정서적 지원을 받을 수 있도록 설계

- **에이전트** - 캘린더 연동 서비스 구현
    - 사용자가 에이전트와 대화한 내용을 자동 요약하여 일별로 정리함으로써, 임신 과정의 중요한 순간들을 체계적으로 관리할 수 있게 함
    - 이를 통해 캘린더 탭에서 에이전트 대화, 태교 일기, 일정 관리 등 핵심 기능에 대한 통합적인 관리가 가능해짐

---

## 아쉬운 점

### 에이전트 정보 제공 한계

- 현재 정부나, 지자체에서 정리중인 산부인과는 운영을 안하거나, 전화를 안받는 경우가 많았음.(정보가 매우 부정확함))
- 거주 지역을 기준으로 주변의 분만실 보유 산부인과 혹은 난임전문병원을 추천하고자 했으나, AI 에이전트가 최신 정보를 제대로 반영하지 못함

### 달력 UX 완성도 개선 필요

- 반복 일정을 화면에 렌더링하는 과정에서 약간의 시간 지연 발생
- Fullcalender는 장기일정에 대해 마지막날을 exclusice함.
- 일정 표시와 관련된 UI 개선 필요

### 알림 시스템 미구현

- 주요 일정에 대한 푸시 알림 기능을 개발 일정 내에 구현하지 못함

<br><br>
---

## 향후 계획

### 정확한 최신 정보 제공 체계 구축

- 의료 전문가 검수 시스템을 도입하여 건강 정보의 신뢰성 향상
- 정부 기관과 협업하여 정책 및 병원 정보를 제공하는 시스템 구축
- 네이버맵/카카오맵 등의 국내 지도 API를 활용하여 에이전트가 병원 관련 최신 데이터를 검색할 수 있도록 개선

### 추가 기능 구현

- **달력과 채팅의 상호협력관계 UXUI 개선**
  - 달력의 모든 기능을 에이전트가 활용하여 일정관리를 할 수 있도록 함
  - 사용자 설정에 맞춘 일정 자동 등록 ex) 회사일정은 파란색, 개인일정은 노란색 

<br>

- **알림 시스템 구축**
  - 오전, 오후 사용자에게 인사를 건네는 친근한 알림 기능
  - 주요 일정에 대한 리마인더 기능

---

## SA문서 링크

SRS, ERD, Service Flow등을 확인하시려면 [ [누리달 SA문서](https://www.notion.so/teamsparta/SA-1c52dc3ef5148083bf24ed161fc11999) ] 를 참고하세요.

---

## 🫧 문제 해결

문제가 발생할 경우 프로젝트 [관리자](https://github.com/YoonMooYeol) 에게 문의하세요.
