// components/RackDetailModal/types.ts

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
      item_type?: string; // 🚀 [추가] 원자재/부자재 판별용
      uom?: string;       // 🚀 [추가] 단위 정보 판별용 (선택)
    } | null 
  }[];
}