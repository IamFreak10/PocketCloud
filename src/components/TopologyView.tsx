import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import { Server, Globe, Database, Network, ShieldCheck, Terminal } from 'lucide-react';
import { LabComponent } from '../types';

interface TopologyViewProps {
  components: LabComponent[];
  onSelectComponent: (id: string) => void;
  onOpenTerminal: (id: string) => void;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  components,
  onSelectComponent,
  onOpenTerminal,
}) => {
  // Generate nodes from active components
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    // Router / Gateway central node
    generatedNodes.push({
      id: 'gateway-node',
      position: { x: 280, y: 40 },
      data: { label: 'NetLab Local Gateway (10.99.0.1)' },
      style: {
        background: '#152033',
        color: '#38bdf8',
        border: '1px solid #0284c7',
        borderRadius: '10px',
        padding: '10px 16px',
        fontWeight: 'bold',
        fontSize: '12px',
      },
    });

    components.forEach((c, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 80 + col * 240;
      const y = 180 + row * 160;

      const isRunning = c.status === 'running';

      generatedNodes.push({
        id: c.id,
        position: { x, y },
        data: {
          label: (
            <div
              onClick={() => onSelectComponent(c.id)}
              className="cursor-pointer select-none text-left"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  {c.component_type === 'vps' && <Server className="w-3.5 h-3.5 text-blue-400" />}
                  {c.component_type === 'web' && <Globe className="w-3.5 h-3.5 text-cyan-400" />}
                  {c.component_type === 'database' && <Database className="w-3.5 h-3.5 text-purple-400" />}
                  {c.component_type === 'router' && <Network className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{c.name}</span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="text-[11px] text-gray-400 space-y-0.5">
                <div>IP: <span className="text-gray-300 font-mono">{c.ip_address || 'Unassigned'}</span></div>
                {c.host_port && (
                  <div>Port: <span className="text-cyan-400 font-mono">127.0.0.1:{c.host_port}</span></div>
                )}
                <div>Mode: <span className="text-gray-300">{c.runtime_mode === 'docker' ? 'Real Docker' : 'Simulated'}</span></div>
              </div>

              {isRunning && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTerminal(c.id);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded text-[10px] font-semibold transition"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Open Terminal</span>
                </button>
              )}
            </div>
          ),
        },
        style: {
          background: '#0f172a',
          color: '#f8fafc',
          border: isRunning ? '1px solid #10b981' : '1px solid #334155',
          borderRadius: '10px',
          padding: '12px',
          width: 210,
          boxShadow: isRunning ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
        },
      });

      // Connect to gateway
      generatedEdges.push({
        id: `e-gateway-${c.id}`,
        source: 'gateway-node',
        target: c.id,
        animated: isRunning,
        style: { stroke: isRunning ? '#06b6d4' : '#475569', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isRunning ? '#06b6d4' : '#475569',
        },
      });
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [components, onSelectComponent, onOpenTerminal]);

  return (
    <div className="w-full h-full bg-[#090d16] rounded-xl border border-gray-800 overflow-hidden relative shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-[#121927]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>Packet Tracer-Style Interactive Network Topology</span>
      </div>

      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#1e293b" gap={16} />
        <Controls className="bg-gray-900 border-gray-800 text-white fill-white" />
      </ReactFlow>
    </div>
  );
};
