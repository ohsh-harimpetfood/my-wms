"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import ExcelJS from "exceljs";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

export default function UploadTemplateButton() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { user } = useAuth();
  const { toast, alert: uiAlert } = useUI();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // 1. 기존 DB의 품목 코드를 모두 가져와서 '신규(NEW)'인지 '수정(UPDATE)'인지 판별할 준비
      const { data: existingItems } = await supabase.from('item_master').select('item_key');
      const existingKeys = new Set(existingItems?.map(i => i.item_key) || []);

      // 2. 엑셀 파일 파싱 (exceljs 활용)
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) throw new Error("엑셀 시트를 찾을 수 없습니다.");

      const payload: any[] = [];
      let hasError = false;

      // 3. 행(Row) 단위로 순회하며 데이터 추출 및 유효성 검사 (1행: 헤더, 2행: 예시이므로 3행부터 시작)
      worksheet.eachRow((row, rowNumber) => {
        // 🚀 [수정 POINT 1] 이제 1행(헤더)만 건너뜁니다! 2행부터 정상적으로 읽습니다.
        if (rowNumber === 1) return; 
        if (hasError) return;

        const item_key = row.getCell(1).text?.trim();
        const item_name = row.getCell(2).text?.trim();
        
        // 완전히 비어있는 행은 무시
        if (!item_key && !item_name) return;

        // 🚀 [수정 POINT 2] 만약 템플릿의 예시 데이터를 안 지우고 그대로 뒀다면 그 행만 살짝 무시합니다.
        if (item_key === "DUMMY-CAP-01" && item_name === "퍼프 바나나 캡 (예시)") return;

        // 🚨 방어 로직 1: 필수값 누락 검사
        if (!item_key || !item_name) {
          uiAlert(`[${rowNumber}행] 품목코드와 품목명은 필수 입력값입니다.`, "error");
          hasError = true;
          return;
        }

        // 🚨 방어 로직 2: 기존 데이터 여부에 따라 상태 태깅
        const request_type = existingKeys.has(item_key) ? 'UPDATE' : 'NEW';

        payload.push({
          item_key,
          item_name,
          uom: row.getCell(3).text?.trim() || 'EA', 
          item_type: row.getCell(4).text?.trim() || '',
          lot_required: row.getCell(5).text?.trim().toUpperCase() === 'Y' ? 'Y' : 'N',
          active_flag: row.getCell(6).text?.trim().toUpperCase() === 'N' ? 'N' : 'Y',
          use_team: row.getCell(7).text?.trim() || '',
          shelf_life_days: Number(row.getCell(8).value) || 0,
          unit_cost: Number(row.getCell(9).value) || 0,
          barcode: row.getCell(10).text?.trim() || '',
          erp_item_code: row.getCell(11).text?.trim() || '',
          erp_flag: row.getCell(12).text?.trim().toUpperCase() === 'Y' ? 'Y' : 'N',
          remark: row.getCell(13).text?.trim() || '',
          request_type,         
          status: 'PENDING',    
          requested_by: user.id 
        });
      });

      if (hasError) return; // 유효성 검사 실패 시 업로드 중단
      if (payload.length === 0) {
         uiAlert("업로드할 유효한 데이터가 없습니다.", "warning");
         return;
      }

      // 🚨 방어 로직 3: 중복 결재 요청 방지 
      // (같은 품목 코드로 이미 올라온 '대기중' 요청이 있다면 깔끔하게 지우고 새 엑셀 데이터로 덮어쓰기)
      const keysToUpload = payload.map(p => p.item_key);
      await supabase.from('item_master_staging')
        .delete()
        .eq('status', 'PENDING')
        .in('item_key', keysToUpload);
      
      // 4. Staging 테이블에 최종 업로드
      const { error } = await supabase.from('item_master_staging').insert(payload);
      if (error) throw error;

      toast.success(`성공적으로 ${payload.length}건의 승인 요청이 전송되었습니다.`);
    } catch (error: any) {
      console.error("Upload error:", error);
      uiAlert(error.message || "업로드 중 오류가 발생했습니다.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // 파일 인풋 초기화 (같은 파일 다시 올릴 수 있게)
    }
  };

  return (
    <div>
      {/* 실제 파일 업로드 인풋은 숨겨둠 */}
      <input 
        type="file" 
        accept=".xlsx" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-sm whitespace-nowrap disabled:opacity-50"
      >
        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {isUploading ? "파일 읽는 중..." : "엑셀 업로드 (.xlsx)"}
      </button>
    </div>
  );
}