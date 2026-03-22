// components/RackDetailModal/types.ts

// 📦 🚀 새로 추가된 포장(박스/잔량) 정보 타입 (그대로 유지)
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
  
  loc_type?: string; // 가상 로케이션 판별용

  inventory?: { 
    quantity: number; 
    
    // 🚀 [추가] 타입스크립트에게 pallet_id가 존재할 수 있음을 알려줍니다!
    pallet_id?: string | null; 
    
    item_master?: { 
      item_name: string;
      item_type?: string; 
      uom?: string;       
    } | null;
    inventory_packing_info?: PackingInfo[]; 
  }[];
}