// components/RackDetailModal/VirtualStagingView.tsx

import { useMemo } from "react";
import { LocationData } from "./types";
import { Package, Clock, ArrowRight, Plus, AlertTriangle } from "lucide-react";

// 🚀 라이브러리 없이 자체적으로 체류 시간(방치 시간)을 계산하는 함수
function getTimeAgo(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${Math.max(0, diffMins)}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

interface Props {
  locations: LocationData[];
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (locId: string) => void;
}

export function VirtualStagingView({ locations, onInventoryClick, onEmptyClick }: Props) {
  const locData = locations?.find(l => l.loc_id.startsWith('VIR-STG'));
  const inventory = locData?.inventory || [];

  const palletList = useMemo(() => {
    const pMap = new Map<string, any>();

    inventory.forEach((rawItem, idx) => {
        const item = rawItem as any; // 🚀 TS 에러 방지: inbound_date 강제 인식
        const pid = item.pallet_id || `legacy-${idx}`; 
        
        if (!pMap.has(pid)) {
            pMap.set(pid, { 
                pallet_id: pid, 
                items: [], 
                totalQty: 0, 
                isLegacy: !item.pallet_id,
                oldestDate: item.inbound_date ? new Date(item.inbound_date) : new Date() 
            });
        }
        
        const group = pMap.get(pid)!;
        group.items.push(item);
        group.totalQty += (item.quantity || 0);
        
        if (item.inbound_date) {
            const itemDate = new Date(item.inbound_date);
            if (itemDate < group.oldestDate) group.oldestDate = itemDate;
        }
    });

    return Array.from(pMap.values()).sort((a, b) => b.oldestDate.getTime() - a.oldestDate.getTime());
  }, [inventory]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-2 md:p-6 animate-fade-in">
        
        {/* 상단 현황판 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl gap-4">
            <div>
                <h3 className="text-2xl font-black text-amber-400 flex items-center gap-2">
                    <AlertTriangle size={24} /> 바닥 대기 파렛트 목록
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                    임시 구역이므로 장기 보관을 피하고 신속히 랙으로 <strong className="text-white">[재고 이동]</strong> 처리해 주세요.
                </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-950 px-6 py-3 rounded-xl border border-slate-800">
                <div className="text-center">
                    <div className="text-[10px] text-slate-500 font-bold mb-1">대기 수량</div>
                    <div className="text-3xl font-black text-white leading-none">{palletList.length} <span className="text-sm text-slate-500 font-normal">PLT</span></div>
                </div>
                <div className="w-px h-10 bg-slate-800"></div>
                <button 
                    onClick={() => onEmptyClick(locData?.loc_id || 'VIR-STG-01')}
                    className="flex flex-col items-center justify-center p-2 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition"
                >
                    <Plus size={20} />
                    <span className="text-xs font-bold mt-1">신규 입고</span>
                </button>
            </div>
        </div>

        {/* 리스트 영역 */}
        {palletList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl border-dashed">
                <Package size={48} className="text-slate-600 mb-4" />
                <p className="text-slate-400 font-bold text-lg">바닥 대기 중인 파렛트가 없습니다.</p>
                <p className="text-slate-500 text-sm mt-1">모든 화물이 제자리를 찾았습니다! 👏</p>
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                {palletList.map((pallet) => {
                    const hoursWaiting = Math.floor((new Date().getTime() - pallet.oldestDate.getTime()) / (1000 * 60 * 60));
                    
                    let agingColor = "text-emerald-400 bg-emerald-900/20 border-emerald-800";
                    let agingIcon = <Clock size={12} />;
                    if (hoursWaiting > 24) {
                        agingColor = "text-rose-400 bg-rose-900/20 border-rose-800 animate-pulse";
                        agingIcon = <AlertTriangle size={12} />;
                    } else if (hoursWaiting > 6) {
                        agingColor = "text-amber-400 bg-amber-900/20 border-amber-800";
                    }

                    const timeAgo = getTimeAgo(pallet.oldestDate);

                    return (
                        <div key={pallet.pallet_id} className="bg-slate-800/80 border border-slate-700 hover:border-slate-500 p-4 md:p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors group shadow-md">
                            
                            {/* 왼쪽: 기본 정보 & 에이징 */}
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 mb-2">
                                    {pallet.isLegacy ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-700 text-slate-300 rounded border border-slate-600">ID 미지정</span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded border border-blue-800">LPN: {pallet.pallet_id}</span>
                                    )}
                                    
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${agingColor}`}>
                                        {agingIcon} {timeAgo} 입고됨
                                    </span>
                                </div>
                                
                                <div className="flex flex-col gap-1 mt-3">
                                    {pallet.items.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm md:text-base border-b border-slate-700/50 pb-1 last:border-0 last:pb-0">
                                            <div className="font-bold text-slate-200 truncate pr-4">{item.item_master?.item_name || '알 수 없는 품목'}</div>
                                            <div className="font-black text-white shrink-0 bg-slate-900 px-2 py-0.5 rounded text-xs border border-slate-700">
                                                {item.quantity.toLocaleString()} <span className="text-[10px] text-slate-400">{item.item_master?.uom || 'kg'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 오른쪽: 액션 버튼 */}
                            <div className="flex flex-row md:flex-col gap-2 w-full md:w-48 shrink-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700 md:pl-4">
                                <button 
                                    onClick={() => onInventoryClick(locData?.loc_id || '')}
                                    className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 rounded-lg shadow transition"
                                >
                                    <ArrowRight size={16} /> 상세조회 / 이동
                                </button>
                                <button 
                                    onClick={() => window.location.href = `/inbound/direct?loc=${locData?.loc_id || ''}${pallet.isLegacy ? '' : `&pallet=${pallet.pallet_id}`}`}
                                    className="flex-1 flex justify-center items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-3 rounded-lg shadow transition"
                                >
                                    <Plus size={16} className="text-emerald-400" /> 혼적 입고
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
}