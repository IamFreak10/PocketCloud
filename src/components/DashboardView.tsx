import React from 'react';
import {
  Rocket,
  Server,
  Globe,
  Database,
  ArrowRight,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Lab, SystemCapabilities } from '../types';

interface DashboardViewProps {
  labs: Lab[];
  capabilities: SystemCapabilities | null;
  onQuickStart: (template: string) => void;
  onOpenLab: (labId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  labs,
  capabilities,
  onQuickStart,
  onOpenLab,
}) => {
  const activeLabs = labs.filter((l) => l.status === 'Running');
  const totalComponents = labs.reduce((acc, l) => acc + l.components.length, 0);
  const activeComponents = labs.reduce(
    (acc, l) => acc + l.components.filter((c) => c.status === 'running').length,
    0
  );

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 select-none">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#111928] to-[#0c121e] border border-cyan-800/40 p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 text-xs font-semibold mb-4">
            <Rocket className="w-3.5 h-3.5" />
            <span>Local Cloud & Hosting Playground</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
            Build, Deploy & Simulate Real Hosting on Your PC
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            NetLab gives you isolated Linux containers, visual network topologies, web servers, real databases,
            and an internal virtual Internet without renting public VPS or cloud infrastructure.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onQuickStart('ubuntu-vps')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-950 transition cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Launch Ubuntu 24.04 LTS VPS</span>
            </button>
            <button
              onClick={() => onQuickStart('vps-web')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-950 transition cursor-pointer"
            >
              <Server className="w-4 h-4" />
              <span>Full Stack (Alpine + Nginx + Postgres)</span>
            </button>
            <button
              onClick={() => onQuickStart('empty')}
              className="px-4 py-2.5 bg-[#172133] hover:bg-[#1e2b42] text-gray-200 border border-gray-700/60 font-semibold rounded-xl text-sm transition cursor-pointer"
            >
              Create Empty Lab
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Labs</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeLabs.length} <span className="text-sm text-gray-500 font-normal">/ {labs.length} total</span></div>
        </div>

        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Running Nodes</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeComponents} <span className="text-sm text-gray-500 font-normal">/ {totalComponents} total</span></div>
        </div>

        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RAM Available</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {capabilities ? `${Math.round(capabilities.available_memory_mb / 1024)} GB` : '8 GB'}
            <span className="text-sm text-gray-500 font-normal"> / {capabilities ? `${Math.round(capabilities.total_memory_mb / 1024)} GB` : '16 GB'}</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CPU Threads</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{capabilities?.cpu_cores || 16} <span className="text-sm text-gray-500 font-normal">vCPUs</span></div>
        </div>
      </div>

      {/* Starter Templates Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>Starter Playground Templates</span>
        </h2>
        <div className="grid grid-cols-3 gap-5">
          {/* Card 1 */}
          <div
            onClick={() => onQuickStart('ubuntu-vps')}
            className="group bg-[#0d1424] hover:bg-[#121c33] border border-gray-800 hover:border-orange-500/50 rounded-xl p-6 transition cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-950 border border-orange-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Server className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-bold text-white mb-1.5 group-hover:text-orange-400 transition">
                Ubuntu 24.04 LTS VPS
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Launch an official Ubuntu 24.04 Noble Numbat Linux environment with full Bash shell, apt package manager, and root access.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-800/80 text-xs font-semibold text-orange-400">
              <span>Launch Ubuntu VPS</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onQuickStart('vps-web')}
            className="group bg-[#0d1424] hover:bg-[#121c33] border border-gray-800 hover:border-blue-500/50 rounded-xl p-6 transition cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-white mb-1.5 group-hover:text-blue-400 transition">
                Nginx Reverse Proxy & VHosts
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Simulate production multi-domain routing (e.g. <code>api.shop.test</code> and <code>shop.test</code>) with live configuration files.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-800/80 text-xs font-semibold text-blue-400">
              <span>Launch Template</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onQuickStart('vps-web')}
            className="group bg-[#0d1424] hover:bg-[#121c33] border border-gray-800 hover:border-purple-500/50 rounded-xl p-6 transition cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-1.5 group-hover:text-purple-400 transition">
                App & Database Cluster
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Practice connecting Node.js Express APIs or PHP applications to PostgreSQL, MariaDB, or MongoDB containers with persistent data.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-800/80 text-xs font-semibold text-purple-400">
              <span>Launch Template</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Labs Table */}
      {labs.length > 0 && (
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">Recent Labs in Workspace</h2>
          <div className="space-y-3">
            {labs.map((lab) => (
              <div
                key={lab.id}
                onClick={() => onOpenLab(lab.id)}
                className="flex items-center justify-between p-4 bg-[#131b2d] hover:bg-[#18233a] border border-gray-800 rounded-lg cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{lab.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        lab.status === 'Running'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {lab.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{lab.description}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="font-mono">{lab.components.length} components</span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
