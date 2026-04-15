# Diary Calendar - 일정 관리 웹앱 기획서

## 1. 프로젝트 개요

일정 관리, 주간 일기, 일별 체크리스트를 하나로 통합한 웹 애플리케이션.
흑백 톤 + 손글씨 폰트의 감성적인 디자인. 한국 공휴일 및 음력 표시 지원.
Capacitor를 통해 iOS 네이티브 앱으로 변환 가능.

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | React 18 + TypeScript |
| **스타일링** | Tailwind CSS 4 |
| **상태관리** | Zustand |
| **데이터 저장** | localStorage (Supabase 전환 예정) |
| **음력/공휴일** | korean-lunar-calendar |
| **날짜 처리** | date-fns |
| **알림** | Web Notifications API |
| **빌드** | Vite 8 |
| **iOS 변환** | Capacitor |
| **폰트** | Nanum Pen Script + Gowun Batang (Google Fonts) |

---

## 3. 핵심 기능 상세

### 3.1 캘린더 뷰 (연간 / 월간 / 주간 / 일간)

- **연간 뷰**: 12개월을 3x4 그리드로 한 화면에 표시
  - 각 미니 달력에 음력 1일/보름 표시
  - 공휴일 빨간색 표시
  - 일정이 있는 날짜에 점 표시
  - 월 제목 클릭 → 월간 뷰 이동, 날짜 클릭 → 일간 뷰 이동
- **월간 뷰**: 한 달 전체 그리드, 각 날짜에 일정 요약 (최대 3개 + 더보기)
  - 음력 날짜 표시 (1일이면 "X월", 나머지는 일수)
  - 공휴일 이름 + 빨간색 표시
  - 날짜 셀 클릭 → 일간 뷰, hover 시 + 버튼으로 일정 추가
- **주간 뷰**: 7일 타임라인 (00:00~23:00) + 상단 주간 일기 패널
  - 시간 슬롯 클릭 시 해당 시간으로 일정 생성 기본값 설정
- **일간 뷰**: 하루 타임라인 + 오른쪽 체크리스트 패널
  - 시간 슬롯 클릭 시 해당 시간으로 일정 생성 기본값 설정
- **공통**: 년/월/주/일 뷰 전환 버튼, 오늘 날짜 하이라이트, 이전/다음 네비게이션

### 3.2 주간 일기 작성

- 매주 단위로 일기 작성 (접이식 패널)
- 마크다운 지원 텍스트 에디터
- **사진 업로드 기능**
  - 정밀 압축: 품질 0.9→0.1 단계적 하향, 해상도 절반 축소 재시도로 5MB 이하 보장
  - 한 줄 5개 썸네일 그리드 표시
  - 사진 클릭 시 상세 모달 (인스타그램 피드 스타일)
  - 각 사진에 캡션(설명) 작성 가능 (자동 저장)
  - 사진 날짜 수정 가능 (날짜만, 시간 제외)
  - 삭제 확인 다이얼로그
- 패널 최대 높이 45vh + 스크롤 (하위 주간 일정 가림 방지)
- 자동 저장 (디바운스 1초)
- 접힌 상태에서 사진 개수 뱃지 표시

### 3.3 일정 추가 / 수정 / 삭제

- **추가**: 날짜/시간 슬롯 클릭 또는 `+ 새 일정` 버튼으로 모달 열기
  - 시간 슬롯 클릭 시 해당 시간이 기본 시작 시간으로 설정
  - 입력 항목: 제목, 날짜/시간, 종료 시간, 설명, 색상(8종), 반복 설정
- **수정**: 일정 클릭 → 상세 모달 → 편집 모드
- **삭제**: 상세 모달에서 삭제 버튼 (확인 다이얼로그 포함)
- 즉시 localStorage 반영

### 3.4 알림 기능

- 일정 시작 15분 전 자동 알림 (30초 간격 체크)
- 브라우저 Web Notification API 활용
- 앱 내 알림 센터 (벨 아이콘 + 읽지 않은 알림 뱃지, 최대 9+)
- 알림 목록 (읽음 처리, 전체 삭제)

### 3.5 반복 일정

- 반복 유형: 매일 / 매주 / 매월 / 매년 / 사용자 지정
- 사용자 지정: 특정 요일 선택 (일~토 버튼)
- 간격 설정: N일/주/월/년마다
- 반복 종료: 없음(무한) / 특정 날짜까지
- 최대 365회 반복 확장

### 3.6 일별 체크리스트

- 각 날짜마다 독립적인 체크리스트
- 항목 추가 / 체크(완료) / 삭제
- 완료율 프로그레스 바 표시 (완료 시 색상 변화)
- **일정 연동 기능**
  - "일정에서 가져오기" 패널: 해당 날짜 일정을 체크리스트에 추가
  - 직접 입력 시 드롭다운으로 연동할 일정 선택 가능
  - 연동된 항목에 일정 색상 점 표시
  - 연동 항목 클릭 시 일정 수정 모달 열기
- 일간 뷰 오른쪽 사이드바에 표시

### 3.7 타 사용자 공유 캘린더 (Supabase 연동 시 활성화 예정)

- 이메일로 사용자 초대
- 권한 레벨: **보기 전용** / **편집 가능** / **관리자**
- 실시간 동기화

### 3.8 음력 & 한국 공휴일

- **음력 표시**: korean-lunar-calendar 라이브러리 활용
  - 월간 뷰: 각 날짜에 음력 일수 표시, 1일이면 "X월" 형태
  - 연간 뷰: 음력 1일과 보름(15일)만 표시
