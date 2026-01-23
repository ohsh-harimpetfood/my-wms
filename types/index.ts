// types/index.ts

// 1. 품목 마스터 (확장됨)
export interface Item {
  item_key: string;       // PK
  item_name: string;
  uom: string;
  barcode?: string;       // ✨ 신규: 스캔용 바코드
  shelf_life_days?: number; // ✨ 신규: 유통기한 관리용
  lot_required: string;
  active_flag: string;
  remark?: string;
  use_team: string;
  unit_cost: number;
  created_at: string;
}

// 2. 재고 (확장됨)
export interface Inventory {
  id: number;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;         // ✨ 신규: LOT 번호
  exp_date?: string;      // ✨ 신규: 유통기한
  status: 'AVAILABLE' | 'HOLD' | 'QC'; // ✨ 신규: 재고 상태
  inbound_date: string;   // ✨ 신규: 선입선출용 입고일
  updated_at: string;
  // Join용 (선택적)
  item_master?: Item;
}

// 3. 입고 예정 마스터 (신규)
export interface InboundMaster {
  inbound_no: string;     // PK (예: IB-240101-001)
  supplier_name: string;
  plan_date: string;      // 입고 예정일
  status: 'PENDING' | 'PARTIAL' | 'CLOSED';
  remark?: string;
  created_at: string;
  // Join용
  details?: InboundDetail[];
}

// 4. 입고 예정 상세 (신규)
export interface InboundDetail {
  id: number;
  inbound_no: string;
  item_key: string;
  plan_qty: number;       // 예정 수량
  received_qty: number;   // 실적 수량 (스캔 시 증가)
  status: 'PENDING' | 'COMPLETED';
  // Join용
  item_master?: Item;
}