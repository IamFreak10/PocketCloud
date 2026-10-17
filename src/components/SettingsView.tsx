import React, { useState } from 'react';
import { Settings, Shield, HardDrive, Cpu, Trash2, CheckCircle2 } from 'lucide-react';
import { SystemCapabilities } from '../types';

interface SettingsViewProps {
  capabilities: SystemCapabilities | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ capabilities }) => {
  const [ramLimit, setRamLimit] = useState('512');
  const [cpuLimit, setCpuLimit] = useState('1');
  const [gatewayPort, setGatewayPort] = useState('18080');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none max-w-4xl bg-[#FAF7EE] text-stone-900">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>⚙️</span> Settings & Resource Quotas
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-medium">
          Configure container resource budgets, loopback gateway ports, and local storage limits.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Resource Allocation */}
        <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900">
            <Cpu className="w-5 h-5 text-stone-900" />
            <h2 className="text-sm font-black text-stone-900">Container Resource Limits (Safety Bounds)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-800 mb-1">
                Default RAM Limit Per Container (MB)
              </label>
              <select
                value={ramLimit}
                onChange={(e) => setRamLimit(e.target.value)}
                className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
              >
                <option value="256">256 MB (Ultra-Lightweight)</option>
                <option value="512">512 MB (Recommended for 16GB Hosts)</option>
                <option value="1024">1024 MB (1 GB)</option>
                <option value="2048">2048 MB (2 GB)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1">
                Max CPU Cores Per Workload
              </label>
              <select
                value={cpuLimit}
                onChange={(e) => setCpuLimit(e.target.value)}
                className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
              >
                <option value="0.5">0.5 Cores (Throttle background labs)</option>
                <option value="1">1 Core (Standard)</option>
                <option value="2">2 Cores (Heavy compilation/Node builds)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-800 mb-1">
                Loopback Host Gateway Proxy Port
              </label>
              <input
                type="number"
                value={gatewayPort}
                onChange={(e) => setGatewayPort(e.target.value)}
                className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
              />
              <p className="text-[11px] text-stone-500 mt-1 font-medium">
                The local TCP port on 127.0.0.1 that proxies traffic into isolated lab containers.
              </p>
            </div>
          </div>
        </div>

        {/* Storage and Cleanup */}
        <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900">
            <Trash2 className="w-5 h-5 text-stone-900" />
            <h2 className="text-sm font-black text-stone-900">Container Hygiene & Housekeeping</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] gap-3">
            <div>
              <div className="font-black text-xs text-stone-900">Prune Stopped Lab Containers</div>
              <div className="text-[11px] text-stone-600 font-medium">
                Remove stopped Docker containers to free system memory and port mappings.
              </div>
            </div>
            <button
              type="button"
              onClick={() => alert('Pruning stopped NetLab containers...')}
              className="retro-btn px-4 py-2 bg-[#FDA4AF] hover:bg-[#fb7185] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] cursor-pointer shrink-0"
            >
              Prune Containers
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="retro-btn px-6 py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 font-black text-xs rounded-xl shadow-[3px_3px_0px_#18181B] cursor-pointer"
          >
            Save Configuration
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-[#C7F9CC] px-3 py-1.5 rounded-xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B]">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
