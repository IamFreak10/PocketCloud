import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
  Laptop,
  Maximize2,
  Plus,
} from 'lucide-react';
import { LabComponent } from '../types';

interface TopologyViewProps {
  components: LabComponent[];
  onSelectComponent: (id: string) => void;
  onOpenTerminal: (id: string) => void;
  onQuickAdd?: (type: 'vps' | 'web' | 'database') => void;
}

const TopologyCanvas: React.FC<TopologyViewProps> = ({
  components,
  onSelectComponent,
  onOpenTerminal,
  onQuickAdd,
}) => {
  const { fitView } = useReactFlow();

  // Generate nodes from active components or complete architecture blueprint
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];

    // ----------------------------------------------------
    // LAYER 1 (Top Ingress Layer): Host PC, DNS Engine, Gateway Bridge
    // ----------------------------------------------------

    // 1. Host PC & Browser Node
    generatedNodes.push({
      id: 'host-client-node',
      position: { x: 50, y: 40 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 mb-1">
              <Laptop className="w-4 h-4 text-emerald-800" />
              <span>Host PC Workstation</span>
            </div>
            <div className="text-[10px] font-bold text-stone-700">
              Browser Ingress: <span className="text-emerald-900 font-extrabold">127.0.0.1</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-600">
              Local Desktop Client
            </div>
          </div>
        ),
      },
      style: {
        background: '#C7F9CC',
        border: '2px solid #18181B',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '4px 4px 0px #18181B',
        width: 230,
      },
    });

    // 2. Virtual DNS Authority Node
    generatedNodes.push({
      id: 'dns-node',
      position: { x: 340, y: 40 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 mb-1">
              <Globe className="w-4 h-4 text-amber-800" />
              <span>Virtual DNS Authority</span>
            </div>
            <div className="text-[10px] font-bold text-stone-700">
              Zone: <span className="text-amber-950 font-extrabold">*.test, *.local</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-600">
              RFC 6761 Loopback Resolver
            </div>
          </div>
        ),
      },
      style: {
        background: '#FEF08A',
        border: '2px solid #18181B',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '4px 4px 0px #18181B',
        width: 230,
      },
    });

    // 3. Central Virtual Internet Gateway Bridge
    generatedNodes.push({
      id: 'gateway-node',
      position: { x: 630, y: 40 },
      data: {
        label: (
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5 font-black text-xs text-stone-900 mb-1">
              <Network className="w-4 h-4 text-sky-800" />
              <span>Internet Gateway Bridge</span>
            </div>
            <div className="text-[10px] font-bold text-stone-700">
              Virtual IP: <span className="text-blue-900 font-extrabold">10.99.0.1</span>
            </div>
            <div className="text-[10px] font-semibold text-stone-600">
              Host Proxy: 127.0.0.1:18080
            </div>
          </div>
        ),
      },
      style: {
        background: '#BAE6FD',
        border: '2px solid #18181B',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '4px 4px 0px #18181B',
        width: 240,
      },
    });

    // Connect Host PC -> Gateway
    generatedEdges.push({
      id: 'e-host-gateway',
      source: 'host-client-node',
      target: 'gateway-node',
      animated: true,
      style: { stroke: '#18181B', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#18181B',
      },
    });

    // Connect DNS -> Gateway
    generatedEdges.push({
      id: 'e-dns-gateway',
      source: 'dns-node',
      target: 'gateway-node',
      animated: true,
      style: { stroke: '#18181B', strokeWidth: 2, strokeDasharray: '4 4' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#18181B',
      },
    });

    // ----------------------------------------------------
    // LAYER 2 (Subnet & Component Layer)
    // ----------------------------------------------------
    if (components.length > 0) {
      // Real Lab Components
      components.forEach((c, idx) => {
        const x = 50 + (idx % 3) * 290;
        const y = 230 + Math.floor(idx / 3) * 190;
        const isRunning = c.status === 'running';

        let bgColor = '#C7F9CC';
        let iconColor = 'text-emerald-800';
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
                    <span className="truncate max-w-[140px]">{c.name}</span>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${
                      isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                    }`}
                    title={c.status}
                  />
                </div>

                <div className="text-[10px] space-y-0.5 text-stone-800 font-bold">
                  <div>
                    IP: <span className="text-stone-950 font-extrabold">{c.ip_address || `10.99.0.${10 + idx}`}</span>
                  </div>
                  {c.host_port && (
                    <div>
                      Host Port: <span className="text-blue-900 font-extrabold">127.0.0.1:{c.host_port}</span>
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
            width: 250,
            boxShadow: isRunning ? '4px 4px 0px #18181B' : '2px 2px 0px #18181B',
          },
        });

        // Gateway to Node Edge
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
    } else {
      // ----------------------------------------------------
      // Architecture Structure Blueprint (Default Infrastructure Map)
      // Shown when lab is empty so user sees the complete cloud structure!
      // ----------------------------------------------------
      const defaultBlueprintNodes = [
        {
          id: 'vps-blueprint',
          name: 'Ubuntu 24.04 LTS VPS Node',
          type: 'vps',
          ip: '10.99.0.10',
          port: '18022 (OpenSSH)',
          desc: 'Minimal official Linux cloud container',
          color: '#C7F9CC',
          x: 50,
          y: 230,
        },
        {
          id: 'web-blueprint',
          name: 'Nginx Reverse Proxy & VHosts',
          type: 'web',
          ip: '10.99.0.11',
          port: '18081 (HTTP :80)',
          desc: 'Multi-domain synthetic router',
          color: '#FED7AA',
          x: 340,
          y: 230,
        },
        {
          id: 'db-blueprint',
          name: 'PostgreSQL 16 Cluster',
          type: 'database',
          ip: '10.99.0.12',
          port: '15432 (SQL :5432)',
          desc: 'Persistent relational engine',
          color: '#DDD6FE',
          x: 630,
          y: 230,
        },
      ];

      defaultBlueprintNodes.forEach((node) => {
        generatedNodes.push({
          id: node.id,
          position: { x: node.x, y: node.y },
          data: {
            label: (
              <div className="text-left font-mono">
                <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-stone-900/30">
                  <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                    {node.type === 'vps' && <Server className="w-3.5 h-3.5 text-emerald-800" />}
                    {node.type === 'web' && <Globe className="w-3.5 h-3.5 text-amber-800" />}
                    {node.type === 'database' && <Database className="w-3.5 h-3.5 text-purple-800" />}
                    <span className="truncate max-w-[140px]">{node.name}</span>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/80 border border-stone-900">
                    Blueprint
                  </span>
                </div>
                <div className="text-[10px] space-y-0.5 text-stone-800 font-bold">
                  <div>
                    Virtual IP: <span className="text-stone-950 font-extrabold">{node.ip}</span>
                  </div>
                  <div>
                    Port: <span className="text-blue-900 font-extrabold">{node.port}</span>
                  </div>
                  <div className="text-stone-600 text-[9px] truncate">
                    {node.desc}
                  </div>
                </div>
              </div>
            ),
          },
          style: {
            background: node.color,
            border: '2px dashed #18181B',
            borderRadius: '14px',
            padding: '12px',
            width: 250,
            boxShadow: '3px 3px 0px #18181B',
          },
        });

        // Edge from Gateway to Blueprint Node
        generatedEdges.push({
          id: `e-gw-${node.id}`,
          source: 'gateway-node',
          target: node.id,
          animated: true,
          style: {
            stroke: '#18181B',
            strokeWidth: 2,
            strokeDasharray: '4 4',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#18181B',
          },
        });
      });

      // Edge from Web Server to Database
      generatedEdges.push({
        id: 'e-web-db',
        source: 'web-blueprint',
        target: 'db-blueprint',
        animated: true,
        style: {
          stroke: '#7C3AED',
          strokeWidth: 2,
          strokeDasharray: '4 4',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#7C3AED',
        },
      });
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [components, onSelectComponent, onOpenTerminal]);

  // Automatically re-center and fit all nodes into view
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.18, duration: 400 });
    }, 120);
    return () => clearTimeout(timer);
  }, [nodes.length, fitView]);

  return (
    <div className="w-full h-full p-4 select-none flex flex-col gap-3 bg-[#FAF7EE]">
      {/* Retro Header Card */}
      <div className="retro-window p-3 bg-white flex items-center justify-between shadow-[3px_3px_0px_#18181B] shrink-0">
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fitView({ padding: 0.18, duration: 300 })}
            className="retro-btn px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-900 text-xs font-bold gap-1 shadow-[2px_2px_0px_#18181B]"
            title="Reset & Center Topology View"
          >
            <Maximize2 className="w-3.5 h-3.5 text-stone-800" />
            <span className="hidden sm:inline">Fit View</span>
          </button>

          <div className="retro-badge bg-[#86EFAC] text-stone-900 font-mono">
            <Radio className="w-3 h-3 animate-pulse text-emerald-800" />
            Live Packet Routing Active
          </div>

          <div className="retro-badge bg-[#FEF08A] text-stone-900 font-mono">
            {components.length > 0 ? `${components.length} Active Nodes` : 'Architecture Structure Ready'}
          </div>
        </div>
      </div>

      {/* ReactFlow Architecture Graph */}
      <div className="flex-1 w-full h-full retro-window overflow-hidden relative shadow-[4px_4px_0px_#18181B] bg-white min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.4}
          maxZoom={1.8}
        >
          <Background color="#d4cebe" gap={20} size={1.5} />
          <Controls className="bg-white border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] text-stone-900 fill-stone-900 m-4" />
        </ReactFlow>
      </div>
    </div>
  );
};

export const TopologyView: React.FC<TopologyViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TopologyCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default TopologyView;
