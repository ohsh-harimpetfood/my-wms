import { useState } from "react";
import { LocationData } from "./types";
import { Package, Plus, AlertCircle, ArrowRight, MoveHorizontal, X, Hash } from "lucide-react"; 

interface Props {
  containerName: string;
  locations: LocationData[];
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (locId: string) => void;
}

export function ContainerView({ containerName, locations, onInventoryClick, onEmptyClick }: Props) {
  // 🚀 수정: activePalletId를 선택된 객체 전체를 담는 상태로 변경하여 바텀시트에서 사용하기 쉽게 개선
  const [selectedPallet, setSelectedPallet] = useState<any | null>(null);

  const locData = locations && locations.length > 0 ? locations[0] : undefined;
  const locId = locData?.loc_id || '';

  const sizeMatch = locId.match(/-(\d{2})$/);
  const containerSize = sizeMatch ? parseInt(sizeMatch[1]) : 40; 
  const maxCapa = containerSize === 20 ? 8 : 20;

  const inventory = locData?.inventory || [];
  const palletMap = new Map<string, { pallet_id: string, items: any[], totalQty: number, isLegacy: boolean }>();
  
  inventory.forEach((item, idx) => {
      const pid = item.pallet_id || `legacy-${idx}`; 
      if (!palletMap.has(pid)) {
          palletMap.set(pid, { pallet_id: pid, items: [], totalQty: 0, isLegacy: !item.pallet_id });
      }
      const palletGroup = palletMap.get(pid)!;
      palletGroup.items.push(item);
      palletGroup.totalQty += (item.quantity || 0);
  });

  const palletList = Array.from(palletMap.values());
  const currentPallets = palletList.length;
  
  const occupancyRate = Math.min(100, Math.round((currentPallets / maxCapa) * 100));
  const overCapa = currentPallets > maxCapa;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyRate / 100) * circumference;

  const maxCols = maxCapa / 2;
  const currentCols = Math.ceil(currentPallets / 2);
  const totalCols = Math.max(maxCols, currentCols); 
  
  const filledPct = Math.min(100, (currentCols / totalCols) * 100);
  const emptyPct = overCapa ? 0 : 100 - filledPct;

  return (
    <div className="flex flex-col xl:flex-row w-full h-full gap-8 p-4 md:p-8 animate-fade-in items-center justify-center min-h-[400px]">

        {/* 📍 왼쪽: 적재율 대시보드 */}
        <div className="flex flex-col items-center justify-center w-full xl:w-1/3 bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-2xl shrink-0 h-full min-h-[400px]">
            <h3 className="text-lg md:text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                📊 운영 적재율 ({containerSize}ft)
            </h3>

            <div className="relative w-48 h-48 md:w-56 md:h-56 mb-6">
                <svg className="w-full h-full drop-shadow-xl" viewBox="0 0 150 150">
                    <circle className="text-slate-800 stroke-current" strokeWidth="16" cx="75" cy="75" r="60" fill="transparent"></circle>
                    <circle 
                        className={`${overCapa ? 'text-rose-500' : 'text-cyan-500'} stroke-current transition-all duration-1000 ease-out`} 
                        strokeWidth="16" strokeLinecap="round" cx="75" cy="75" r="60" fill="transparent" 
                        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 75 75)"
                    ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-black tracking-tighter ${overCapa ? 'text-rose-400' : 'text-white'}`}>
                        {occupancyRate}%
                    </span>
                    <span className="text-xs text-slate-400 mt-2 font-bold">사용량</span>
                </div>
            </div>

            <div className="w-full flex justify-between px-6 py-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner mt-auto">
                <div className="text-center flex-1 px-1">
                    <div className="text-xs text-slate-500 font-bold mb-1">현재 보관</div>
                    <div className="text-2xl font-black text-white">{currentPallets} <span className="text-xs font-bold text-slate-400">PLT</span></div>
                    {currentPallets > 0 && (
                        <div className="text-[10px] text-cyan-300 font-bold mt-1 truncate max-w-[120px] mx-auto">
                            ({palletList[0]?.items[0]?.item_master?.item_name || '다중 품목'})
                        </div>
                    )}
                </div>
                <div className="w-px bg-slate-700 mx-2"></div>
                <div className="text-center flex-1 px-1">
                    <div className="text-xs text-slate-500 font-bold mb-1">운영 Capa</div>
                    <div className="text-2xl font-black text-cyan-400">{maxCapa} <span className="text-xs font-bold text-cyan-700">PLT</span></div>
                    <div className="text-[10px] text-slate-500 mt-1">(팔레트 기준)</div>
                </div>
            </div>
        </div>

        {/* 📍 오른쪽: 컨테이너 내부 투시도 */}
        <div className="flex flex-col w-full xl:w-2/3 h-full justify-center mt-6 xl:mt-0 max-w-[800px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-3 px-2 gap-2">
                <div className="text-sm md:text-base font-bold text-slate-300 flex items-center gap-2">
                    <Package size={18} className="text-cyan-500" />
                    컨테이너 내부 투시도 (PLT 기준)
                    <span className="md:hidden flex items-center gap-1 text-[10px] text-yellow-500 bg-yellow-900/30 px-1.5 py-0.5 rounded ml-2 border border-yellow-700/50">
                        <MoveHorizontal size={12}/> 좌우 스와이프
                    </span>
                </div>
                <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded w-fit">좌측(문) ➔ 우측(안쪽) 적재</div>
            </div>

            <div className="relative w-full bg-slate-900/80 border-[6px] border-slate-600 rounded-lg p-2 flex flex-col shadow-inner overflow-hidden">
                <div className="absolute left-0 top-2 bottom-2 w-3 border-r-2 border-dashed border-slate-500/50 bg-slate-700 flex items-center justify-center z-30 rounded-r">
                    <div className="h-1/3 w-1 bg-slate-500 rounded-full"></div>
                </div>

                <div className="w-full h-64 md:h-80 overflow-x-auto custom-scrollbar overflow-y-visible pb-2 pt-1 pl-4">
                    <div className="flex h-full gap-2 relative z-20" style={{ minWidth: maxCapa > 10 ? '600px' : '100%' }}>
                        
                        {currentPallets > 0 && (
                            <div 
                                className="grid grid-rows-2 grid-flow-col gap-1.5 h-full transition-all duration-300"
                                style={{ width: `${filledPct}%`, gridTemplateColumns: `repeat(${currentCols}, minmax(0, 1fr))` }}
                            >
                                {palletList.map((pallet, idx) => {
                                    const isMixed = pallet.items.length > 1;
                                    const primaryItem = pallet.items[0];
                                    const mainItemName = primaryItem?.item_master?.item_name || '알 수 없음';
                                    const itemType = primaryItem?.item_master?.item_type;
                                    const isRawMaterial = itemType === '원자재' || itemType === '원료';

                                    const displayItemName = isMixed ? `${mainItemName} 외 ${pallet.items.length - 1}` : mainItemName;
                                    
                                    let colorClass = "bg-blue-800/60 border-blue-400 text-blue-100"; 
                                    if (pallet.isLegacy) {
                                        colorClass = "bg-slate-700/60 border-slate-500 text-slate-300"; 
                                    } else if (isMixed) {
                                        colorClass = "bg-emerald-900/80 border-emerald-500 text-emerald-200"; 
                                    } else if (isRawMaterial) {
                                        colorClass = "bg-lime-700/80 border-lime-400 text-lime-100"; 
                                    }
                                    
                                    const colIdx = Math.floor(idx / 2); 
                                    const isTopRow = idx % 2 === 0; 
                                    
                                    let tooltipX = "left-1/2 -translate-x-1/2"; 
                                    if (colIdx === 0) tooltipX = "left-0 translate-x-0"; 
                                    else if (colIdx === currentCols - 1 && currentCols > 3) tooltipX = "right-0 translate-x-0"; 
                                    const tooltipY = isTopRow ? "top-full mt-2" : "bottom-full mb-2"; 

                                    const isShowActions = selectedPallet?.pallet_id === pallet.pallet_id;

                                    // PC 전용 툴팁 렌더링
                                    const PCTooltipContent = (
                                        <>
                                            <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 bg-slate-800/30 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                                                {pallet.isLegacy ? (
                                                    <><AlertCircle size={12} className="text-amber-500"/><span className="text-amber-400">ID 미지정 (구재고)</span></>
                                                ) : (
                                                    <><Package size={12} className="text-cyan-400"/><span className="text-cyan-300">LPN: {pallet.pallet_id}</span></>
                                                )}
                                            </div>
                                            
                                            <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 max-h-40 overflow-y-auto custom-scrollbar">
                                                {pallet.items.map((it: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-xs text-slate-300 py-1">
                                                        <span className="truncate pr-2">{it.item_master?.item_name || 'Unknown'}</span>
                                                        <span className="font-bold text-white whitespace-nowrap">{it.quantity} {it.item_master?.uom || 'kg'}</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 pt-2 border-t border-slate-700 text-right font-bold text-cyan-400 text-sm">
                                                    총합: {pallet.totalQty.toLocaleString()} kg
                                                </div>
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedPallet(null); onInventoryClick(locId); }}
                                                className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-blue-600 transition flex items-center gap-2"
                                            >
                                                <ArrowRight size={16} className="text-blue-400" /> 상세 정보 및 출고
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setSelectedPallet(null);
                                                    window.location.href = `/inbound/direct?loc=${locId}${pallet.isLegacy ? '' : `&pallet=${pallet.pallet_id}`}`; 
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition flex items-center gap-2 border-t border-slate-800"
                                            >
                                                <Plus size={16} className="text-emerald-400" /> 이 파렛트에 혼적 입고
                                            </button>
                                        </>
                                    );

                                    return (
                                        <div 
                                            key={pallet.pallet_id} 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                // 🚀 팝업 토글 로직: 이미 선택된 팔레트면 끄고, 아니면 켠다.
                                                setSelectedPallet(isShowActions ? null : pallet); 
                                            }}
                                            className={`
                                                ${colorClass} border-t-4 border-r-4 border-l-[1px] border-white/20 rounded-sm shadow-md
                                                flex flex-col items-center justify-center p-1.5 cursor-pointer
                                                hover:brightness-110 transition-transform duration-200 group relative
                                                ${isShowActions ? 'z-[60] scale-105 brightness-110 ring-2 ring-white/50' : 'z-10 hover:-translate-y-1'}
                                            `}
                                        >
                                            {/* 팔레트 내부 텍스트 */}
                                            <span className="text-[10px] md:text-[11px] font-bold truncate w-full text-center leading-tight px-0.5 mt-1">
                                                {displayItemName}
                                            </span>
                                            <span className="font-black text-sm md:text-lg drop-shadow-md tracking-tighter shrink-0 leading-none mt-1 mb-1">
                                                {pallet.totalQty.toLocaleString()}<span className="text-[8px] font-normal opacity-70 ml-0.5">kg</span>
                                            </span>
                                            
                                            {/* 💻 PC 환경 전용 툴팁 */}
                                            {isShowActions && (
                                                <>
                                                    {/* PC용 투명 백드롭 */}
                                                    <div 
                                                        className="hidden md:block fixed inset-0 z-[90] cursor-default" 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedPallet(null); }} 
                                                    />
                                                    
                                                    <div 
                                                        className={`hidden md:flex absolute ${tooltipX} ${tooltipY} w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] flex-col overflow-hidden animate-fade-in cursor-default`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {PCTooltipContent}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!overCapa && currentPallets < maxCapa && (
                            <div 
                                style={{ width: `${emptyPct}%` }}
                                onClick={() => onEmptyClick(locId)}
                                className="h-full bg-slate-800/40 border-2 border-dashed border-slate-600 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-cyan-500/50 transition-all group"
                            >
                                <Plus size={32} className="text-slate-500 group-hover:text-cyan-400 transition-colors mb-2" />
                                <span className="text-slate-500 group-hover:text-cyan-400 text-xs md:text-sm font-bold transition-colors text-center px-2">파렛트 생성 및 입고</span>
                                <span className="text-slate-600 font-mono text-[10px] md:text-xs mt-1">{maxCapa - currentPallets} PLT 추가 가능</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative z-0 flex justify-between px-16 mt-1 opacity-80">
                <div className="w-16 h-4 bg-slate-700 rounded-b-lg shadow-lg"></div>
                <div className="w-16 h-4 bg-slate-700 rounded-b-lg shadow-lg"></div>
            </div>
        </div>

        {/* ========================================== */}
        {/* 📱 모바일 전용 바텀 시트 (화면 최상단 레벨에 위치) */}
        {/* ========================================== */}
        {selectedPallet && (
            <div className="md:hidden">
                {/* 반투명 검은색 배경 (클릭 시 닫힘) */}
                <div 
                    className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => { e.stopPropagation(); setSelectedPallet(null); }}
                />
                
                {/* 밑에서 올라오는 카드 */}
                <div 
                    className="fixed inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[160] animate-fade-in-up px-5 pt-5 pb-24 flex flex-col gap-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 상단 헤더 및 닫기 버튼 */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <div className="font-bold text-lg text-white flex items-center gap-2">
                                {selectedPallet.isLegacy ? (
                                    <><AlertCircle size={18} className="text-amber-500"/><span className="text-amber-400">ID 미지정 (구재고)</span></>
                                ) : (
                                    <><Package size={18} className="text-cyan-400"/><span className="text-cyan-300">LPN: {selectedPallet.pallet_id}</span></>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 pl-7">총 중량: <span className="text-white font-bold">{selectedPallet.totalQty.toLocaleString()} kg</span></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedPallet(null); }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition shrink-0">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 모바일 팝업 내부 품목 리스트 */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-0 mb-2 shadow-inner max-h-[30vh] overflow-y-auto custom-scrollbar">
                        {selectedPallet.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex flex-col py-2 border-b border-slate-800/50 last:border-0 gap-1.5">
                                <div className="flex justify-between items-start text-sm">
                                    <span className="text-slate-300 truncate pr-2 flex-1 leading-snug">{it.item_master?.item_name || 'Unknown'}</span>
                                    <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700 shrink-0 mt-0.5">
                                        {it.quantity.toLocaleString()} {it.item_master?.uom || 'kg'}
                                    </span>
                                </div>
                                {/* 🚀 [추가] LOT 및 유통기한 정보 */}
                                <div className="flex items-center gap-2 text-[10px]">
                                    {it.lot_no && it.lot_no !== 'DEFAULT' ? (
                                        <span className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">LOT: {it.lot_no}</span>
                                    ) : (
                                        <span className="text-slate-600 px-1 text-[9px]">LOT 미지정</span>
                                    )}
                                    {it.exp_date && <span className="text-slate-500">EXP: {it.exp_date}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 액션 버튼들 */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPallet(null); onInventoryClick(locId); }}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-base transition active:scale-95"
                    >
                        <ArrowRight size={18} /> 상세 정보 및 출고
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedPallet(null);
                            window.location.href = `/inbound/direct?loc=${locId}${selectedPallet.isLegacy ? '' : `&pallet=${selectedPallet.pallet_id}`}`; 
                        }}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-base transition active:scale-95"
                    >
                        <Plus size={18} /> 이 파렛트에 혼적 입고
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}