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
4. Deploy 후 나온 URL로 접속 (예: `https://game-price.onrender.com`)

**Render 기본 URL(.onrender.com) 변경**: 서비스 생성 시 정해진 주소는 **이후에 바꿀 수 없습니다**. [Render 문서](https://community.render.com/t/how-do-i-change-url-of-a-web-service/11980) 기준, 서비스 이름을 바꿔도 URL 슬러그는 그대로입니다.  
- **쓰고 싶은 주소가 있으면** → 해당 서비스에 **Custom Domain**을 추가하세요 (예: `adn.infosearch.kr`). 대시보드 → 서비스 → **Settings → Custom Domains**에서 추가 후, 네임서버/호스팅에서 CNAME 또는 A 레코드로 연결하면 됩니다.  
- 푸시 스크립트·클라이언트에서 사용할 API 주소는 **커스텀 도메인**으로 두면 됩니다 (스크립트 상단 `API_BASE`, 빌드 시 `VITE_API_BASE`).

**커스텀 도메인 연결 불가 시 점검**  
- **주소 철자**: `adn.infosearch.kr` 인지 확인 (예: `aden` 오타 시 연결 안 됨).  
- **Render 쪽 도메인**: Custom Domains에 **접속하려는 주소와 똑같이** 등록 (예: `adn.infosearch.kr`).  
- **네임서버 설정**:  
  - **CNAME**을 쓸 때 `game-price.onrender.com`(하이픈 포함)이 일부 DNS에서 거부되면, **A 레코드**로 **216.24.57.1** 지정해서 쓰면 됩니다.  
- **전파 대기**: DNS 변경 후 최대 24~48시간 걸릴 수 있음.  
- **캐시**: 브라우저 시크릿/다른 기기에서 `https://adn.infosearch.kr` 접속 테스트.

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
