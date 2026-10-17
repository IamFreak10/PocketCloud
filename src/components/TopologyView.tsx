import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import {
  Server,
  Globe,
  Database,
  Network,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Sparkles,
  Zap,
  Radio,
} from 'lucide-react';
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

    // 1. Central Virtual Internet Gateway Node
    generatedNodes.push({
      id: 'gateway-node',
      position: { x: 340, y: 30 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 mb-1">
              <Network className="w-4 h-4 text-sky-700" />
              <span>Simulated Internet Gateway</span>
            </div>
            <div className="text-[10px] font-bold text-stone-700">
              Virtual IP: <span className="text-blue-900 font-extrabold">10.99.0.1</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-600">
              Host Loopback: 127.0.0.1:18080
            </div>
          </div>
        ),
      },
      style: {
        background: '#BAE6FD',
        border: '2px solid #18181B',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '4px 4px 0px #18181B',
        width: 220,
      },
    });

    // 2. Virtual DNS Engine Node
    generatedNodes.push({
      id: 'dns-node',
      position: { x: 60, y: 30 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 mb-1">
              <Globe className="w-4 h-4 text-amber-700" />
              <span>Virtual DNS Authority</span>
            </div>
            <div className="text-[10px] font-bold text-stone-700">
              Zone: <span className="text-amber-900 font-extrabold">*.test, *.local</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-600">
              Authoritative Resolution Engine
            </div>
          </div>
        ),
      },
      style: {
        background: '#FEF08A',
        border: '2px solid #18181B',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '4px 4px 0px #18181B',
        width: 210,
      },
    });

    // Connect DNS to Gateway
    generatedEdges.push({
      id: 'e-dns-gateway',
      source: 'dns-node',
      target: 'gateway-node',
      animated: true,
      style: { stroke: '#18181B', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#18181B',
      },
    });

    // 3. Lab Components (VPS, Web Server, DB)
    components.forEach((c, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 50 + col * 260;
      const y = 180 + row * 180;

      const isRunning = c.status === 'running';

      let bgColor = '#C7F9CC'; // default mint for VPS
      let iconColor = 'text-emerald-700';
      if (c.component_type === 'web') {
        bgColor = '#FED7AA';
        iconColor = 'text-amber-800';
      } else if (c.component_type === 'database') {
        bgColor = '#DDD6FE';
        iconColor = 'text-purple-800';
      }

      generatedNodes.push({
        id: c.id,
        position: { x, y },
        data: {
          label: (
            <div
              onClick={() => onSelectComponent(c.id)}
              className="cursor-pointer select-none text-left font-mono"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-stone-900/30">
                <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                  {c.component_type === 'vps' && <Server className={`w-3.5 h-3.5 ${iconColor}`} />}
                  {c.component_type === 'web' && <Globe className={`w-3.5 h-3.5 ${iconColor}`} />}
                  {c.component_type === 'database' && <Database className={`w-3.5 h-3.5 ${iconColor}`} />}
                  <span className="truncate max-w-[130px]">{c.name}</span>
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-stone-300'
                  }`}
                  title={c.status}
                />
              </div>

              <div className="text-[10px] space-y-0.5 text-stone-800 font-bold">
                <div>
                  IP: <span className="text-stone-950 font-extrabold">{c.ip_address || '10.99.0.10'}</span>
                </div>
                {c.host_port && (
                  <div>
                    Port: <span className="text-blue-900 font-extrabold">127.0.0.1:{c.host_port}</span>
                  </div>
                )}
                <div>
                  Runtime: <span className="text-stone-900">{c.runtime_mode === 'docker' ? 'Docker Native' : 'Simulated'}</span>
                </div>
              </div>

              {isRunning && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTerminal(c.id);
                  }}
                  className="mt-2 w-full retro-btn px-2 py-1 bg-white hover:bg-stone-50 text-stone-900 text-[10px] font-black gap-1"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Open Root Terminal</span>
                </button>
              )}
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: '2px solid #18181B',
          borderRadius: '14px',
          padding: '12px',
          width: 230,
          boxShadow: isRunning ? '4px 4px 0px #18181B' : '2px 2px 0px #18181B',
        },
      });

      // Connect to Gateway
      generatedEdges.push({
        id: `e-gateway-${c.id}`,
        source: 'gateway-node',
        target: c.id,
        animated: isRunning,
        style: {
          stroke: isRunning ? '#18181B' : '#71717A',
          strokeWidth: isRunning ? 2.5 : 1.5,
          strokeDasharray: isRunning ? 'none' : '4 4',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isRunning ? '#18181B' : '#71717A',
        },
      });
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [components, onSelectComponent, onOpenTerminal]);

  return (
    <div className="w-full h-full p-4 select-none flex flex-col gap-3 bg-[#FAF7EE]">
      {/* Retro Header Card */}
      <div className="retro-window p-3 bg-white flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
        <div className="flex items-center gap-3">
          <div className="retro-dots">
            <span className="retro-dot retro-dot-red" />
            <span className="retro-dot retro-dot-yellow" />
            <span className="retro-dot retro-dot-green" />
          </div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-stone-900" />
            <h1 className="font-black text-sm font-mono text-stone-900">
              Interactive Design Structure & Network Architecture Topology
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="retro-badge bg-[#86EFAC] text-stone-900 font-mono">
            <Radio className="w-3 h-3 animate-spin text-emerald-800" />
            Live Packet Routing Active
          </div>
          <div className="retro-badge bg-[#FEF08A] text-stone-900 font-mono">
            {components.length} Infrastructure Nodes
          </div>
        </div>
      </div>

      {/* ReactFlow Architecture Graph */}
      <div className="flex-1 retro-window overflow-hidden relative shadow-[4px_4px_0px_#18181B] bg-white">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#d4cebe" gap={20} size={1.5} />
          <Controls className="bg-white border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] text-stone-900 fill-stone-900 m-4" />
        </ReactFlow>
      </div>
    </div>
  );
};
