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
  Activity,
  Layers,
  Terminal,
  Server,
  Zap,
} from 'lucide-react';
import { Lab, NetworkProbeResult } from '../types';
import { api } from '../services/api';

interface BuiltinBrowserViewProps {
  currentLab: Lab | null;
  gatewayPort: number;
}

export const BuiltinBrowserView: React.FC<BuiltinBrowserViewProps> = ({
  currentLab,
  gatewayPort,
}) => {
  const [urlInput, setUrlInput] = useState('http://shop.test');
  const [currentUrl, setCurrentUrl] = useState('http://shop.test');
  const [history, setHistory] = useState<string[]>(['http://shop.test']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(true);
  const [probeResult, setProbeResult] = useState<NetworkProbeResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Suggested bookmarks based on lab routes and gateway
  const bookmarks = [
    { name: 'shop.test (Storefront)', url: 'http://shop.test', target: 'Nginx' },
    { name: 'api.shop.test (API)', url: 'http://api.shop.test', target: 'Nginx / Node' },
    { name: 'Gateway Dashboard', url: `http://127.0.0.1:${gatewayPort}/`, target: 'NetLab Loopback' },
  ];

  // Navigate to URL
  const navigateTo = async (url: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    setUrlInput(cleanUrl);
    setCurrentUrl(cleanUrl);
    setIsLoading(true);

    // Update history
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(cleanUrl);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    // Perform live backend probe for diagnostics inspector
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
    // Initial probe on mount
    navigateTo(currentUrl);
  }, []);

  const handleBack = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setUrlInput(prev);
      setCurrentUrl(prev);
      api.probeNetworkTarget(prev).then(setProbeResult).catch(() => setProbeResult(null));
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setUrlInput(next);
      setCurrentUrl(next);
      api.probeNetworkTarget(next).then(setProbeResult).catch(() => setProbeResult(null));
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    api.probeNetworkTarget(currentUrl).then(setProbeResult).catch(() => setProbeResult(null)).finally(() => setIsLoading(false));
  };

  // Construct actual iframe src via local Host-Browser gateway bridge
  const getIframeSrc = () => {
    const gatewayBase = `http://127.0.0.1:${gatewayPort}`;
    if (currentUrl.includes(`127.0.0.1:${gatewayPort}`)) {
      return currentUrl;
    }
    return `${gatewayBase}/browse?url=${encodeURIComponent(currentUrl)}`;
  };

  const isHttps = currentUrl.startsWith('https://');

  return (
    <div className="flex flex-col h-full bg-[#070a12] text-slate-100 select-none">
      {/* Top Browser Bar */}
      <div className="bg-[#0f172a] border-b border-slate-800 p-2.5 flex items-center gap-3">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReload}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ${
              isLoading ? 'animate-spin text-cyan-400' : ''
            }`}
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo(`http://127.0.0.1:${gatewayPort}/`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="NetLab Gateway Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibar / Address Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(urlInput);
          }}
          className="flex-1 flex items-center bg-[#090d16] border border-slate-700/80 focus-within:border-cyan-500 rounded-xl px-3 py-1.5 transition shadow-inner"
        >
          <div className="flex items-center gap-1.5 text-xs font-mono mr-2">
            {isHttps ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                https://
              </span>
            ) : (
              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                http://
              </span>
            )}
          </div>

          <input
            type="text"
            value={urlInput.replace(/^https?:\/\//, '')}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="shop.test or app.example"
            className="flex-1 bg-transparent text-sm text-slate-100 font-mono focus:outline-none placeholder-slate-600"
          />

          {isLoading && (
            <span className="text-[11px] text-cyan-400 animate-pulse font-mono mr-2">
              Resolving DNS...
            </span>
          )}

          <button
            type="submit"
            className="text-xs bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer"
          >
            Go
          </button>
        </form>

        {/* Direct Open in Host Browser */}
        <a
          href={getIframeSrc()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          title="Open through Gateway in Host Browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Host Browser</span>
        </a>

        {/* Toggle Inspector */}
        <button
          onClick={() => setInspectOpen(!inspectOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
            inspectOpen
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Network Inspector</span>
        </button>
      </div>

      {/* Bookmarks Bar */}
      <div className="bg-[#0b101d] border-b border-slate-800/80 px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Quick Domains:
        </span>
        {bookmarks.map((b) => (
          <button
            key={b.url}
            onClick={() => navigateTo(b.url)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition cursor-pointer ${
              currentUrl === b.url
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>{b.name}</span>
          </button>
        ))}

        {/* Dynamic routes from active lab */}
        {currentLab?.routes.map((r) => (
          <button
            key={r.id}
            onClick={() => navigateTo(`http://${r.domain}`)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-700 text-[11px] font-mono text-slate-300 transition"
          >
            <span>{r.domain}</span>
          </button>
        ))}
      </div>

      {/* Content Area + Diagnostics Drawer */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Live Web Content Frame */}
        <div className="flex-1 bg-white relative">
          <iframe
            ref={iframeRef}
            src={getIframeSrc()}
            title="NetLab Built-in Browser Viewport"
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

        {/* Collapsible Network Diagnostics Inspector */}
        {inspectOpen && (
          <div className="h-64 bg-[#0a0f1d] border-t border-slate-800 flex flex-col shrink-0">
            {/* Inspector Header */}
            <div className="bg-[#0d1424] px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-200">
                  HTTP & DNS Diagnostics for <code className="text-cyan-300 font-mono">{currentUrl}</code>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {probeResult && (
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                      probeResult.http_status && probeResult.http_status < 400
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    HTTP {probeResult.http_status || 'Connection Error'}
                  </span>
                )}
                {probeResult && (
                  <span className="text-[11px] font-mono text-slate-400">
                    ⏱ Latency: <b className="text-slate-200">{probeResult.latency_ms} ms</b>
                  </span>
                )}
              </div>
            </div>

            {/* Inspector Details Grid */}
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto text-xs font-mono">
              {/* Box 1: DNS Resolution Path */}
              <div className="bg-[#060911] border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Virtual DNS Resolution</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>Target Host: <b className="text-white">{currentUrl.replace(/^https?:\/\//, '').split('/')[0]}</b></div>
                  <div>DNS Engine Status: <span className="text-emerald-400">Authoritative Active</span></div>
                  <div>
                    Resolved Target: <b className="text-cyan-300">{probeResult?.resolved_ip || 'NXDOMAIN'}</b>
                  </div>
                  <div>
                    Port Open (TCP):{' '}
                    {probeResult?.is_port_open ? (
                      <span className="text-emerald-400 font-bold">Yes (Listening)</span>
                    ) : (
                      <span className="text-rose-400 font-bold">No (Closed / Refused)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Response Headers */}
              <div className="bg-[#060911] border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <Server className="w-3.5 h-3.5" />
                  <span>HTTP Response Headers</span>
                </div>
                <div className="space-y-1 text-slate-400 text-[11px] max-h-36 overflow-y-auto">
                  {probeResult && Object.keys(probeResult.headers).length > 0 ? (
                    Object.entries(probeResult.headers).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-slate-500">{k}:</span>{' '}
                        <span className="text-slate-200">{v}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 italic">No headers received yet</div>
                  )}
                </div>
              </div>

              {/* Box 3: Root Cause & Troubleshooting Diagnostics */}
              <div className="bg-[#060911] border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Real-time Diagnostics</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px] mb-2">
                  {probeResult?.diagnostics || 'Testing connection to virtual network...'}
                </p>
                {probeResult && !probeResult.is_port_open && (
                  <div className="bg-amber-950/40 border border-amber-900 text-amber-300 p-2 rounded-lg text-[10px] leading-tight">
                    💡 <b>Actionable Fix:</b> Ensure the target web container (e.g. Nginx) is started in the <b>My Labs</b> tab and listening on its mapped port.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
