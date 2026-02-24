# 게임머니 시세 중계

1분 단위 시세 수집, 그래프·등락률·거래 내역·실시간 채팅.

## 로컬 개발

```bash
npm run install:all
npm run dev
```

- 백엔드: http://localhost:4000  
- 프론트: http://localhost:3000  

## 웹호스팅 배포 (테스트용)

```bash
npm run install:all
npm run build
npm start
```

브라우저에서 **http://localhost:4000** 으로 접속해 확인한 뒤, 호스팅에 올리면 됩니다.

**자세한 배포 방법** (Render, Railway, Fly.io, 일반 Node 호스팅): **[DEPLOY.md](./DEPLOY.md)** 참고.

### 프론트만 파일 호스팅 + 백엔드는 따로 둘 때 (수집 버튼 404 해결)

- **파일 호스팅**은 HTML/JS만 제공해서 `/api/parse/barotem` 같은 **Node API가 없어** "지금 수집" 누르면 404가 난다.
- **Node 서버**를 다른 곳(Render, Railway, VPS 등)에서 실행한 뒤, 빌드할 때 **API 주소**를 그 서버로 맞춰야 한다.

```bash
# 예: Node 백엔드가 https://my-game-api.onrender.com 에 있을 때
cd client
VITE_API_BASE=https://my-game-api.onrender.com npm run build
```

- `client/dist` 를 파일 호스팅에 올리고, Node 앱은 위 주소에서 계속 켜 두면 된다. (CORS는 서버에서 이미 허용 중)

## 바로템 수집 방식 (둘 중 하나)

### 1) 브라우저 열어두고 변동만 푸시 (권장, Render 등에서 그대로 사용 가능)

- **바로템**을 브라우저에서 열어두고, **변동 사항만** 우리 서버로 푸시하는 방식.
- **scripts/barotem-push.user.js** (Tampermonkey)를 설치하면, 거래완료 페이지에서 30초마다 DOM을 읽어 **변경이 있을 때만** `POST /api/collect/barotem/push` 로 전송.
- 서버는 Puppeteer/Chromium 없이 받은 데이터만 반영 → **Render 무료 플랜에서도 차트·거래 내역 정상 표시.**
- 설치·API 주소 설정: **[scripts/README.md](./scripts/README.md)** 참고.

### 2) 서버에서 헤드리스 브라우저(Puppeteer)로 수집

- 서버에서 직접 바로템 페이지를 열어 수집. Tampermonkey 불필요.
- 설정: `server/config.js` → `USE_BROWSER_PARSER=true` (환경 변수), `serverDelayMs`, `parseIntervalMs`.
- **Node + Chromium** 가능한 호스팅에서만 사용 (Render 무료는 Chromium 없음 → 1번 방식 사용).
