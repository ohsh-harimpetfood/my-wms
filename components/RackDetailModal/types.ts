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
    item_master?: { item_name: string } | null 
  }[];
}