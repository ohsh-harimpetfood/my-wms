// components/RackDetailModal/types.ts

// 📦 🚀 [추가] 새로 추가된 포장(박스/잔량) 정보 타입
export interface PackingInfo {
  pack_type: "BOX" | "LOOSE";
  unit_qty: number;
  pack_count: number;
  total_qty: number;
}

export interface LocationData {
  loc_id: string;
  warehouse: string;
  zone: string;
  rack_no: string;
  level_no: string;
  side: string;
  inventory?: { 
    quantity: number; 
    item_master?: { 
      item_name: string;
      item_type?: string; // 원자재/부자재 판별용
      uom?: string;       // 단위 정보 판별용 (선택)
    } | null;
    // 🚀 [추가] 박스 및 잔량 상세 정보 배열
    inventory_packing_info?: PackingInfo[]; 
  }[];
}