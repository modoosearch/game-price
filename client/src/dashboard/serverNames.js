/** 서버 opt1 코드 순서와 동일한 표시 이름 (바로템 사이트 기준) */
export const SERVER_NAMES = [
  '데포로쥬', '켄라우헬', '질리언', '이실로테', '조우', '하딘', '케레니스', '오웬', '크리스터', '아인하사드',
  '아툰', '가드리아', '군터', '아스테어', '듀크데필', '발센', '어레인', '캐스톨', '세바스챤', '데컨',
  '파아그리오', '에바', '사이하', '마프르', '린델'
];

export function getServerName(serverCode, index) {
  const i = typeof index === 'number' ? index : SERVER_NAMES.length;
  return SERVER_NAMES[i] ?? `서버 ${serverCode}`;
}
