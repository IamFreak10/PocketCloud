import React from 'react';
import { Cpu, HardDrive, Globe, ShieldCheck, Box, ExternalLink } from 'lucide-react';
import { SystemCapabilities } from '../types';

interface HeaderProps {
  capabilities: SystemCapabilities | null;
}

export const Header: React.FC<HeaderProps> = ({ capabilities }) => {
  return (
    <header className="h-16 bg-[#0d131f] border-b border-gray-800 flex items-center justify-between px-6 select-none shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white">PocketCloud</span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              v0.1.0-alpha
            </span>
          </div>
          <p className="text-xs text-gray-400">Zero-Cost Private Cloud & Full VPS Sandbox on Your Desktop</p>
        </div>
      </div>

      {/* Telemetry Badges */}
      <div className="flex items-center gap-3">
        {/* Docker Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151d2d] border border-gray-800 text-xs">
          <ShieldCheck className={`w-4 h-4 ${capabilities?.docker_available ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-gray-400">Docker:</span>
          <span className={`font-semibold ${capabilities?.docker_available ? 'text-emerald-400' : 'text-amber-400'}`}>
            {capabilities?.docker_available ? capabilities.docker_version : 'Unavailable'}
          </span>
        </div>

        {/* CPU & Memory */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151d2d] border border-gray-800 text-xs">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-gray-400">{capabilities?.cpu_cores || 8} vCPUs</span>
          <span className="text-gray-600">|</span>
          <HardDrive className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300">
            {capabilities ? `${Math.round(capabilities.available_memory_mb / 1024)}GB Free` : '16GB'}
          </span>
        </div>

        {/* Host Gateway Link */}
        <a
          href={capabilities?.gateway_url || 'http://127.0.0.1:18080'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-400 text-xs transition"
          title="Open local Host-Browser Gateway in host PC browser"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Host Gateway (127.0.0.1:18080)</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>
    </header>
  );
};
