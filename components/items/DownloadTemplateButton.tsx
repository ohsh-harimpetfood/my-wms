"use client";

import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function DownloadTemplateButton() {
  const handleDownload = async () => {
    // 1. 워크북 및 워크시트 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("품목 업로드 양식");

    // 2. 컬럼 정의 (너비 지정)
    worksheet.columns = [
      { header: "품목코드*", key: "item_key", width: 20 },
      { header: "품목명*", key: "item_name", width: 30 },
      { header: "단위*", key: "uom", width: 10 },
      { header: "품목유형", key: "item_type", width: 15 },
      { header: "LOT관리(Y/N)", key: "lot_required", width: 15 },
      { header: "사용상태(Y/N)", key: "active_flag", width: 15 },
      { header: "사용팀", key: "use_team", width: 15 },
      { header: "유통기한_일", key: "shelf_life_days", width: 15 },
      { header: "단가", key: "unit_cost", width: 15 },
      { header: "바코드", key: "barcode", width: 20 },
      { header: "ERP코드", key: "erp_item_code", width: 20 },
      { header: "ERP연동코드(Y/N)", key: "erp_flag", width: 15 },
      { header: "비고", key: "remark", width: 40 },
    ];

    // 3. 헤더 행(1행) 스타일링 (예쁜 남색 배경 + 흰색 굵은 글씨)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Tailwind slate-800 느낌의 색상
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 25;

    // 4. 예시 데이터 행(2행) 추가
    const exampleRow = worksheet.addRow({
      item_key: "DUMMY-CAP-01",
      item_name: "퍼프 바나나 캡 (예시)",
      uom: "EA",
      item_type: "부자재",
      lot_required: "N",
      active_flag: "Y",
      use_team: "생산2팀",
      shelf_life_days: 0,
      unit_cost: 0,
      barcode: "",
      erp_item_code: "",
      erp_flag: "N",
      remark: "가상 관리용 더미 품목 (이 행은 지우고 입력하세요)",
    });

    // 예시 데이터 행 스타일링 (가운데 정렬 및 회색 글씨)
    exampleRow.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.font = { color: { argb: "FF64748B" }, italic: true }; // Tailwind slate-500
    });

    // 5. 파일 생성 및 다운로드 (file-saver 활용)
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const today = new Date().toISOString().slice(0, 10);
    saveAs(blob, `품목마스터_업로드양식_${today}.xlsx`);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 px-4 py-2.5 rounded-lg text-sm font-bold border border-emerald-800 transition shadow-sm whitespace-nowrap"
    >
      <Download size={16} className="text-emerald-400" /> 양식 다운로드 (.xlsx)
    </button>
  );
}