- **한국 공휴일**
  - 양력 고정: 신정, 삼일절, 어린이날, 현충일, 광복절, 개천절, 한글날, 크리스마스
  - 음력 기반: 설날(연휴 3일), 부처님오신날, 추석(연휴 3일)
  - 대체공휴일: 어린이날 토/일 시 월요일 대체
  - 공휴일 빨간색 + 이름 표시

---

## 4. 디자인

- **컬러**: 흑백 모노크롬 (gray-900, gray-700, gray-400 계열)
  - 공휴일만 빨간색(red-500) 예외
  - 일정 색상은 8종 컬러 팔레트 유지
- **폰트**: Nanum Pen Script (나눔손글씨 펜) + Gowun Batang (고운바탕)
  - 손글씨 감성의 한글 폰트
  - 기본 22px, Tailwind 사이즈 전체 +4px 상향
- **레이아웃**: 좌측 사이드바(미니 캘린더 + 퀵링크) + 헤더 + 메인 콘텐츠

---

## 5. 데이터 모델

```
events
├── id (UUID)
├── title, description
├── startAt, endAt (ISO string)
├── allDay (boolean)
├── color
├── recurrenceRule (object, nullable)
└── parentEventId (nullable, 반복 일정 개별 수정용)

weekly_diaries
├── weekStart (YYYY-MM-DD)
├── content (text, markdown)
├── images (DiaryImage[])
│   ├── id, data (base64), caption, createdAt
└── updatedAt

daily_checklists
├── date (YYYY-MM-DD)
└── items (ChecklistItem[])
    ├── id, text, checked, order
    └── eventId (optional, 일정 연동)

notifications
├── id, eventId, eventTitle
├── message, time, read
```

---

## 6. 컴포넌트 구조

```
src/
├── components/
│   ├── calendar/
│   │   ├── YearView.tsx         ← 연간 뷰 (12개월 그리드)
│   │   ├── MonthView.tsx        ← 월간 뷰 (음력/공휴일 포함)
│   │   ├── WeekView.tsx         ← 주간 뷰 + 일기 패널
│   │   ├── DayView.tsx          ← 일간 뷰 + 체크리스트
│   │   ├── EventCard.tsx        ← 일정 카드 (일반/컴팩트)
│   │   └── EventModal.tsx       ← 일정 추가/수정/삭제 모달
│   ├── diary/
│   │   └── WeeklyDiaryPanel.tsx ← 주간 일기 (텍스트 + 사진 + 캡션)
│   ├── checklist/
│   │   └── DailyChecklist.tsx   ← 체크리스트 (일정 연동 포함)
│   ├── notification/
│   │   └── NotificationBell.tsx ← 알림 벨 + 드롭다운
│   └── layout/
│       ├── Sidebar.tsx          ← 미니 캘린더 + 퀵링크
│       ├── Header.tsx           ← 네비게이션 + 뷰 전환 (년/월/주/일)
│       └── Layout.tsx
├── stores/
│   └── calendarStore.ts         ← Zustand 전역 상태 (localStorage 연동)
├── lib/
│   └── korean.ts                ← 음력 변환 + 공휴일 계산
├── types/
│   └── index.ts
└── App.tsx
```

---

## 7. 구현 현황

### Phase 1 — 기반 구축 ✅
- [x] 프로젝트 초기화 (Vite + React + TypeScript + Tailwind)
- [x] 기본 레이아웃 (Sidebar, Header, Layout)
- [x] Zustand 스토어 + localStorage 연동

### Phase 2 — 핵심 캘린더 ✅
- [x] 연간 뷰 (12개월 그리드, 음력/공휴일)
- [x] 월간 뷰 (음력/공휴일, 날짜 클릭 네비게이션)
- [x] 주간 뷰 (시간 슬롯 클릭 → 해당 시간 일정 생성)
- [x] 일간 뷰 (시간 슬롯 클릭 → 해당 시간 일정 생성)
- [x] 일정 CRUD (추가/수정/삭제 모달)

### Phase 3 — 부가 기능 ✅
- [x] 반복 일정 (매일/매주/매월/매년/사용자지정)
- [x] 알림 기능 (Web Notification + 앱 내 알림 센터)
- [x] 일별 체크리스트 (일정 연동 포함)
- [x] 주간 일기 (사진 업로드 + 캡션 + 날짜 수정 + 정밀 압축)
- [x] 음력 & 한국 공휴일 표시

### Phase 4 — 디자인 ✅
- [x] 흑백 모노크롬 디자인
- [x] 손글씨 폰트 (Nanum Pen Script + Gowun Batang)
- [x] 글씨 크기 +4px 상향

### Phase 5 — 미구현 (예정)
- [ ] Supabase 연동 (인증, DB, 실시간 동기화)
- [ ] 공유 캘린더 (초대/권한/실시간)
- [ ] 반응형 디자인 (모바일 대응)
- [ ] iOS 앱 변환 (Capacitor) — 가이드 작성 완료 (`IOS_SETUP_GUIDE.md`)
- [ ] 배포 (Vercel)

---

## 8. iOS 앱 변환

`IOS_SETUP_GUIDE.md`에 상세 가이드 작성 완료.
Capacitor를 사용하여 웹앱을 네이티브 iOS 앱으로 변환.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Diary Calendar" "com.gyeunee.diarycalendar" --web-dir dist
npx cap add ios
npm run build && npx cap sync ios
npx cap open ios
```

---

## 9. 비기능 요구사항

- **데이터 저장**: localStorage (향후 Supabase/IndexedDB 전환 가능)
- **이미지 압축**: 정밀 단계적 압축으로 5MB 이하 보장
- **자동 저장**: 일기/체크리스트 변경 시 디바운스 자동 저장
- **성능**: 연간 뷰 공휴일/음력 계산을 useMemo로 캐싱
