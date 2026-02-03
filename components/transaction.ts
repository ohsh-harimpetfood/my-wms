// constants/transaction.ts

export const TX_TYPES = {
  // ------------------------------------------------------------------
  // 1. 입고 (IN) - 재고 증가 (+)
  // ------------------------------------------------------------------
  IN_PURCHASE: { code: 'IN_PURCHASE', label: '🚚 구매 입고', type: 'IN', color: 'blue' },
  IN_PROD:     { code: 'IN_PROD',     label: '🏭 생산 입고', type: 'IN', color: 'indigo' },
  IN_RETURN:   { code: 'IN_RETURN',   label: '↩️ 판매 반품', type: 'IN', color: 'orange' }, // 고객 -> 우리
  IN_ETC:      { code: 'IN_ETC',      label: '🎸 기타 입고', type: 'IN', color: 'gray' },

  // ------------------------------------------------------------------
  // 2. 출고 (OUT) - 재고 감소 (-)
  // ------------------------------------------------------------------
  OUT_SALES:    { code: 'OUT_SALES',    label: '📦 판매 출고', type: 'OUT', color: 'blue' },
  OUT_PROD:     { code: 'OUT_PROD',     label: '🏭 생산 투입', type: 'OUT', color: 'green' }, // 자재 -> 라인
  OUT_RETURN:   { code: 'OUT_RETURN',   label: '↩️ 매입 반품', type: 'OUT', color: 'orange' }, // 우리 -> 공급사
  OUT_DISPOSAL: { code: 'OUT_DISPOSAL', label: '🗑️ 폐기',     type: 'OUT', color: 'red' },
  OUT_SAMPLE:   { code: 'OUT_SAMPLE',   label: '🧪 샘플',     type: 'OUT', color: 'purple' },
  OUT_ETC:      { code: 'OUT_ETC',      label: '🎸 기타 출고', type: 'OUT', color: 'gray' },

  // ------------------------------------------------------------------
  // 3. 이동/조정 (MOVE/ADJ) - 위치 변경 or 수량 보정
  // ------------------------------------------------------------------
  MV_LOC:    { code: 'MV_LOC',    label: '🔄 랙 이동',   type: 'MOVE', color: 'yellow' },
  ADJ_STOCK: { code: 'ADJ_STOCK', label: '⚖️ 재고 조정', type: 'ADJ',  color: 'zinc' }, 
} as const;

export type TxCode = keyof typeof TX_TYPES;

// 헬퍼 함수: 특정 타입(IN, OUT 등)만 필터링해서 가져오기
export const getTxTypesByGroup = (group: 'IN' | 'OUT' | 'MOVE' | 'ADJ') => {
  return Object.values(TX_TYPES).filter(t => t.type === group);
};