// components/SearchInput.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 초기값 세팅
  const initialSearch = searchParams.get("query") || "";
  const [term, setTerm] = useState(initialSearch);

  useEffect(() => {
    // 디바운스 (타이핑 멈추면 실행)
    const timer = setTimeout(() => {
      // 현재 URL에 있는 검색어 가져오기
      const currentQuery = searchParams.get("query") || "";

      // 🚨 [핵심 해결 코드] 
      // 현재 입력된 값(term)과 URL의 값(currentQuery)이 똑같다면?
      // -> 사용자가 검색어를 건드린 게 아니라, 단순히 '페이지 버튼'을 누른 것입니다.
      // -> 그러므로 URL을 업데이트하거나 페이지를 1로 리셋하지 말고 여기서 끝냅니다.
      if (term === currentQuery) {
        return; 
      }

      // 검색어가 실제로 다를 때만 아래 로직 실행 (URL 업데이트)
      const params = new URLSearchParams(searchParams.toString());
      
      if (term) {
        params.set("query", term);
      } else {
        params.delete("query");
      }
      
      // 검색어를 '새로 입력했을 때만' 1페이지로 이동
      params.set("page", "1");
      
      router.push(`?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [term, router, searchParams]);

  return (
    <div className="relative w-full md:w-80">
      <input
        type="text"
        placeholder="검색 (제품명, SKU, 위치)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
      />
    </div>
  );
}