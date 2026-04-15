# iOS 앱 변환 가이드 (Capacitor)

Capacitor를 사용하여 이 React 웹앱을 네이티브 iOS 앱으로 변환하는 방법입니다.

---

## 사전 요구사항

1. **macOS** (iOS 빌드는 macOS에서만 가능)
2. **Xcode** (App Store에서 설치, 최신 버전 권장)
3. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```
4. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```
5. **Apple Developer 계정** (실기기 테스트 및 배포 시 필요)

---

## Step 1: Capacitor 설치

```bash
# 프로젝트 디렉토리에서 실행
npm install @capacitor/core @capacitor/cli
```

## Step 2: Capacitor 초기화

```bash
npx cap init "Diary Calendar" "com.gyeunee.diarycalendar" --web-dir dist
```

- `"Diary Calendar"` → 앱 이름
- `"com.gyeunee.diarycalendar"` → 번들 ID (원하는 것으로 변경 가능)
- `--web-dir dist` → Vite 빌드 출력 폴더

## Step 3: iOS 플랫폼 추가

```bash
npm install @capacitor/ios
npx cap add ios
```

이 명령어가 `ios/` 폴더에 Xcode 프로젝트를 생성합니다.

## Step 4: 웹앱 빌드 & iOS 동기화

```bash
# 웹앱 빌드
npm run build

# 빌드 결과물을 iOS 프로젝트로 복사
npx cap sync ios
```

> **중요**: 코드를 수정할 때마다 `npm run build && npx cap sync ios`를 실행해야 합니다.

## Step 5: Xcode에서 열기

```bash
npx cap open ios
```

Xcode가 열리면:
1. 좌측 프로젝트 네비게이터에서 **App** 선택
2. **Signing & Capabilities** 탭 클릭
3. **Team** 드롭다운에서 본인의 Apple Developer 계정 선택
4. **Bundle Identifier** 확인 (Step 2에서 설정한 것)

## Step 6: 시뮬레이터에서 실행

Xcode 상단에서:
1. 대상 디바이스로 **iPhone 시뮬레이터** (예: iPhone 16 Pro) 선택
2. **▶ Run** 버튼 클릭 (또는 `Cmd + R`)

## Step 7: 실제 iPhone에서 실행

1. iPhone을 Mac에 USB로 연결
2. Xcode 상단 디바이스 목록에서 본인 iPhone 선택
3. iPhone에서 **설정 → 일반 → VPN 및 기기 관리**에서 개발자 앱 신뢰 설정
4. **▶ Run** 클릭

---

## 추가 설정 (권장)

### 상태바 / 안전 영역 처리

```bash
npm install @capacitor/status-bar
npx cap sync ios
```

`capacitor.config.ts`에서 설정:
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gyeunee.diarycalendar',
  appName: 'Diary Calendar',
  webDir: 'dist',
  server: {
    // 개발 중 핫리로드 사용 시 (옵션)
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',  // Safe Area 자동 처리
  },
};

export default config;
```

### 로컬 알림 (네이티브)

```bash
npm install @capacitor/local-notifications
npx cap sync ios
```

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// 알림 권한 요청
await LocalNotifications.requestPermissions();

// 알림 예약
await LocalNotifications.schedule({
  notifications: [{
    title: 'Diary Calendar',
    body: '일정이 곧 시작됩니다',
    id: 1,
    schedule: { at: new Date(Date.now() + 1000 * 60 * 15) },
  }],
});
```

### 스플래시 스크린 & 앱 아이콘

```bash
npm install @capacitor/splash-screen
npx cap sync ios
```

앱 아이콘 설정:
1. 1024x1024 PNG 이미지 준비
2. Xcode에서 `ios/App/App/Assets.xcassets/AppIcon.appiconset`에 추가
3. 또는 아이콘 생성 도구 사용:
   ```bash
   npm install -g capacitor-assets
   npx capacitor-assets generate --iconBackgroundColor '#4f46e5'
   ```

---

## 개발 워크플로우 요약

```bash
# 1. 코드 수정 후 빌드
npm run build

# 2. iOS 프로젝트 동기화
npx cap sync ios

# 3. Xcode에서 실행
npx cap open ios
# 또는 CLI로 직접 실행
npx cap run ios
```

### 핫리로드 (개발 중)

`capacitor.config.ts`에서 서버 URL을 설정하면 개발 서버에 직접 연결됩니다:

```typescript
server: {
  url: 'http://192.168.0.X:5173',  // Mac의 로컬 IP
  cleartext: true,
}
```

```bash
# 터미널 1: 개발 서버 실행
npm run dev -- --host

# 터미널 2: iOS 실행
npx cap run ios
```

> **배포 시에는 반드시 server.url을 제거하세요!**

---

## App Store 배포

1. Apple Developer Program 가입 ($99/년)
2. Xcode에서 **Product → Archive** 실행
3. **Distribute App** → **App Store Connect** 선택
4. App Store Connect에서 앱 정보 입력 후 심사 제출

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| Pod install 실패 | `cd ios/App && pod install --repo-update` |
| 빌드 에러 | `npx cap sync ios` 재실행 |
| 시뮬레이터 미표시 | Xcode → Settings → Platforms에서 시뮬레이터 다운로드 |
| 실기기 서명 오류 | Xcode Signing & Capabilities에서 팀 재선택 |
