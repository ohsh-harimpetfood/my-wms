"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  CornerDownLeft 
} from "lucide-react";

interface PaginationControlsProps {
  totalCount: number;      
  pageSize?: number;       
  siblingCount?: number;   
}

export default function PaginationControls({
  totalCount,
  pageSize = 20, // 기본값 20으로 변경 (앞선 페이지 설정과 통일)
  siblingCount = 1,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. 계산 로직
  const currentPage = Number(searchParams.get("page") ?? "1");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize)); // 최소 1페이지 보장

  // 2. Go to 입력 state
  const [inputPage, setInputPage] = useState(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // 3. URL 생성 (기존 파라미터 유지)
  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `?${params.toString()}`;
  };

  // 4. 페이지 이동
  const moveToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(createPageUrl(page), { scroll: false });
  };

  // 5. 입력창 엔터 처리
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = Number(inputPage);
    if (targetPage >= 1 && targetPage <= totalPages) {
      moveToPage(targetPage);
    } else {
      setInputPage(String(currentPage)); // 범위 벗어나면 원복
    }
  };

  // 6. 페이지 범위 생성 알고리즘
  const generatePagination = () => {
    // 페이지가 적으면 전체 다 보여줌
    if (totalPages <= 5 + siblingCount * 2) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 2;

    if (!showLeftDots && showRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      return [...range(1, leftItemCount), "...", totalPages];
    }

    if (showLeftDots && !showRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      return [1, "...", ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    if (showLeftDots && showRightDots) {
      return [1, "...", ...range(leftSiblingIndex, rightSiblingIndex), "...", totalPages];
    }
    return [];
  };

  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, idx) => idx + start);
  };

  const paginationRange = generatePagination();

  // 데이터가 아예 없으면 렌더링 안 함 (또는 "데이터 없음" 표시를 원하면 수정 가능)
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 p-4 bg-[#0a0a0a] border-t border-gray-800 rounded-b-lg animate-fade-in">
      
      {/* 🟢 [왼쪽] 정보 표시 & 직접 이동 (모바일에서는 아래로 내려감) */}
      <div className="flex items-center gap-4 text-xs md:text-sm text-gray-400 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
            <span className="bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-700 font-mono">
                Total {totalCount.toLocaleString()}
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-white font-bold">Page {currentPage}</span> <span className="text-gray-600">/</span> {totalPages}
        </div>
        
        {/* 페이지가 1개뿐이면 이동 폼 숨김 */}
        {totalPages > 1 && (
            <form onSubmit={handleInputSubmit} className="flex items-center gap-2 ml-4">
                <input 
                    type="number"
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    className="w-12 bg-gray-900 border border-gray-700 text-white text-center text-xs rounded focus:outline-none focus:border-blue-500 py-1 transition-colors"
                    min={1}
                    max={totalPages}
                />
                <button 
                    type="submit"
                    className="bg-gray-800 text-gray-400 p-1 rounded border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
                    title="이동"
                >
                    <CornerDownLeft size={14} />
                </button>
            </form>
        )}
      </div>

      {/* 🟢 [오른쪽] 컨트롤 버튼들 (페이지가 1개면 숨김) */}
      {totalPages > 1 && (
          <div className="flex items-center gap-1.5 select-none">
            {/* << 10페이지 뒤로 (모바일 숨김) */}
            <button
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              disabled={currentPage <= 1}
              onClick={() => moveToPage(currentPage - 10)}
              title="-10 페이지"
            >
              <ChevronsLeft size={16} />
            </button>

            {/* < 이전 */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              disabled={currentPage <= 1}
              onClick={() => moveToPage(currentPage - 1)}
              title="이전 페이지"
            >
              <ChevronLeft size={16} />
            </button>

            {/* 숫자 버튼들 */}
            <div className="flex items-center gap-1 mx-1">
              {paginationRange.map((page, index) => {
                if (page === "...") {
                  return <span key={index} className="px-1 text-gray-600 text-xs">•••</span>;
                }
                return (
                  <button
                    key={index}
                    onClick={() => moveToPage(Number(page))}
                    className={`min-w-[32px] h-[32px] flex items-center justify-center text-sm rounded-lg border transition-all font-medium
                      ${page === currentPage 
                        ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                        : "bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white hover:border-gray-600"
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* > 다음 */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              disabled={currentPage >= totalPages}
              onClick={() => moveToPage(currentPage + 1)}
              title="다음 페이지"
            >
              <ChevronRight size={16} />
            </button>

            {/* >> 10페이지 앞으로 (모바일 숨김) */}
            <button
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              disabled={currentPage >= totalPages}
              onClick={() => moveToPage(currentPage + 10)}
              title="+10 페이지"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
      )}
    </div>
  );
}