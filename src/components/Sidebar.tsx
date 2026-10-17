import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Network,
  Terminal,
  Server,
  Globe,
  Database,
  GitBranch,
  Award,
  Settings,
  Share2,
  Compass,
  Activity,
  Heart,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'labs'
  | 'designer'
  | 'terminal'
  | 'browser'
  | 'web'
  | 'dns'
  | 'databases'
  | 'diagnostics'
  | 'gateway'
  | 'missions'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeLabCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, activeLabCount }) => {
  const menuItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, color: '#C7F9CC' },
    { id: 'designer' as NavTab, label: 'Architecture Topology', icon: Network, color: '#BAE6FD' },
    { id: 'labs' as NavTab, label: 'My Labs', icon: Layers, badge: activeLabCount > 0 ? activeLabCount : undefined, color: '#FEF08A' },
    { id: 'terminal' as NavTab, label: 'Ubuntu VPS Terminal', icon: Terminal, color: '#FBCFE8' },
    { id: 'browser' as NavTab, label: 'Internet Simulator', icon: Compass, color: '#BAE6FD' },
    { id: 'web' as NavTab, label: 'Web Servers (Nginx)', icon: Server, color: '#FED7AA' },
    { id: 'dns' as NavTab, label: 'Virtual DNS Engine', icon: Globe, color: '#DDD6FE' },
    { id: 'databases' as NavTab, label: 'Databases (PostgreSQL)', icon: Database, color: '#C7F9CC' },
    { id: 'diagnostics' as NavTab, label: 'Network Prober', icon: Activity, color: '#FEF08A' },
    { id: 'gateway' as NavTab, label: 'Host Gateway Bridge', icon: Share2, color: '#E9D5FF' },
    { id: 'missions' as NavTab, label: 'Learning Missions', icon: Award, color: '#FBCFE8' },
    { id: 'settings' as NavTab, label: 'System Settings', icon: Settings, color: '#E2E8F0' },
  ];

  return (
    <aside className="w-64 bg-[#FAF7EE] border-r-2 border-stone-900 flex flex-col justify-between p-3 select-none shrink-0 shadow-[2px_0_0px_#18181B] z-10">
      <div className="space-y-1.5 overflow-y-auto pr-1">
        {/* PocketCloud Brand Banner */}
        <div className="mb-3 p-3 bg-white rounded-2xl border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] group hover:-translate-y-0.5 transition-all">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <img 
                src="/pocketcloud-logo-transparent.png" 
                alt="PocketCloud" 
                className="h-8.5 w-auto max-w-[195px] object-contain select-none" 
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-stone-900/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-stone-900 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-stone-600">Local Sandbox VPS</span>
              </div>
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-[#FEF08A] text-stone-900 rounded border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                v0.1.0
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-1 flex items-center justify-between text-[11px] font-black text-stone-600 uppercase tracking-wider font-mono">
          <span>System Explorer</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={isActive ? { backgroundColor: item.color } : {}}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] text-stone-900 translate-x-[1px]'
                  : 'text-stone-700 hover:bg-white hover:border-2 hover:border-stone-900/40 hover:shadow-[2px_2px_0px_#18181B]/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1 rounded-lg border border-stone-900/20 ${isActive ? 'bg-white/80' : 'bg-stone-200/60'}`}>
                  <Icon className="w-4 h-4 text-stone-900" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#86EFAC] text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Retro Footer Card */}
      <div className="p-3 bg-white rounded-xl border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] text-xs">
        <div className="flex items-center justify-between mb-1 text-stone-900 font-extrabold font-mono">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-stone-900" />
            <span>Local Network</span>
          </div>
          <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
        </div>
        <p className="text-[11px] font-medium text-stone-600 leading-tight">
          Simulated Internet & Virtual DNS active locally on your PC.
        </p>
      </div>
    </aside>
  );
};
