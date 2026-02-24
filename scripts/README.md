# 바로템 시세 푸시 스크립트

**바로템 브라우저를 열어두고, 변동 사항만 중계 서버로 푸시**하는 방식입니다.  
서버는 Puppeteer 없이 `/api/collect/barotem/push` 로 받은 데이터만 반영합니다.

## 설치

1. 브라우저에 [Tampermonkey](https://www.tampermonkey.net/) 확장 설치
2. `barotem-push.user.js` 파일 내용을 복사
3. Tampermonkey → 새 스크립트 추가 → 붙여넣기 → 저장
4. 바로템 **거래완료** 페이지(`/product/lists/...`)를 열어두면 30초마다 DOM을 읽어 **변동이 있을 때만** 푸시

## 중계 서버 주소 바꾸기

스크립트 상단의 `API_BASE` 를 수정하세요.

```javascript
const API_BASE = 'https://game-price.onrender.com';  // 또는 https://adn.infosearch.kr
```

## 동작

- **거래완료** 탭에서만 동작 (물품리스트 > 거래완료물품)
- 당일 날짜의 `ul.di_no_i` 항목만 수집 (만당 가격, 수량)
- 푸시 직전 상태와 **같으면 요청 안 함** (변동만 전송)
- 서버는 받은 데이터로 시세·거래 내역·차트를 갱신하고 WebSocket으로 실시간 배포
