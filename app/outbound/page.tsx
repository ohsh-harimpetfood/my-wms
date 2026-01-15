'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OutboundPage() {
  const router = useRouter();
  const supabase = createClient();

  const [locCode, setLocCode] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOutbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!locCode || !itemKey || !qty) {
      alert("모든 항목을 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      // 1. 현재 재고 확인 (가장 중요!)
      const { data: currentStock, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('location_code', locCode)
        .eq('item_key', itemKey)
        .single();

      if (fetchError || !currentStock) {
        alert("해당 위치에 품목이 존재하지 않습니다.");
        setLoading(false);
        return;
      }

      // 🛡️ 방어 로직: 재고 부족 체크
      if (Number(currentStock.quantity) < Number(qty)) {
        alert(`재고가 부족합니다! (현재고: ${currentStock.quantity})`);
        setLoading(false);
        return;
      }

      // 2. 재고 차감 (Update)
      const newQty = Number(currentStock.quantity) - Number(qty);
      
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQty })
        .eq('id', currentStock.id);

      if (updateError) throw updateError;

      // 3. 수불 내역(History) 기록 - OUTBOUND
      const { error: historyError } = await supabase
        .from('stock_tx')
        .insert({
          transaction_type: 'OUTBOUND', // 출고!
          location_code: locCode,
          item_key: itemKey,
          quantity: Number(qty) * -1, // 출고니까 마이너스로 기록하거나, 양수로 적고 타입으로 구분하기도 함 (여기선 헷갈리지 않게 수량 자체는 양수로, 타입은 OUTBOUND로)
          remark: '출고 등록 화면에서 차감'
        });

      if (historyError) throw historyError;

      alert("출고 처리가 완료되었습니다.");
      router.push('/inventory');

    } catch (error: any) {
      console.error(error);
      alert("오류 발생: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 border border-gray-800 bg-gray-900 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-red-400">📤 출고 등록 (Outbound)</h1>
      
      <form onSubmit={handleOutbound} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">위치 코드 (Location)</label>
          <input
            type="text"
            value={locCode}
            onChange={(e) => setLocCode(e.target.value.toUpperCase())}
            placeholder="예: MA11"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">품목 코드 (Item Key)</label>
          <input
            type="text"
            value={itemKey}
            onChange={(e) => setItemKey(e.target.value)}
            placeholder="예: 1010101"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">출고 수량 (Qty)</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded transition mt-4 disabled:opacity-50"
        >
          {loading ? '처리 중...' : '출고 완료'}
        </button>
      </form>
    </div>
  );
}