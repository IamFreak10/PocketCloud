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
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'labs' as NavTab, label: 'My Labs', icon: Layers, badge: activeLabCount > 0 ? activeLabCount : undefined },
    { id: 'designer' as NavTab, label: 'Lab Designer', icon: Network },
    { id: 'terminal' as NavTab, label: 'Virtual VPS & Terminal', icon: Terminal },
    { id: 'browser' as NavTab, label: 'Built-in Browser', icon: Compass },
    { id: 'web' as NavTab, label: 'Web Servers & VHosts', icon: Server },
    { id: 'dns' as NavTab, label: 'Domains & DNS', icon: Globe },
    { id: 'databases' as NavTab, label: 'Real Databases', icon: Database },
    { id: 'diagnostics' as NavTab, label: 'Network Tester', icon: Activity },
    { id: 'gateway' as NavTab, label: 'Host Gateway Bridge', icon: Share2 },
    { id: 'missions' as NavTab, label: 'Learning Missions', icon: Award },
    { id: 'settings' as NavTab, label: 'Settings & Quotas', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d16] border-r border-gray-800 flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Navigation
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#131b2a]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {item.badge} active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-2 mb-1 text-gray-300 font-semibold">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          <span>Local Sandbox</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Running safely on your PC without external cloud costs or public IP exposure.
        </p>
      </div>
    </aside>
  );
};
