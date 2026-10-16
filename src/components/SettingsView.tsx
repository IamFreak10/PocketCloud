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
    <div className="h-full overflow-y-auto p-8 space-y-8 select-none max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Resource Quotas</h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure container resource budgets, loopback gateway ports, and local storage limits.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Resource Allocation */}
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Container Resource Limits (Safety Bounds)</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Default RAM Limit Per Container (MB)
              </label>
              <select
                value={ramLimit}
                onChange={(e) => setRamLimit(e.target.value)}
                className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="256">256 MB (Ultra-Lightweight)</option>
                <option value="512">512 MB (Recommended for 16GB Hosts)</option>
                <option value="1024">1024 MB (1 GB)</option>
                <option value="2048">2048 MB (2 GB)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Max CPU Cores Per Workload
              </label>
              <select
                value={cpuLimit}
                onChange={(e) => setCpuLimit(e.target.value)}
                className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="1">1 CPU Core (Quota: 100,000us)</option>
                <option value="2">2 CPU Cores</option>
                <option value="4">4 CPU Cores</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gateway & Network */}
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Host-Browser Gateway Loopback Bridge</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Gateway HTTP Reverse Proxy Port
            </label>
            <input
              type="text"
              value={gatewayPort}
              onChange={(e) => setGatewayPort(e.target.value)}
              className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500 max-w-xs"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Traffic is bound strictly to <code>127.0.0.1</code> to prevent public exposure.
            </p>
          </div>
        </div>

        {/* Hardware Status */}
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl space-y-3 text-xs">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Detected Host Platform Telemetry</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 text-gray-300 font-mono">
            <div>Operating System: <span className="text-white">{capabilities?.os_platform || 'Linux'}</span></div>
            <div>Docker Engine: <span className="text-emerald-400">{capabilities?.docker_version || '29.8.1'}</span></div>
            <div>Physical RAM: <span className="text-white">{capabilities?.total_memory_mb || 16384} MB</span></div>
            <div>KVM Virtualization: <span className="text-amber-400">{capabilities?.kvm_available ? 'Available' : 'Unprivileged'}</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <span>Save Preferences</span>
          </button>

          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings Saved Successfully</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
