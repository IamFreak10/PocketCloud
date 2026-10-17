import React from 'react';
import { Cpu, HardDrive, Globe, ShieldCheck, Box, Sparkles, ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { APP_VERSION } from '../version';
import { SystemCapabilities } from '../types';

interface HeaderProps {
  capabilities: SystemCapabilities | null;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ capabilities, isSidebarOpen = true, onToggleSidebar }) => {
  return (
    <header className="h-16 bg-[#FAF7EE] border-b-2 border-stone-900 flex items-center justify-between px-6 select-none shrink-0 shadow-[0_2px_0px_#18181B] z-20">
      {/* Brand with Retro Window Controls and Drawer Toggle */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Retro Window Dot Controls */}
        <div className="retro-dots hidden sm:flex">
          <span className="retro-dot retro-dot-red" title="Close" />
          <span className="retro-dot retro-dot-yellow" title="Minimize" />
          <span className="retro-dot retro-dot-green" title="Expand" />
        </div>

        {/* Navigation Drawer Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="retro-btn px-2.5 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs font-black gap-1.5 shadow-[2px_2px_0px_#18181B] active:translate-x-[1px] active:translate-y-[1px]"
            title={isSidebarOpen ? 'Collapse Navigation Drawer (Ctrl+B)' : 'Expand Navigation Drawer (Ctrl+B)'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-stone-900" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-stone-900" />
            )}
            <span className="hidden md:inline text-[11px] font-mono font-bold">Drawer</span>
          </button>
        )}

        <div className="h-6 w-[2px] bg-stone-900/20 hidden sm:block" />

        <div className="flex items-center gap-3">
          {/* Elongated, Prominent PocketCloud Brand Header Lockup */}
          <div className="h-12 px-4 bg-white rounded-2xl border-2 border-stone-900 flex items-center gap-3.5 shadow-[3px_3px_0px_#18181B] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#18181B] transition-all cursor-default">
            <img 
              src="/pocketcloud-logo-transparent.png" 
              alt="PocketCloud" 
              className="h-8 md:h-10 w-auto max-w-[260px] md:max-w-[300px] object-contain select-none drop-shadow-sm" 
            />

            {/* Version Badge */}
            <span className="retro-badge bg-[#C7F9CC] text-stone-900 text-[10px] font-black border border-stone-900 shadow-[1px_1px_0px_#18181B] self-center">
              <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>

      {/* Retro Telemetry Pills */}
      <div className="flex items-center gap-3">
        {/* Docker Badge */}
        <div className="retro-card px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-stone-800 bg-[#E9D5FF]">
          <ShieldCheck className={`w-4 h-4 ${capabilities?.docker_available ? 'text-emerald-700' : 'text-amber-700'}`} />
          <span className="text-stone-700">Docker:</span>
          <span className="font-black">
            {capabilities?.docker_available ? capabilities.docker_version : 'Offline'}
          </span>
        </div>

        {/* CPU & Memory */}
        <div className="retro-card px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-stone-800 bg-[#FEF08A]">
          <Cpu className="w-4 h-4 text-stone-900" />
          <span>{capabilities?.cpu_cores || 8} vCPUs</span>
          <span className="text-stone-400">|</span>
          <HardDrive className="w-4 h-4 text-stone-900" />
          <span>
            {capabilities ? `${Math.round(capabilities.available_memory_mb / 1024)}GB Free` : '16GB'}
          </span>
        </div>

        {/* Host Gateway Link */}
        <a
          href={capabilities?.gateway_url || 'http://127.0.0.1:18080'}
          target="_blank"
          rel="noreferrer"
          className="retro-btn px-3 py-1.5 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 text-xs font-bold gap-2"
          title="Open local Host-Browser Gateway in host PC browser"
        >
          <Globe className="w-4 h-4 text-stone-900" />
          <span>Gateway: 127.0.0.1:18080</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>
      </div>
    </header>
  );
};
