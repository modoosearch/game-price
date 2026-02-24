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

## 바로템 파싱 (웹 서비스용)

- **서버에서 헤드리스 브라우저(Puppeteer)로 수집** → 고객은 우리 웹만 열면 됨. **Tampermonkey 등 확장 설치 불필요.**
- 설정: `server/config.js` → `barotem.useBrowserParser: true`, `serverDelayMs`, `parseIntervalMs` (기본 2분 주기, 서버 간 2.5초 딜레이로 트래픽 완화).
- 호스팅에 **Node + Chromium** 실행 가능해야 함 (Puppeteer). 불가 시 `useBrowserParser: false` 로 두면 기존 axios 수집 시도(바로템이 막으면 0건).
