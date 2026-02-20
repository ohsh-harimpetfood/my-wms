"use client";

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FileCode, Database, Box, Share2, Network } from 'lucide-react';

// === 🎨 아키텍처 스타일 정의 ===
const nodeStyle = (bg: string, border: string) => ({
  padding: '10px',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: 'bold' as const,
  color: '#fff',
  background: bg,
  border: `1px solid ${border}`,
  width: 180,
  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
});

const STYLES = {
  CONTEXT: nodeStyle('#312e81', '#818cf8'),
  PAGE: nodeStyle('#064e3b', '#22c55e'),
  COMP: nodeStyle('#78350f', '#fbbf24'),
  UTIL: nodeStyle('#0f172a', '#3b82f6'),
};

// === 📦 초기 노드 데이터 (JSX 태그 제거) ===
const initialNodes: Node[] = [
  // Providers
  { id: 'auth', position: { x: 300, y: 0 }, data: { label: 'AuthProvider', type: 'CONTEXT' }, style: STYLES.CONTEXT },
  { id: 'ui', position: { x: 500, y: 0 }, data: { label: 'UIProvider', type: 'CONTEXT' }, style: STYLES.CONTEXT },

  // Main Pages
  { id: 'p-admin', position: { x: 100, y: 150 }, data: { label: 'admin/users/page', type: 'PAGE' }, style: STYLES.PAGE },
  { id: 'p-inbound', position: { x: 300, y: 150 }, data: { label: 'inbound/[id]/page', type: 'PAGE' }, style: STYLES.PAGE },
  { id: 'p-dashboard', position: { x: 500, y: 150 }, data: { label: 'dashboard/page', type: 'PAGE' }, style: STYLES.PAGE },
  { id: 'p-inventory', position: { x: 700, y: 150 }, data: { label: 'inventory/page', type: 'PAGE' }, style: STYLES.PAGE },

  // Shared Components
  { id: 'c-loc-input', position: { x: 300, y: 300 }, data: { label: 'LocationInput', type: 'COMP' }, style: STYLES.COMP },
  { id: 'c-loc-map', position: { x: 200, y: 400 }, data: { label: 'LocationMapSelector', type: 'COMP' }, style: STYLES.COMP },
  { id: 'c-qr', position: { x: 400, y: 400 }, data: { label: 'QRScannerModal', type: 'COMP' }, style: STYLES.COMP },

  // Data Source
  { id: 'supabase', position: { x: 400, y: 550 }, data: { label: 'Supabase Client', type: 'UTIL' }, style: STYLES.UTIL },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'auth', target: 'p-admin', animated: true },
  { id: 'e2', source: 'auth', target: 'p-inbound', animated: true },
  { id: 'e3', source: 'ui', target: 'p-inbound', animated: true },
  { id: 'e4', source: 'p-inbound', target: 'c-loc-input', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e5', source: 'c-loc-input', target: 'c-loc-map', type: 'smoothstep' },
  { id: 'e6', source: 'c-loc-input', target: 'c-qr', type: 'smoothstep' },
  { id: 'e7', source: 'p-admin', target: 'supabase', style: { strokeDasharray: '5,5', stroke: '#3b82f6' } },
  { id: 'e8', source: 'c-loc-map', target: 'supabase', style: { strokeDasharray: '5,5', stroke: '#3b82f6' } },
];

export default function SystemMap() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 🛡️ 노드 렌더링 시점에만 아이콘을 결합하여 에러 방지
  const styledNodes = useMemo(() => nodes.map(n => {
    let IconComponent = Box;
    if (n.data.type === 'CONTEXT') IconComponent = Share2;
    if (n.data.type === 'PAGE') IconComponent = FileCode;
    if (n.data.type === 'UTIL') IconComponent = Database;

    return {
      ...n,
      data: {
        ...n.data,
        label: (
          <div className="flex items-center gap-2">
            <IconComponent size={14} className="opacity-70 shrink-0" />
            <span className="truncate">{n.data.label}</span>
          </div>
        )
      }
    };
  }), [nodes]);

  return (
    <div className="w-full h-[650px] bg-[#020617] rounded-2xl border border-gray-800 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <h2 className="text-white font-bold text-lg flex items-center gap-2 drop-shadow-md">
          <Network className="text-blue-500 animate-pulse" size={20} />
          WMS Architecture Graph
        </h2>
        <p className="text-gray-500 text-xs mt-1">Based on actual dependency analysis</p>
      </div>

      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}