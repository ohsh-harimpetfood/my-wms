"use client";

import { useState } from "react";
import { ArrowLeft, QrCode, RefreshCw, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import QRScannerModal from "@/components/QRScannerModal"; // 🚀 작동이 확인된 기존 컴포넌트 불러오기!

export default function QrTestPage() {
  const router = useRouter();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // 스캔 완료 시 실행
  const handleScan = (code: string) => {
    setScannedData(code);
    setShowScanner(false); // 스캐너 모달 닫기
  };

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] flex justify-center pb-24">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 pt-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <ArrowLeft />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            <QrCode /> QR 데이터 분석기
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          {!scannedData ? (
             <div className="text-center py-10 flex flex-col items-center gap-4">
                 <div className="bg-slate-800 p-4 rounded-full text-slate-400">
                    <Camera size={48} />
                 </div>
                 <p className="text-slate-400 text-sm">
                    작동이 확인된 스캐너를 사용하여<br/>
                    실제 QR 데이터(Raw Data)를 확인합니다.
                 </p>
                 <button 
                    onClick={() => setShowScanner(true)}
                    className="mt-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-lg"
                 >
                    스캐너 열기
                 </button>
             </div>
          ) : (
            // 결과 화면
            <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-5 animate-fade-in-up">
              <h2 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                ✅ 스캔 성공! (Raw Data)
              </h2>
              <div className="bg-black/50 p-4 rounded-lg text-white font-mono text-xl break-all shadow-inner border border-slate-800">
                {/* 🚀 이 부분에 찍힌 데이터가 그대로 노출됩니다 */}
                {scannedData}
              </div>
              <button 
                onClick={() => setScannedData(null)}
                className="mt-6 w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw size={18} /> 다시 스캔하기
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 🚀 작동 확인된 스캐너 모달 띄우기 */}
      {showScanner && (
        <QRScannerModal 
            onClose={() => setShowScanner(false)} 
            onScan={handleScan} 
        />
      )}
    </div>
  );
}