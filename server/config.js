/** 바로템 등 중계 사이트 파싱 설정
 * 구분: 팝니다 li[data-sell="sell"]
 * 서버: li[data-title="opt1"][data-opt1="24487"] 등
 * 물품리스트 > 거래완료물품(display=3) > ul.di_no_i 아래 수량·만당 원·날짜
 */
module.exports = {
  barotem: {
    listUrl: 'https://www.barotem.com/product/lists/2382r902',
    /** 서버 opt1 코드 순서 (팝니다·거래완료 수집용) */
    servers: [24487, 24488, 24489, 24490, 24491, 24492, 24493, 24494, 24495, 24496, 24527, 24528, 24529, 24530, 24531, 24575, 24576, 24577, 24578, 24579, 24609, 24610, 24611, 24612, 24613],
    /** select.title_options_all: 1=전체, 2=거래가능, 3=거래완료물품 */
    displayCompleted: 3,
    query: {
      page: 1,
      sell: 'sell',
      category: '',
      display: 1,
      orderby: 1,
      minpay: '',
      maxpay: '',
      search_word: '',
      brand: '',
      buyloc: '',
      opt1: '',
      opt2: '', opt3: '', opt4: '', opt5: '', opt6: '', opt7: '', opt8: '', opt9: '', opt10: ''
    },
    /** 서버에서 헤드리스 브라우저로 수집 (고객 확장 설치 불필요) */
    useBrowserParser: true,
    /** 서버 간 이동 딜레이(ms). 트래픽 부담 완화 */
    serverDelayMs: 2500,
    /** 페이지 로드 대기(ms) */
    pageTimeoutMs: 20000
  },
  /** 수집 주기(ms). 브라우저 사용 시 2분 권장 */
  parseIntervalMs: 2 * 60 * 1000
};
