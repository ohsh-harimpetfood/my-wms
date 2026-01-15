'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InboundPage() {
  const router = useRouter();
  const supabase = createClient();

  const [locCode, setLocCode] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!locCode || !itemKey || !qty) {
      alert("모든 항목을 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      // 1. 재고(Inventory) 처리
      const { data: existingStock, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('location_code', locCode)
        .eq('item_key', itemKey)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingStock) {
        // 이미 있으면 업데이트
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: Number(existingStock.quantity) + Number(qty) })
          .eq('id', existingStock.id);
        if (updateError) throw updateError;
      } else {
        // 없으면 신규 등록
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            location_code: locCode,
            item_key: itemKey,
            quantity: Number(qty)
          });
        if (insertError) throw insertError;
      }

      // ✅ 2. 수불 내역(History) 기록 남기기 (여기가 핵심!)
      const { error: historyError } = await supabase
        .from('stock_tx')
        .insert({
          transaction_type: 'INBOUND', // 입고
          location_code: locCode,
          item_key: itemKey,
          quantity: Number(qty),
          remark: '입고 등록 화면에서 입력함'
        });

      if (historyError) throw historyError;

      alert("입고 및 이력 저장이 완료되었습니다!");
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
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-400">📥 입고 등록 (Inbound)</h1>
      
      <form onSubmit={handleInbound} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">위치 코드 (Location)</label>
          <input
            type="text"
            value={locCode}
            onChange={(e) => setLocCode(e.target.value.toUpperCase())}
            placeholder="예: MA11"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">품목 코드 (Item Key)</label>
          <input
            type="text"
            value={itemKey}
            onChange={(e) => setItemKey(e.target.value)}
            placeholder="예: 1010101"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">입고 수량 (Qty)</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition mt-4 disabled:opacity-50"
        >
          {loading ? '처리 중...' : '입고 완료'}
        </button>
      </form>
    </div>
  );
}