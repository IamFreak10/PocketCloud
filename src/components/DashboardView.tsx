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
  Sparkles,
  Zap,
  AlertTriangle,
  Download,
  RefreshCw,
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
    <div className="h-full overflow-y-auto p-8 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      {/* 1-Click Dependency & Environment Assistant (Shown if Docker is Offline) */}
      {capabilities && !capabilities.docker_available && (
        <div className="retro-window bg-[#FDA4AF] shadow-[5px_5px_0px_#18181B] border-2 border-stone-900">
          <div className="retro-window-header bg-[#F43F5E] text-white">
            <div className="retro-dots">
              <span className="retro-dot retro-dot-red" />
              <span className="retro-dot retro-dot-yellow" />
              <span className="retro-dot retro-dot-green" />
            </div>
            <div className="flex items-center gap-2 text-xs font-black font-mono">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Container Engine Offline — 1-Click Setup Assistant</span>
            </div>
          </div>
          <div className="p-6 bg-[#FFF1F2] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-black text-stone-900 font-mono">
                Docker Engine is not running on your computer
              </h2>
              <p className="text-xs text-stone-700 max-w-2xl font-medium leading-relaxed">
                PocketCloud needs Docker (Docker Desktop on Windows or Docker Engine on Linux) to run isolated Ubuntu VPS containers. Everything else (Ubuntu image, OpenSSH, Nginx, PostgreSQL, Virtual DNS) is automatically downloaded and configured by PocketCloud.
              </p>
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <a
                  href="https://www.docker.com/products/docker-desktop/"
                  target="_blank"
                  rel="noreferrer"
                  className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-800" />
                  <span>Download Docker Desktop</span>
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="retro-btn px-4 py-2 bg-white hover:bg-stone-100 text-stone-900 text-xs font-black gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-stone-700" />
                  <span>Refresh Connection</span>
                </button>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] text-xs font-mono shrink-0">
              <div className="font-bold text-stone-900 mb-1">Quick Windows Terminal:</div>
              <code className="bg-stone-100 px-2 py-1 rounded border border-stone-300 block text-[11px] select-all">
                wsl --install
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Hero Welcome Window */}
      <div className="retro-window bg-[#C7F9CC] shadow-[5px_5px_0px_#18181B]">
        <div className="retro-window-header bg-[#86EFAC]">
          <div className="retro-dots">
            <span className="retro-dot retro-dot-red" />
            <span className="retro-dot retro-dot-yellow" />
            <span className="retro-dot retro-dot-green" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black font-mono text-stone-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Welcome to PocketCloud Sandbox</span>
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border-2 border-stone-900 text-stone-900 text-xs font-black shadow-[2px_2px_0px_#18181B] mb-3">
              <Rocket className="w-3.5 h-3.5 text-orange-600" />
              <span>Local Cloud & Simulated Hosting Playground</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight mb-2 font-mono">
              Build, Deploy & Simulate Real Hosting on Your PC
            </h1>
            <p className="text-xs md:text-sm text-stone-700 leading-relaxed max-w-2xl font-medium mb-6">
              PocketCloud provides zero-cost isolated Linux containers, real OpenSSH servers, visual network topology, and custom simulated internet without renting cloud infrastructure.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onQuickStart('ubuntu-vps')}
                className="retro-btn px-4 py-2.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs md:text-sm font-black gap-2"
              >
                <Rocket className="w-4 h-4 text-orange-600" />
                <span>Launch Clean Ubuntu VPS</span>
              </button>
              <button
                onClick={() => onQuickStart('vps-web')}
                className="retro-btn px-4 py-2.5 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 text-xs md:text-sm font-black gap-2"
              >
                <Server className="w-4 h-4 text-sky-700" />
                <span>Full Stack (Alpine + Nginx + DB)</span>
              </button>
              <button
                onClick={() => onQuickStart('empty')}
                className="retro-btn px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-900 text-xs md:text-sm font-black"
              >
                Create Empty Lab
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid in Pastel Hues */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Labs */}
        <div className="retro-card p-4 bg-[#C7F9CC]">
          <div className="flex items-center justify-between text-stone-800 mb-2 font-mono font-bold text-xs uppercase">
            <span>Active Labs</span>
            <Layers className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {activeLabs.length} <span className="text-xs text-stone-600 font-bold">/ {labs.length} total</span>
          </div>
        </div>

        {/* Card 2: Running Nodes */}
        <div className="retro-card p-4 bg-[#FEF08A]">
          <div className="flex items-center justify-between text-stone-800 mb-2 font-mono font-bold text-xs uppercase">
            <span>Running Nodes</span>
            <Server className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {activeComponents} <span className="text-xs text-stone-600 font-bold">/ {totalComponents} total</span>
          </div>
        </div>

        {/* Card 3: RAM Available */}
        <div className="retro-card p-4 bg-[#BAE6FD]">
          <div className="flex items-center justify-between text-stone-800 mb-2 font-mono font-bold text-xs uppercase">
            <span>RAM Available</span>
            <HardDrive className="w-4 h-4 text-sky-800" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {capabilities ? `${Math.round(capabilities.available_memory_mb / 1024)} GB` : '8 GB'}
            <span className="text-xs text-stone-600 font-bold"> / {capabilities ? `${Math.round(capabilities.total_memory_mb / 1024)} GB` : '16 GB'}</span>
          </div>
        </div>

        {/* Card 4: CPU Threads */}
        <div className="retro-card p-4 bg-[#DDD6FE]">
          <div className="flex items-center justify-between text-stone-800 mb-2 font-mono font-bold text-xs uppercase">
            <span>CPU Cores</span>
            <Cpu className="w-4 h-4 text-purple-800" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {capabilities?.cpu_cores || 16} <span className="text-xs text-stone-600 font-bold">vCPUs</span>
          </div>
        </div>
      </div>

      {/* Starter Playground Templates Grid */}
      <div>
        <h2 className="text-base font-black text-stone-900 mb-3 flex items-center gap-2 font-mono">
          <Zap className="w-4 h-4 text-amber-600" />
          <span>Starter Playground Templates</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => onQuickStart('ubuntu-vps')}
            className="retro-card retro-card-interactive p-5 bg-white cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FED7AA] border-2 border-stone-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_#18181B]">
                <Server className="w-5 h-5 text-stone-900" />
              </div>
              <h3 className="font-black text-sm text-stone-900 mb-1 font-mono">
                Ubuntu 24.04 LTS VPS
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium mb-4">
                Launch an authentic minimal Ubuntu 24.04 LTS environment with root shell, apt package manager, and OpenSSH server.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t-2 border-stone-900/10 text-xs font-black text-stone-900">
              <span>Launch Ubuntu VPS</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => onQuickStart('vps-web')}
            className="retro-card retro-card-interactive p-5 bg-white cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#BAE6FD] border-2 border-stone-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_#18181B]">
                <Globe className="w-5 h-5 text-stone-900" />
              </div>
              <h3 className="font-black text-sm text-stone-900 mb-1 font-mono">
                Nginx Reverse Proxy & VHosts
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium mb-4">
                Simulate multi-domain routing (e.g. <code>api.shop.test</code> and <code>shop.test</code>) with live Nginx virtual hosts.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t-2 border-stone-900/10 text-xs font-black text-stone-900">
              <span>Launch Web Stack</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => onQuickStart('vps-web')}
            className="retro-card retro-card-interactive p-5 bg-white cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#DDD6FE] border-2 border-stone-900 flex items-center justify-center mb-3 shadow-[2px_2px_0px_#18181B]">
                <Database className="w-5 h-5 text-stone-900" />
              </div>
              <h3 className="font-black text-sm text-stone-900 mb-1 font-mono">
                App & Database Cluster
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium mb-4">
                Connect web backends to real PostgreSQL 16 containers with persistent storage and SQL execution.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t-2 border-stone-900/10 text-xs font-black text-stone-900">
              <span>Launch DB Cluster</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Labs Table */}
      {labs.length > 0 && (
        <div className="retro-window p-5 bg-white">
          <h2 className="text-sm font-black text-stone-900 mb-3 font-mono">
            Recent Labs in Workspace
          </h2>
          <div className="space-y-2.5">
            {labs.map((lab) => (
              <div
                key={lab.id}
                onClick={() => onOpenLab(lab.id)}
                className="flex items-center justify-between p-3.5 bg-[#FAF7EE] hover:bg-[#FEF08A]/40 border-2 border-stone-900 rounded-xl cursor-pointer transition shadow-[2px_2px_0px_#18181B]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-stone-900 text-xs font-mono">{lab.name}</span>
                    <span
                      className={`retro-badge ${
                        lab.status === 'Running'
                          ? 'bg-[#86EFAC] text-stone-900'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {lab.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium">{lab.description}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-800 font-mono font-bold">
                  <span>{lab.components.length} nodes</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
