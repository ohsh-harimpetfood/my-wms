"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, KeyboardEvent } from "react";

export default function HistoryFilterBar({ initialKeyword }: { initialKeyword: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [keyword, setKeyword] = useState(initialKeyword);

  // 🚀 검색 실행 함수 (버튼 클릭 or 엔터 키)
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (keyword.trim()) {
        params.set("keyword", keyword.trim());
    } else {
        params.delete("keyword");
    }
    params.set("page", "1"); // 검색 시 1페이지로 리셋

    // scroll: false로 스크롤 튀는 현상 방지
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 🚀 엔터 키 입력 시 검색 실행
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
  };

  const handleClear = () => {
      setKeyword("");
      // X 버튼 누르면 즉시 초기화 검색 할지, 아니면 텍스트만 지울지 선택
      // 여기서는 텍스트만 지우고 사용자가 다시 조회 버튼 누르게 하거나, 
      // 편의상 바로 전체 목록 보여주게 할 수 있음. (바로 전체 목록 조회 추천)
      const params = new URLSearchParams(searchParams.toString());
      params.delete("keyword");
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex gap-2 w-full max-w-lg">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown} // 엔터 키 처리
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="결과 내 검색 (품목, 위치, 작업자...)"
            />
            {keyword && (
                <button 
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            )}
        </div>
        
        {/* 🚀 [추가] 조회 버튼 */}
        <button 
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition whitespace-nowrap"
        >
            조회
        </button>
    </div>
  );
}