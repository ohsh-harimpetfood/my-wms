"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, FileText, Filter, Search, X, Calendar, LogIn, LogOut, RefreshCw, MapPin, User, MoreHorizontal, Loader2, Package } from "lucide-react";
import { TX_TYPES, TxCode } from "@/constants/transaction";
import PaginationControls from "@/components/PaginationControls";
import { formatToKST } from "@/utils/format";
import { createClient } from "@/utils/supabase/client"; 

interface Transaction {
  id: number;
  transaction_date: string;
  transaction_type: string;
  io_type: string;
  tx_code: string;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  remark: string;
  item_master: {
    item_name: string;
    uom: string;
  } | null;
  profiles: {
    user_name: string;
    department: string;
  } | null;
}

// 🚀 [신규] 검색 후보군 타입 정의
interface SearchCandidate {
    id: string;        // 구분용 키 (item_key or location)
    text: string;      // 화면 표시 텍스트
    subText?: string;  // 보조 텍스트 (코드 등)
    type: 'ITEM' | 'LOC'; // 타입
}

interface Props {
  initialHistory: Transaction[];
  totalCount: number;
  params: { [key: string]: string | string[] | undefined };
}

export default function HistoryListClient({ initialHistory, totalCount, params }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 1️⃣ [상태 관리]
  const [typeFilter, setTypeFilter] = useState(params.txType?.toString() || "ALL");
  const [localKeyword, setLocalKeyword] = useState(params.keyword?.toString() || "");

  // 🚀 [스마트 검색] 상태
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]); // 전체 마스터 데이터 (메모리 로드)
  const [suggestions, setSuggestions] = useState<SearchCandidate[]>([]); // 필터링된 추천 목록
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMasterLoaded, setIsMasterLoaded] = useState(false); // 마스터 데이터 로드 여부
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 2️⃣ [초기화] 마스터 데이터 전체 로드 (Chunking 없이 한 번에 가져오되, 필요한 컬럼만!)
  // 이 방식이 Outbound 검색기처럼 "모든 DB"를 커버하는 핵심입니다.
  useEffect(() => {
    const loadMasterData = async () => {
        if (isMasterLoaded) return;

        try {
            // A. 품목 마스터 로드 (Active한 것만)
            const { data: items } = await supabase
                .from('item_master')
                .select('item_key, item_name')
                .eq('active_flag', 'Y');

            // B. 위치 마스터 로드 (혹은 stock_tx에서 유니크하게 뽑거나)
            // 여기서는 loc_master가 있다고 가정하고 가져옵니다. (없으면 생략 가능)
            const { data: locs } = await supabase
                .from('loc_master')
                .select('loc_id')
                .eq('active_flag', 'Y');

            const allCandidates: SearchCandidate[] = [];

            // 품목 변환
            items?.forEach(i => {
                allCandidates.push({
                    id: i.item_key,
                    text: i.item_name,
                    subText: i.item_key,
                    type: 'ITEM'
                });
            });

            // 위치 변환
            locs?.forEach(l => {
                allCandidates.push({
                    id: l.loc_id,
                    text: l.loc_id, // 위치는 코드 자체가 텍스트
                    type: 'LOC'
                });
            });

            setCandidates(allCandidates);
            setIsMasterLoaded(true);

        } catch (e) {
            console.error("Master Data Load Failed", e);
        }
    };
    loadMasterData();
  }, []);

  // 3️⃣ [스마트 검색 로직] AND 조건 + 띄어쓰기 무시
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalKeyword(val);

    if (!val.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    // 🚀 [핵심 알고리즘] 검색어를 공백으로 쪼개서 "모두" 포함하는지 확인 (AND 조건)
    const terms = val.toLowerCase().split(/\s+/).filter(Boolean); // ["완두", "70"]

    const matched = candidates.filter(cand => {
        const targetText = `${cand.text} ${cand.subText || ''}`.toLowerCase();
        // 모든 단어가 포함되어야 함 (AND Logic)
        return terms.every(term => targetText.includes(term));
    }).slice(0, 10); // 성능을 위해 상위 10개만 표시

    setSuggestions(matched);
    setShowSuggestions(true);
  };

  // 4️⃣ https://www.wordhippo.com/what-is/the-meaning-of/korean-word-4f72dd68a6b9dbb556794ea1b973edf4068599dd.html
  const updateQueryParams = (newType: string, newKeyword: string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    if (newType && newType !== "ALL") currentParams.set("txType", newType);
    else currentParams.delete("txType");

    if (newKeyword.trim()) currentParams.set("keyword", newKeyword.trim());
    else currentParams.delete("keyword");

    currentParams.set("page", "1");
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (cand: SearchCandidate) => {
    // 클릭 시, 품목명(text)이나 코드(id) 중 검색에 유리한 값을 넣음
    // 여기서는 사용자가 보기 편한 'text'를 넣고 검색
    setLocalKeyword(cand.text);
    updateQueryParams(typeFilter, cand.text);
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateQueryParams(typeFilter, localKeyword);
      setShowSuggestions(false);
    }
  };

  const handleKeywordClear = () => {
    setLocalKeyword("");
    setSuggestions([]);
    setShowSuggestions(false);
    updateQueryParams(typeFilter, "");
  };

  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    updateQueryParams(newType, localKeyword);
  };

  // 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayList = initialHistory; 

  return (
    <div className="space-y-6 animate-fade-in pb-32 p-4 md:p-8 bg-black min-h-screen text-white">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
            <FileText className="text-yellow-500" size={32} />
            <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">조회 결과 (Result)</h1>
            <p className="text-gray-400 text-xs md:text-sm">
               {(typeFilter !== 'ALL' || localKeyword) ? (
                   <>필터링: <span className="text-white font-bold">{totalCount.toLocaleString()}</span> 건 검색됨</>
                ) : (
                   <>총 <span className="text-white font-bold">{totalCount.toLocaleString()}</span> 건</>
                )}
            </p>
            </div>
        </div>
        <Link 
            href="/history" 
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 w-full md:w-auto justify-center"
        >
            <ArrowLeft size={16} /> 조건 변경 (Back)
        </Link>
      </div>

      {/* 🔹 필터바 영역 */}
      <div className="w-full sticky top-0 z-20 bg-black/95 backdrop-blur pt-2 pb-4 -mt-2 border-b border-gray-800/50">
         <div className="flex flex-col md:flex-row gap-2 max-w-4xl">
            
            {/* 구분 필터 */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full md:w-40 bg-gray-900 border border-gray-700 text-white rounded-lg pl-3 pr-8 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer font-bold h-12"
              >
                <option value="ALL">전체 구분</option>
                <option value="INBOUND">입고 (In)</option>
                <option value="OUTBOUND">출고 (Out)</option>
                <option value="MOVE">이동 (Move)</option>
                <option value="ADJUST">조정 (Adjust)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <Filter size={14} />
              </div>
            </div>

            {/* 🚀 [업그레이드] 스마트 검색어 입력 */}
            <div className="relative flex-1 group" ref={containerRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              
              <input 
                type="text" 
                placeholder={isMasterLoaded ? "스마트 검색 (품목명 + 70 + A01)" : "데이터 로딩 중..."}
                value={localKeyword}
                onChange={handleInputChange} 
                onKeyDown={handleKeywordKeyDown}
                autoComplete="off"
                disabled={!isMasterLoaded} // 데이터 로드 전까지 입력 방지
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 h-12 disabled:opacity-50"
              />
              
              {!isMasterLoaded && (
                 <div className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-500">
                    <Loader2 size={16} className="animate-spin"/>
                 </div>
              )}

              {localKeyword && (
                <button onClick={handleKeywordClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1">
                  <X size={16} />
                </button>
              )}

              {/* 🚀 [스마트 추천 목록 UI] */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-up max-h-80 overflow-y-auto custom-scrollbar">
                    <ul className="divide-y divide-gray-800">
                        {suggestions.map((cand) => (
                            <li 
                                key={cand.id}
                                onClick={() => handleSuggestionClick(cand)}
                                className="px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer transition-colors flex items-center gap-3"
                            >
                                {/* 아이콘으로 타입 구분 */}
                                {cand.type === 'ITEM' ? (
                                    <Package size={16} className="text-blue-500 shrink-0" />
                                ) : (
                                    <MapPin size={16} className="text-green-500 shrink-0" />
                                )}
                                
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{cand.text}</span>
                                    {cand.subText && <span className="text-xs text-gray-500">{cand.subText}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => updateQueryParams(typeFilter, localKeyword)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm h-12 w-16 flex items-center justify-center"
            >
              조회
            </button>
         </div>
      </div>

      {/* 🖥️ 테이블 영역 */}
      <div className="hidden md:block border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
                    <tr>
                        <th className="px-6 py-4">일시</th>
                        <th className="px-6 py-4">구분 (Type)</th>
                        <th className="px-6 py-4">위치</th>
                        <th className="px-6 py-4">품목명 (코드)</th>
                        <th className="px-6 py-4 text-right">수량</th>
                        <th className="px-6 py-4">비고 / 작업자</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {displayList.map((tx) => (
                        <DesktopRow key={tx.id} tx={tx} />
                    ))}
                    {displayList.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                           검색 조건에 맞는 데이터가 없습니다.
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {displayList.map((tx) => (
            <MobileCard key={tx.id} tx={tx} />
        ))}
        {displayList.length === 0 && (
           <div className="py-20 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-900 text-sm">
             검색 조건에 맞는 데이터가 없습니다.
           </div>
        )}
      </div>

      <PaginationControls totalCount={totalCount} pageSize={20} />
      
    </div>
  );
}

// ----------------------------------------------------------------------
// 🧩 하위 컴포넌트 (변경 없음)
// ----------------------------------------------------------------------
const getTxBadge = (txCode: string, ioType: string) => {
    const typeInfo = TX_TYPES[txCode as TxCode];
    if (typeInfo) {
        const colorClass = {
            blue: "bg-blue-900/30 text-blue-400 border-blue-800",
            green: "bg-green-900/30 text-green-400 border-green-800",
            red: "bg-red-900/30 text-red-400 border-red-800",
            orange: "bg-orange-900/30 text-orange-400 border-orange-800",
            purple: "bg-purple-900/30 text-purple-400 border-purple-800",
            yellow: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
            gray: "bg-gray-800 text-gray-400 border-gray-700",
            zinc: "bg-zinc-800 text-zinc-400 border-zinc-700",
            indigo: "bg-indigo-900/30 text-indigo-400 border-indigo-800",
        }[typeInfo.color] || "bg-gray-800 text-gray-400 border-gray-700";

        return (
            <span className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${colorClass}`}>
                {ioType === 'IN' ? <LogIn size={12}/> : ioType === 'OUT' ? <LogOut size={12}/> : <RefreshCw size={12}/>}
                {typeInfo.label}
            </span>
        );
    }
    const isPlus = ioType === 'IN';
    return (
      <span className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${
          isPlus ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-red-900/30 text-red-400 border-red-800"
      }`}>
          {isPlus ? <LogIn size={12}/> : <LogOut size={12}/>}
          {txCode || (isPlus ? "입고" : "출고")}
      </span>
    );
};

const DesktopRow = ({ tx }: { tx: Transaction }) => {
    return (
        <tr className="bg-gray-900 hover:bg-gray-800 transition-colors">
            <td className="px-6 py-4 font-mono text-gray-300 whitespace-nowrap">{formatToKST(tx.transaction_date)}</td>
            <td className="px-6 py-4">
                {getTxBadge(tx.tx_code, tx.io_type)}
                <div className="text-[10px] text-gray-600 mt-1 uppercase pl-1 font-mono">{tx.tx_code || tx.transaction_type}</div>
            </td>
            <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-gray-300 font-bold border border-gray-700 text-xs">{tx.location_code}</span></td>
            <td className="px-6 py-4">
                <div className="font-bold text-white text-base">{tx.item_master?.item_name || '삭제된 품목'}</div>
                <div className="text-xs text-gray-500 flex gap-2 mt-0.5"><span>{tx.item_key}</span>{tx.lot_no && tx.lot_no !== 'DEFAULT' && <span className="text-gray-400">LOT: {tx.lot_no}</span>}</div>
            </td>
            <td className={`px-6 py-4 text-right font-bold text-base ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                <span className="text-xs text-gray-600 ml-1 font-normal">{tx.item_master?.uom || "EA"}</span>
            </td>
            <td className="px-6 py-4 text-gray-400 max-w-xs text-xs">
                <div className="truncate mb-1" title={tx.remark}>{tx.remark || '-'}</div>
                {tx.profiles && (
                    <div className="flex items-center gap-1 text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded w-fit">
                        <User size={10} />
                        <span>{tx.profiles.user_name}</span>
                    </div>
                )}
            </td>
        </tr>
    );
};

const MobileCard = ({ tx }: { tx: Transaction }) => {
    return (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.quantity > 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
            <div className="pl-2">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Calendar size={11} className="text-gray-600"/> 
                        {formatToKST(tx.transaction_date)}
                    </div>
                    {getTxBadge(tx.tx_code, tx.io_type)}
                </div>

                <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white leading-tight mb-1 truncate">
                            {tx.item_master?.item_name || '미상 품목'}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-xs">
                            <span className="text-gray-500 font-mono">{tx.item_key}</span>
                            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 border border-gray-700 flex items-center gap-1 text-[11px]">
                                <MapPin size={9}/> {tx.location_code}
                            </span>
                            {tx.lot_no && tx.lot_no !== 'DEFAULT' && (
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700 text-[11px]">
                                    LOT: {tx.lot_no}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className={`text-lg font-bold whitespace-nowrap text-right ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                        <div className="text-[10px] text-gray-600 font-normal">{tx.item_master?.uom || "EA"}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                    <div className="text-xs text-gray-400 flex items-center gap-1 truncate flex-1 pr-2">
                        <MoreHorizontal size={12} className="text-gray-600"/>
                        <span className="truncate">{tx.remark || '-'}</span>
                    </div>
                    {tx.profiles && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                            <User size={10} /> {tx.profiles.user_name}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};