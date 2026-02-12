"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Scanner } from '@yudiel/react-qr-scanner';

interface Props {
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function QRScannerModal({ onClose, onScan }: Props) {
  // 모바일 브라우저 주소창 등에 가려지는 문제를 방지하기 위해 
  // 실제 마운트 후 렌더링하도록 처리
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      
      {/* 헤더 (닫기 버튼) */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-bold text-lg">QR 코드 스캔</h2>
        <button 
          onClick={onClose} 
          className="bg-gray-800/50 p-2 rounded-full text-white hover:bg-gray-700 backdrop-blur-sm"
        >
          <X size={24} />
        </button>
      </div>

      {/* 카메라 영역 */}
      <div className="flex-1 flex items-center justify-center relative bg-black">
        <div className="w-full max-w-md aspect-square relative overflow-hidden rounded-2xl border-2 border-gray-800 mx-4">
            
            {/* @yudiel/react-qr-scanner 사용 
                - onScan: 스캔 성공 시 (배열로 들어옴)
                - components: UI 옵션 제어 (audio 제거됨)
                - styles: 컨테이너 스타일
            */}
            <Scanner 
                onScan={(result) => {
                    if (result && result.length > 0) {
                        // 첫 번째 인식된 결과의 rawValue를 전달
                        onScan(result[0].rawValue);
                    }
                }}
                onError={(error) => {
                    console.log(error); // 에러 로그 (사용자에게 노출 X)
                }}
                components={{
                    finder: false // 라이브러리 기본 가이드 라인 끄기
                }}
                styles={{
                    container: { width: '100%', height: '100%' },
                    video: { objectFit: 'cover' }
                }}
            />
            
            {/* 커스텀 스캔 가이드 라인 (파란색 사각형) */}
            <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
                <div className="w-full h-full border-2 border-blue-500/80 relative rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* 모서리 강조 */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-[2px] -ml-[2px]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-[2px] -mr-[2px]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-[2px] -ml-[2px]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-[2px] -mr-[2px]"></div>
                    
                    {/* 스캔 중 애니메이션 바 */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                </div>
            </div>
        </div>
      </div>

      {/* 하단 안내 문구 */}
      <div className="p-8 text-center text-gray-400 bg-black pb-16">
        <p className="text-lg font-bold text-white mb-1">QR 코드를 스캔하세요</p>
        <p className="text-sm">Location 바코드를 사각형 안에 맞춰주세요.</p>
      </div>
    </div>
  );
}