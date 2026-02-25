# 바로템 거래완료 데이터 — 네트워크에서 찾는 방법

거래완료물품 리스트는 **productTable/2382r902** 요청 한 번으로 내려옵니다.  
F12 → Network → 해당 요청 선택 → **Preview** 보면 **JSON**입니다.

## 어떤 요청이 데이터를 주는지

1. 브라우저에서 **바로템** 접속 → 게임머니 → **거래완료물품** 선택 (서버 하나 선택 시 해당 서버만)
2. **F12** → **Network** → **XHR** / **Fetch** (또는 "productTable" 검색)
3. **`productTable`** / **`2382r902`** 요청 클릭 → **Preview** 탭

## 응답 구조 (JSON)

- `code`: 200
- `rows`: **배열** — 한 행이 거래 한 건
  - `number`: 물품 번호 (id)
  - `reg_date`: "2026-02-25 10:22:40"
  - `server`: "데포로쥬"
  - `opt_goods_1`: "24487" (서버 코드)
  - `unit_price`: "만당 5,882원"
  - `baro_price`: "50000"
  - `unitExcut`: "85000" (아데나 수량)
  - `multi_cnt`: "0천 아데나" 등
- `paging`: 페이지네이션 HTML 문자열
- `total`: "6,079건" 등

서버에서는 이 URL 호출 시 **JSON**이 오면 `rows`만 쓰면 되고, HTML이 오면 기존처럼 HTML 파싱 fallback.

## URL 형식

- **기본**: `https://www.barotem.com/product/productTable/2382r902`
- **쿼리**: `display=3`(거래완료), `opt1=서버코드`, `page=1`, `sell=sell` 등

예: `...?page=1&sell=sell&display=3&opt1=24487&...` → 해당 서버 1페이지 JSON
