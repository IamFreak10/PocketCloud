import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  ShieldCheck,
  ShieldAlert,
  Globe,
  ExternalLink,
  Terminal,
  Server,
  Zap,
  Plus,
  X,
  Columns2,
  Sparkles,
  Send,
  Lock,
  Cpu,
  RefreshCw,
  Copy,
  Trash2,
  Check,
  Activity,
  Code,
  CheckCircle2,
} from 'lucide-react';
import { Lab, NetworkProbeResult } from '../types';
import { api } from '../services/api';
import { APP_VERSION } from '../version';

interface BuiltinBrowserViewProps {
  currentLab: Lab | null;
  gatewayPort: number;
}

interface ClientStation {
  id: string;
  name: string;
  location: string;
  flag: string;
  latencyMs: number;
  ip: string;
  mode: 'browser' | 'ssh' | 'split';
  url: string;
  urlInput: string;
  history: string[];
  historyIndex: number;
  sshComponentId?: string;
  sshLogs: { type: 'system' | 'cmd' | 'stdout' | 'stderr' | 'error'; text: string; time: string }[];
  sshInput: string;
  sshCwd: string;
  sshRunning: boolean;
  cmdHistory: string[];
  cmdHistoryIndex: number;
}

export const BuiltinBrowserView: React.FC<BuiltinBrowserViewProps> = ({
  currentLab,
  gatewayPort,
}) => {
  const vpsComponents = (currentLab?.components || []).filter(
    (c) => c.component_type === 'vps' || c.image.includes('ubuntu')
  );
  const defaultVpsId = vpsComponents[0]?.id || currentLab?.components[0]?.id || 'vps-node';

  // Multi-tab stations state with realistic simulated edge clients
  const [stations, setStations] = useState<ClientStation[]>([
    {
      id: 'station-1',
      name: 'Client Station 1',
      location: 'London, UK',
      flag: '🇬🇧',
      latencyMs: 1.2,
      ip: '10.99.1.101',
      mode: 'split',
      url: 'http://shop.test',
      urlInput: 'http://shop.test',
      history: ['http://shop.test'],
      historyIndex: 0,
      sshComponentId: defaultVpsId,
      sshLogs: [
        {
          type: 'system',
          text: '════════════════════════════════════════════════════════════════',
          time: 'BOOT',
        },
        {
          type: 'system',
          text: `● PocketCloud Secure SSH Terminal v${APP_VERSION} — Station 1 (London)`,
          time: 'BOOT',
        },
        {
          type: 'system',
          text: '● Connected to Virtual DNS Gateway (10.99.0.1) • Port 18022 (OpenSSH)',
          time: 'BOOT',
        },
        {
          type: 'system',
          text: '════════════════════════════════════════════════════════════════',
          time: 'BOOT',
        },
      ],
      sshInput: '',
      sshCwd: '/root',
      sshRunning: false,
      cmdHistory: [],
      cmdHistoryIndex: -1,
    },
    {
      id: 'station-2',
      name: 'Client Station 2',
      location: 'Tokyo, Japan',
      flag: '🇯🇵',
      latencyMs: 3.4,
      ip: '10.99.1.102',
      mode: 'browser',
      url: 'http://shop.test',
      urlInput: 'http://shop.test',
      history: ['http://shop.test'],
      historyIndex: 0,
      sshComponentId: defaultVpsId,
      sshLogs: [
        {
          type: 'system',
          text: '● PocketCloud Simulated Client Station 2 (Tokyo) active on 10.99.1.102',
          time: 'BOOT',
        },
        {
          type: 'system',
          text: '● Ready to probe virtual endpoints and run remote SSH sessions.',
          time: 'BOOT',
        },
      ],
      sshInput: '',
      sshCwd: '/root',
      sshRunning: false,
      cmdHistory: [],
      cmdHistoryIndex: -1,
    },
  ]);

  const [activeStationId, setActiveStationId] = useState<string>('station-1');
  const [probeResult, setProbeResult] = useState<NetworkProbeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activeStation = stations.find((s) => s.id === activeStationId) || stations[0];

  const updateActiveStation = (updater: (prev: ClientStation) => ClientStation) => {
    setStations((prev) =>
      prev.map((s) => (s.id === activeStation.id ? updater(s) : s))
    );
  };

  // Auto-scroll terminal on new logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeStation.sshLogs]);

  // Quick Bookmarks
  const bookmarks = [
    { name: 'shop.test', url: 'http://shop.test', color: '#FEF08A' },
    { name: 'portal.test', url: 'http://portal.test', color: '#C7F9CC' },
    { name: 'api.test', url: 'http://api.test', color: '#FED7AA' },
    { name: 'Gateway Hub (18080)', url: `http://127.0.0.1:${gatewayPort}/`, color: '#BAE6FD' },
  ];

  // Navigate URL
  const navigateTo = async (url: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    updateActiveStation((prev) => {
      const nextHistory = prev.history.slice(0, prev.historyIndex + 1);
      nextHistory.push(cleanUrl);
      return {
        ...prev,
        url: cleanUrl,
        urlInput: cleanUrl,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      };
    });

    setIsLoading(true);
    try {
      const probe = await api.probeNetworkTarget(cleanUrl);
      setProbeResult(probe);
    } catch {
      setProbeResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeStation) {
      api
        .probeNetworkTarget(activeStation.url)
        .then(setProbeResult)
        .catch(() => setProbeResult(null));
    }
  }, [activeStationId, activeStation?.url]);

  // Tab controls
  const stationPresets = [
    { location: 'Frankfurt, Germany', flag: '🇩🇪', latency: 1.8 },
    { location: 'Singapore', flag: '🇸🇬', latency: 2.5 },
    { location: 'San Francisco, US', flag: '🇺🇸', latency: 4.1 },
    { location: 'Sydney, Australia', flag: '🇦🇺', latency: 5.2 },
  ];

  const handleAddStation = () => {
    const nextNum = stations.length + 1;
    const preset = stationPresets[(nextNum - 1) % stationPresets.length];
    const newStation: ClientStation = {
      id: `station-${Date.now()}`,
      name: `Client Station ${nextNum}`,
      location: preset.location,
      flag: preset.flag,
      latencyMs: preset.latency,
      ip: `10.99.1.${100 + nextNum}`,
      mode: 'split',
      url: 'http://shop.test',
      urlInput: 'http://shop.test',
      history: ['http://shop.test'],
      historyIndex: 0,
      sshComponentId: defaultVpsId,
      sshLogs: [
        {
          type: 'system',
          text: `● Connected to Simulated Client Station #${nextNum} (${preset.location}) [10.99.1.${100 + nextNum}]`,
          time: new Date().toLocaleTimeString(),
        },
      ],
      sshInput: '',
      sshCwd: '/root',
      sshRunning: false,
      cmdHistory: [],
      cmdHistoryIndex: -1,
    };
    setStations((prev) => [...prev, newStation]);
    setActiveStationId(newStation.id);
  };

  const handleCloseStation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (stations.length <= 1) return;
    const next = stations.filter((s) => s.id !== id);
    setStations(next);
    if (activeStationId === id) {
      setActiveStationId(next[0].id);
    }
  };

  // SSH Command Execution
  const executeCommand = async (cmdText: string) => {
    const cmd = cmdText.trim();
    if (!cmd) return;

    const timeStr = new Date().toLocaleTimeString();
    const targetComp =
      (currentLab?.components || []).find((c) => c.id === activeStation.sshComponentId) ||
      currentLab?.components[0];

    updateActiveStation((prev) => ({
      ...prev,
      sshInput: '',
      sshRunning: true,
      cmdHistory: [...prev.cmdHistory, cmd],
      cmdHistoryIndex: -1,
      sshLogs: [
        ...prev.sshLogs,
        {
          type: 'cmd',
          text: `root@pocketcloud:${prev.sshCwd}# ${cmd}`,
          time: timeStr,
        },
      ],
    }));

    try {
      if (!targetComp) {
        throw new Error('No target VPS component found in current lab');
      }
      const res = await api.execCommand(
        targetComp.id,
        cmd,
        targetComp.runtime_mode,
        activeStation.sshCwd
      );

      updateActiveStation((prev) => ({
        ...prev,
        sshRunning: false,
        sshCwd: res.cwd || prev.sshCwd,
        sshLogs: [
          ...prev.sshLogs,
          ...(res.stdout
            ? [{ type: 'stdout' as const, text: res.stdout, time: timeStr }]
            : []),
          ...(res.stderr
            ? [{ type: 'stderr' as const, text: res.stderr, time: timeStr }]
            : []),
        ],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updateActiveStation((prev) => ({
        ...prev,
        sshRunning: false,
        sshLogs: [
          ...prev.sshLogs,
          { type: 'error' as const, text: `[SSH Execution Error]: ${msg}`, time: timeStr },
        ],
      }));
    }
  };

  const handleExecuteSsh = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(activeStation.sshInput);
  };

  // Quick Command Presets for SSH
  const quickCommands = [
    { label: 'Check Nginx', cmd: 'nginx -t', color: '#BAE6FD' },
    { label: 'Reload Nginx', cmd: 'nginx -s reload || systemctl reload nginx', color: '#C7F9CC' },
    { label: 'Curl Test Site', cmd: 'curl -I http://127.0.0.1', color: '#FEF08A' },
    { label: 'Web Root Files', cmd: 'ls -la /var/www/html /usr/share/nginx/html', color: '#FED7AA' },
    { label: 'Memory / Processes', cmd: 'ps aux | head -n 10', color: '#FBCFE8' },
  ];

  const handleCopyLogs = () => {
    const text = activeStation.sshLogs.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearTerminal = () => {
    updateActiveStation((prev) => ({
      ...prev,
      sshLogs: [
        {
          type: 'system',
          text: `● Terminal cleared at ${new Date().toLocaleTimeString()} by root user.`,
          time: new Date().toLocaleTimeString(),
        },
      ],
    }));
  };

  // Construct iframe src via Gateway
  const getIframeSrc = (url: string) => {
    const gatewayBase = `http://127.0.0.1:${gatewayPort}`;
    if (url.includes(`127.0.0.1:${gatewayPort}`)) return url;
    if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
      return url.startsWith('http') ? url : `http://${url}`;
    }
    return `${gatewayBase}/browse?url=${encodeURIComponent(url)}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7EE] text-stone-900 select-none p-4 gap-3">
      {/* Top Station Tabs & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Multi-Station Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {stations.map((st) => {
            const isActive = st.id === activeStationId;
            return (
              <div
                key={st.id}
                onClick={() => setActiveStationId(st.id)}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl text-xs font-black border-2 border-stone-900 cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#C7F9CC] shadow-[3px_3px_0px_#18181B] -translate-y-0.5'
                    : 'bg-white hover:bg-stone-100 shadow-[1px_1px_0px_#18181B] opacity-80'
                }`}
              >
                <span className="text-sm">{st.flag}</span>
                <div className="flex flex-col">
                  <span className="truncate max-w-[120px]">{st.name}</span>
                  <span className="text-[9px] font-mono font-bold text-stone-500">
                    {st.ip} • {st.latencyMs}ms
                  </span>
                </div>
                {stations.length > 1 && (
                  <button
                    onClick={(e) => handleCloseStation(st.id, e)}
                    className="p-0.5 hover:bg-stone-300 rounded-full transition text-stone-700"
                    title="Close Station"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddStation}
            className="retro-btn px-3 py-2 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs font-black gap-1.5 shrink-0"
            title="Launch Another Geographical Client Station inside Custom Internet"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Station</span>
          </button>
        </div>

        {/* View Mode Switcher (Browser, SSH, Split) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => updateActiveStation((p) => ({ ...p, mode: 'browser' }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeStation.mode === 'browser'
                ? 'bg-[#BAE6FD] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181B] text-stone-900'
                : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Browser View</span>
          </button>
          <button
            onClick={() => updateActiveStation((p) => ({ ...p, mode: 'ssh' }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeStation.mode === 'ssh'
                ? 'bg-[#FBCFE8] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181B] text-stone-900'
                : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SSH Terminal</span>
          </button>
          <button
            onClick={() => updateActiveStation((p) => ({ ...p, mode: 'split' }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeStation.mode === 'split'
                ? 'bg-[#C7F9CC] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181B] text-stone-900'
                : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* Retro Pastel Omnibar & Network DevTools Bar */}
      <div className="retro-window p-3 bg-white flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Window dots */}
          <div className="retro-dots mr-1 hidden sm:flex">
            <span className="retro-dot retro-dot-red" />
            <span className="retro-dot retro-dot-yellow" />
            <span className="retro-dot retro-dot-green" />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeStation.historyIndex > 0) {
                  const prev = activeStation.history[activeStation.historyIndex - 1];
                  updateActiveStation((p) => ({
                    ...p,
                    url: prev,
                    urlInput: prev,
                    historyIndex: p.historyIndex - 1,
                  }));
                }
              }}
              disabled={activeStation.historyIndex === 0}
              className="retro-btn p-1.5 bg-[#FAF7EE] text-stone-900 disabled:opacity-40"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (activeStation.historyIndex < activeStation.history.length - 1) {
                  const next = activeStation.history[activeStation.historyIndex + 1];
                  updateActiveStation((p) => ({
                    ...p,
                    url: next,
                    urlInput: next,
                    historyIndex: p.historyIndex + 1,
                  }));
                }
              }}
              disabled={activeStation.historyIndex >= activeStation.history.length - 1}
              className="retro-btn p-1.5 bg-[#FAF7EE] text-stone-900 disabled:opacity-40"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
                navigateTo(activeStation.url);
              }}
              className="retro-btn p-1.5 bg-[#FAF7EE] text-stone-900"
              title="Reload"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigateTo('http://shop.test')}
              className="retro-btn p-1.5 bg-[#FAF7EE] text-stone-900"
              title="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibar Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateTo(activeStation.urlInput);
            }}
            className="flex-1 flex items-center bg-[#FAF7EE] border-2 border-stone-900 rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_#18181B] min-w-[200px]"
          >
            <div className="flex items-center gap-1.5 mr-2 shrink-0">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">
                RFC 6761
              </span>
            </div>
            <input
              type="text"
              value={activeStation.urlInput}
              onChange={(e) => {
                const val = e.target.value;
                updateActiveStation((p) => ({ ...p, urlInput: val }));
              }}
              placeholder="Enter virtual domain e.g., http://shop.test or http://127.0.0.1:18080"
              className="flex-1 bg-transparent text-xs font-mono font-bold text-stone-900 focus:outline-none placeholder-stone-400"
            />
            <button
              type="submit"
              className="text-[10px] font-black uppercase font-mono px-2 py-0.5 bg-[#86EFAC] rounded border border-stone-900 shadow-[1px_1px_0px_#18181B] ml-2"
            >
              GO
            </button>
          </form>

          {/* External Host Gateway Link */}
          <a
            href={`http://127.0.0.1:${gatewayPort}`}
            target="_blank"
            rel="noreferrer"
            className="retro-btn px-3 py-1.5 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 text-xs font-bold gap-1.5 shrink-0"
            title="Open in your PC's Chrome / Edge browser via Host Loopback Bridge"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open in Host Browser</span>
          </a>
        </div>

        {/* Network DevTools Telemetry & Quick Bookmark Bar */}
        <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-stone-900/10 flex-wrap">
          {/* Bookmarks */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-black text-stone-500 uppercase">
              Targets:
            </span>
            {bookmarks.map((bm) => (
              <button
                key={bm.name}
                onClick={() => navigateTo(bm.url)}
                style={{ backgroundColor: bm.color }}
                className="retro-btn px-2 py-0.5 text-[10px] font-bold text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B]"
              >
                {bm.name}
              </button>
            ))}
          </div>

          {/* Live Telemetry Inspector */}
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            {probeResult?.http_status && (
              <span
                className={`px-2 py-0.5 rounded-full border border-stone-900 ${
                  probeResult.http_status === 200
                    ? 'bg-[#86EFAC] text-emerald-950'
                    : 'bg-[#FDA4AF] text-rose-950'
                } shadow-[1px_1px_0px_#18181B]`}
              >
                HTTP {probeResult.http_status}
              </span>
            )}
            {probeResult?.resolved_ip && (
              <span className="px-2 py-0.5 rounded-full bg-[#E9D5FF] text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                DNS: {probeResult.resolved_ip}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-[#FEF08A] text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B]">
              Ping: {activeStation.latencyMs}ms
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Browser, SSH, or Split View */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Browser Panel */}
        {(activeStation.mode === 'browser' || activeStation.mode === 'split') && (
          <div className="flex-1 retro-window flex flex-col bg-white overflow-hidden shadow-[4px_4px_0px_#18181B]">
            <div className="retro-window-header bg-[#C7F9CC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black font-mono">
                <Globe className="w-4 h-4 text-emerald-900" />
                <span>Simulated Web View: {activeStation.url}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-stone-900" />
                <span className="text-[10px] font-mono font-bold text-stone-700">
                  Sandboxed Sandbox Client
                </span>
              </div>
            </div>

            <div className="flex-1 relative bg-white">
              <iframe
                ref={iframeRef}
                src={getIframeSrc(activeStation.url)}
                className="w-full h-full border-0"
                title="Virtual Simulated Browser"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>

            <div className="px-3 py-1 bg-stone-100 border-t-2 border-stone-900 flex items-center justify-between text-[10px] font-mono text-stone-600">
              <span>Rendering Engine: WebKit/Blink Isolated Sandbox</span>
              <span>100% Zoom • UTF-8</span>
            </div>
          </div>
        )}

        {/* Professional SSH Terminal Station Panel */}
        {(activeStation.mode === 'ssh' || activeStation.mode === 'split') && (
          <div className="flex-1 retro-window flex flex-col bg-white overflow-hidden shadow-[4px_4px_0px_#18181B]">
            {/* Terminal Window Header */}
            <div className="retro-window-header bg-[#FBCFE8] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-black font-mono">
                <Terminal className="w-4 h-4 text-stone-900" />
                <span className="truncate">
                  SSH: {activeStation.name} ({activeStation.location})
                </span>
              </div>

              {/* Node Selector & Actions */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-700 font-mono">Target:</span>
                <select
                  value={activeStation.sshComponentId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    updateActiveStation((p) => ({ ...p, sshComponentId: cid }));
                  }}
                  className="bg-white border-2 border-stone-900 text-[11px] font-bold rounded-lg px-2 py-0.5 shadow-[1px_1px_0px_#18181B] outline-none"
                >
                  {(currentLab?.components || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.ip_address || '127.0.0.1'})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleCopyLogs}
                  className="p-1 bg-white hover:bg-stone-100 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]"
                  title="Copy Terminal Logs"
                >
                  {copiedLog ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-800" />
                  )}
                </button>
                <button
                  onClick={handleClearTerminal}
                  className="p-1 bg-white hover:bg-stone-100 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]"
                  title="Clear Terminal Output"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-800" />
                </button>
              </div>
            </div>

            {/* Quick Command Presets Toolbar */}
            <div className="px-3 py-1.5 bg-[#FAF7EE] border-b-2 border-stone-900 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-[10px] font-mono font-black text-stone-500 uppercase shrink-0">
                Quick Run:
              </span>
              {quickCommands.map((qc) => (
                <button
                  key={qc.label}
                  onClick={() => executeCommand(qc.cmd)}
                  disabled={activeStation.sshRunning}
                  style={{ backgroundColor: qc.color }}
                  className="retro-btn px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B] shrink-0"
                >
                  {qc.label}
                </button>
              ))}
            </div>

            {/* Authentic Dark Terminal Console interior */}
            <div className="flex-1 flex flex-col bg-[#080c14] p-4 text-slate-200 font-mono text-xs overflow-y-auto leading-relaxed select-text">
              {/* Connection Status Banner */}
              <div className="mb-3 pb-2 border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">LIVE SSH SESSION</span>
                  <span>•</span>
                  <span>SSH-2.0-OpenSSH_9.6p1 (Ubuntu 24.04)</span>
                </div>
                <span>Port 18022 • AES-256-GCM</span>
              </div>

              {/* Log stream */}
              <div className="flex-1 space-y-1.5">
                {activeStation.sshLogs.map((log, idx) => {
                  if (log.type === 'system') {
                    return (
                      <div key={idx} className="text-sky-400 font-medium">
                        {log.text}
                      </div>
                    );
                  }
                  if (log.type === 'cmd') {
                    return (
                      <div key={idx} className="pt-2 flex items-center gap-2 text-amber-300 font-bold">
                        <span>{log.text}</span>
                      </div>
                    );
                  }
                  if (log.type === 'stderr' || log.type === 'error') {
                    return (
                      <div key={idx} className="text-rose-400 bg-rose-950/30 p-1.5 rounded border border-rose-900/50">
                        {log.text}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="whitespace-pre-wrap text-emerald-300/90 font-mono">
                      {log.text}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>

              {/* Interactive SSH Command Form */}
              <form
                onSubmit={handleExecuteSsh}
                className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2 bg-[#0c1220] p-2 rounded-xl border border-slate-700/60"
              >
                <div className="flex items-center gap-1 shrink-0 font-bold text-xs select-none">
                  <span className="text-cyan-400">root@pocketcloud</span>
                  <span className="text-slate-500">:</span>
                  <span className="text-amber-400">{activeStation.sshCwd}</span>
                  <span className="text-emerald-400 font-black">#</span>
                </div>
                <input
                  type="text"
                  value={activeStation.sshInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateActiveStation((p) => ({ ...p, sshInput: val }));
                  }}
                  placeholder="e.g. cat /var/www/html/index.html, nginx -t, curl -I http://shop.test"
                  disabled={activeStation.sshRunning}
                  className="flex-1 bg-transparent text-emerald-300 font-mono text-xs focus:outline-none placeholder-slate-600"
                />
                {activeStation.sshRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <button
                    type="submit"
                    disabled={!activeStation.sshInput.trim()}
                    className="retro-btn px-2.5 py-1 bg-[#86EFAC] text-stone-900 text-xs font-bold disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
