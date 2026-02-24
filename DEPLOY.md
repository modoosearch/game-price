# 웹호스팅 배포 가이드

한 서버에서 API + 웹 + WebSocket 모두 제공하므로 **Node.js를 지원하는 호스팅**에 올리면 됩니다.

---

## 1. 로컬에서 빌드 & 실행 테스트

```bash
npm run install:all
npm run build
npm start
```

브라우저에서 http://localhost:4000 접속해서 화면·API·채팅이 정상인지 확인하세요.

---

## 2. 호스팅별 배포 방법

### Render (무료 플랜 가능)

1. [render.com](https://render.com) 가입 후 **New → Web Service**
2. GitHub 저장소 연결 (또는 이 폴더를 푸시한 repo)
3. 설정:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `NODE_VERSION` = `20` (또는 18)
4. Deploy 후 나온 URL로 접속 (예: `https://game-xxxx.onrender.com`)

### Railway

1. [railway.app](https://railway.app) 가입 → **New Project** → **Deploy from GitHub**
2. repo 선택 후 설정:
   - **Build**: `npm run install:all && npm run build`
   - **Start**: `npm start`
3. **Settings → Generate Domain** 으로 URL 생성

### Fly.io

1. [fly.io](https://fly.io) CLI 설치 후 로그인
2. 프로젝트 폴더에서:
   ```bash
   fly launch
   ```
3. `fly.toml`에 아래 추가 후 `fly deploy`:
   ```toml
   [env]
     PORT = "8080"
   ```
4. **Start Command**는 `npm start`, 빌드는 Dockerfile 또는 **Build Command**에서 `npm run install:all && npm run build` 실행

### 일반 Node 호스팅 (VPS, cPanel Node 등)

- 서버에 이 폴더 업로드(또는 git clone)
- 터미널에서:
  ```bash
  npm run install:all
  npm run build
  npm start
  ```
- 포트는 호스팅에서 지정한 값 사용 (대부분 `process.env.PORT` 자동 설정)
- **항상 실행**하려면 `pm2` 사용 권장:
  ```bash
  npm i -g pm2
  pm2 start server/index.js --name game-tracker
  pm2 save && pm2 startup
  ```

---

## 3. 참고

- **WebSocket**: Render, Railway, Fly.io 모두 기본 지원. 일부 무료 플랜은 15분 비활성 시 슬립되므로 채팅/실시간은 잠깐 끊길 수 있음.
- **HTTPS**: 위 서비스들은 자동으로 HTTPS + wss 적용됩니다.
- **환경 변수**: `PORT`는 호스팅이 지정하면 그대로 사용합니다. 추가 설정은 `server/config.js` 또는 `process.env`로 넣으면 됩니다.
