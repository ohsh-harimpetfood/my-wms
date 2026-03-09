"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Package, Hash, Calculator } from "lucide-react";

export interface PackingDetail {
  pack_type: "BOX" | "LOOSE";
  unit_qty: number;
  pack_count: number;
  total_qty: number;
}

interface SubMaterialHelperSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (totalQty: number, details: PackingDetail[]) => void;
  itemName: string;
  maxDecimal: number;
  targetQty: number; // 🚀 [추가] 부모로부터 잔여 계획 수량을 받아옴
}

interface BoxRow {
  id: string;
  unitQty: string;
  boxCount: string;
}

export default function SubMaterialHelperSheet({
  isOpen,
  onClose,
  onApply,
  itemName,
  maxDecimal,
  targetQty, // 🚀 새로 추가된 프롭스
}: SubMaterialHelperSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [boxes, setBoxes] = useState<BoxRow[]>([{ id: "1", unitQty: "", boxCount: "" }]);
  const [looseQty, setLooseQty] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const sanitizeDecimal = (val: string, maxDec: number) => {
    let sanitized = val.replace(/[^0-9.]/g, "");
    if (maxDec === 0) return sanitized.replace(/\./g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) sanitized = parts[0] + "." + parts.slice(1).join("");
    const finalParts = sanitized.split(".");
    if (finalParts.length === 2 && finalParts[1].length > maxDec) {
      sanitized = finalParts[0] + "." + finalParts[1].slice(0, maxDec);
    }
    return sanitized;
  };

  const handleBoxChange = (id: string, field: "unitQty" | "boxCount", value: string) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, [field]: sanitizeDecimal(value, maxDecimal) } : box))
    );
  };

  const addBoxRow = () => setBoxes((prev) => [...prev, { id: Math.random().toString(), unitQty: "", boxCount: "" }]);
  const removeBoxRow = (id: string) => setBoxes((prev) => prev.filter((box) => box.id !== id));

  // 🚀 [추가] 박스 총합과 예상 잔량 계산
  const boxTotal = boxes.reduce((sum, box) => {
    return sum + (Number(box.unitQty) || 0) * (Number(box.boxCount) || 0);
  }, 0);
  
  // 목표 수량에서 박스 총합을 뺀 값이 0보다 크면 예상 잔량으로 표시
  const expectedLoose = Math.max(0, targetQty - boxTotal);

  const calculatedTotal = boxTotal + (Number(looseQty) || 0);

  const handleApply = () => {
    const details: PackingDetail[] = [];
    boxes.forEach((box) => {
      const unit = Number(box.unitQty);
      const count = Number(box.boxCount);
      if (unit > 0 && count > 0) {
        details.push({ pack_type: "BOX", unit_qty: unit, pack_count: count, total_qty: unit * count });
      }
    });

    const loose = Number(looseQty);
    if (loose > 0) {
      details.push({ pack_type: "LOOSE", unit_qty: 1, pack_count: loose, total_qty: loose });
    }

    onApply(calculatedTotal, details);
    onClose();
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center transition-all duration-300 ${
        isOpen ? "bg-black/70 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 border-t sm:border border-slate-700 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-y-0 sm:scale-100" : "translate-y-full sm:translate-y-0 sm:scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg"><Calculator size={20} /></div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">스마트 재고 계산기</h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"><X size={20} /></button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Package size={16} className="text-amber-500"/> 박스 수량 입력</label>
              <button onClick={addBoxRow} className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold bg-blue-900/20 px-2 py-1 rounded border border-blue-900/50 transition">
                <Plus size={14} /> 종류 추가
              </button>
            </div>
            
            <div className="space-y-3">
              {boxes.map((box) => (
                <div key={box.id} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 ml-1">입수량 (단위)</span>
                    <input
                      type="text" inputMode="decimal" placeholder="예: 50"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-right font-bold"
                      value={box.unitQty}
                      onChange={(e) => handleBoxChange(box.id, "unitQty", e.target.value)}
                    />
                  </div>
                  <div className="text-slate-500 font-bold mt-4">×</div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 ml-1">박스 수</span>
                    <input
                      type="text" inputMode="decimal" placeholder="예: 2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none text-right font-bold"
                      value={box.boxCount}
                      onChange={(e) => handleBoxChange(box.id, "boxCount", e.target.value)}
                    />
                  </div>
                  {boxes.length > 1 && (
                    <button onClick={() => removeBoxRow(box.id)} className="mt-4 p-2 text-slate-500 hover:text-red-400 transition">
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 🚀 [수정] 잔량 입력 섹션: 예상 잔량 힌트 및 자동채우기 버튼 추가 */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Hash size={16} className="text-emerald-500"/> 잔량 (낱개) 입력
              </label>
              {expectedLoose > 0 && (
                <button 
                  onClick={() => setLooseQty(String(expectedLoose))}
                  className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-800 hover:bg-emerald-800/50 transition font-bold"
                >
                  예상 잔량 {expectedLoose} 자동입력
                </button>
              )}
            </div>
            <input
              type="text" inputMode="decimal" 
              placeholder={expectedLoose > 0 ? `예: ${expectedLoose} (예상 잔량)` : "예: 12"}
              className={`w-full bg-slate-950 border rounded-lg p-3 text-white outline-none text-right font-bold text-lg transition ${
                 looseQty === "" && expectedLoose > 0 ? "border-emerald-500/50 placeholder-emerald-700/50" : "border-slate-700 focus:border-emerald-500 placeholder-slate-600"
              }`}
              value={looseQty}
              onChange={(e) => setLooseQty(sanitizeDecimal(e.target.value, maxDecimal))}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 sm:pb-4 pb-24 rounded-b-2xl">
          <div className="flex items-end justify-between mb-4">
            <span className="text-slate-400 font-bold">총 합계 수량</span>
            <span className="text-3xl font-bold text-blue-400">{calculatedTotal.toLocaleString()}</span>
          </div>
          <button
            onClick={handleApply}
            disabled={calculatedTotal <= 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            입력창에 적용하기
          </button>
        </div>
      </div>
    </div>
  );
}