"use client";

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  ConnectionLineType,
  MarkerType,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Package, Truck, LogOut, Layers, AlertCircle } from 'lucide-react';

// === 🎨 커스텀 노드 스타일 (Cyberpunk Theme) ===
const nodeStyle = {
  background: '#111827', // Gray-900
  color: '#fff',
  border: '1px solid #374151',
  borderRadius: '12px',
  padding: '16px',
  width: 180,
  fontSize: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
  fontFamily: 'monospace',
};

// === 📦 초기 노드 데이터 (나중에 Supabase 데이터로 교체) ===
const initialNodes: Node[] = [
  // 1. 입고 (Inbound)
  { 
    id: '1', 
    position: { x: 50, y: 150 }, 
    data: { label: 'INBOUND', count: 12, icon: <Truck className="text-blue-400 mb-2" /> },
    style: { ...nodeStyle, borderColor: '#3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' },
  },
  // 2. 검수/적치 (Processing)
  { 
    id: '2', 
    position: { x: 300, y: 150 }, 
    data: { label: 'INSPECTION', count: 5, icon: <AlertCircle className="text-yellow-400 mb-2" /> },
    style: { ...nodeStyle, borderColor: '#eab308' },
  },
  // 3. 재고 (Inventory - Core)
  { 
    id: '3', 
    position: { x: 550, y: 50 }, 
    data: { label: 'INVENTORY', count: 1450, sub: 'Pallets', icon: <Layers className="text-green-400 mb-2" /> },
    style: { ...nodeStyle, height: 250, width: 200, borderColor: '#22c55e', background: '#064e3b', fontSize: '14px', zIndex: 10 },
  },
  // 4. 피킹/패킹 (Outbound Process)
  { 
    id: '4', 
    position: { x: 550, y: 350 }, 
    data: { label: 'PICKING', count: 8, icon: <Package className="text-purple-400 mb-2" /> },
    style: { ...nodeStyle, borderColor: '#a855f7' },
  },
  // 5. 출고 완료 (Shipped)
  { 
    id: '5', 
    position: { x: 800, y: 150 }, 
    data: { label: 'SHIPPED', count: 34, icon: <LogOut className="text-red-400 mb-2" /> },
    style: { ...nodeStyle, borderColor: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)' },
  },
];

// === 🔗 연결선 (애니메이션 적용) ===
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#eab308' } }, // 적치 -> 재고
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#22c55e' } }, // 재고 -> 피킹
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#a855f7' } }, // 피킹 -> 출고
  { id: 'e3-5', source: '3', target: '5', animated: true, style: { stroke: '#22c55e', opacity: 0.3 }, type: 'smoothstep' }, // 직출고(예외)
];

export default function SystemMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 💡 팁: 여기서 Supabase 데이터를 불러와서 setNodes로 count를 업데이트하면 실시간 연동됨!

  return (
    <div className="w-full h-[500px] bg-black border border-gray-800 rounded-xl overflow-hidden relative group">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> 
          SYSTEM MONITOR
        </h2>
        <p className="text-xs text-gray-500">Real-time Data Flow</p>
      </div>

      <ReactFlow
        nodes={nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            label: (
              <div className="flex flex-col items-center justify-center h-full">
                {node.data.icon}
                <div className="font-bold text-gray-400 tracking-widest">{node.data.label}</div>
                <div className="text-2xl font-bold text-white mt-1">
                    {node.data.count.toLocaleString()}
                    <span className="text-xs text-gray-500 ml-1">{node.data.sub || '건'}</span>
                </div>
              </div>
            )
          }
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }} // 로고 숨김
      >
        <Background color="#333" gap={20} size={1} />
        {/* <Controls />  <-- 컨트롤이 필요하면 주석 해제 */} 
      </ReactFlow>

      {/* 오버레이 효과 (선택 사항) */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-transparent opacity-50" />
    </div>
  );
}