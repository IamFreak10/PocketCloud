import React, { useState } from 'react';
import {
  Activity,
  Globe,
  Server,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { NetworkProbeResult } from '../types';
import { api } from '../services/api';

export const NetworkTesterView: React.FC = () => {
  const [targetInput, setTargetInput] = useState('http://shop.test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NetworkProbeResult | null>(null);

  const presets = [
    { label: 'shop.test (Virtual Domain)', url: 'http://shop.test' },
    { label: 'api.shop.test (API Domain)', url: 'http://api.shop.test' },
    { label: '127.0.0.1:18080 (NetLab Gateway)', url: 'http://127.0.0.1:18080' },
    { label: '127.0.0.1:18081 (Nginx Direct)', url: 'http://127.0.0.1:18081' },
    { label: 'broken.test (Intentional NXDOMAIN)', url: 'http://broken.test' },
  ];

  const handleRunProbe = async (target: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.probeNetworkTarget(target);
      setResult(res);
    } catch (err: unknown) {
      setResult({
        target,
        port: 80,
        is_port_open: false,
        latency_ms: 0,
        headers: {},
        diagnostics: `Probe failed with error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#FAF7EE] text-stone-900 select-none space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-2 border-stone-900 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-[#BAE6FD] border-2 border-stone-900 rounded-xl text-stone-900 shadow-[3px_3px_0px_#18181B]">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                Network Probe & Diagnostic Suite
              </h1>
              <p className="text-xs text-stone-600 font-medium">
                Test connectivity, port reachability, DNS resolutions, and HTTP headers across the virtual net.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#C7F9CC] text-stone-900 border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-700 animate-pulse" />
            <span>Loopback Engine: Active</span>
          </span>
        </div>
      </div>

      {/* Target input and Presets Card */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
          </div>
          <h2 className="text-sm font-black text-stone-900">Target Endpoint Probe</h2>
        </div>

        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="http://shop.test"
            className="flex-1 bg-white border-2 border-stone-900 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] focus:outline-none"
          />
          <button
            onClick={() => handleRunProbe(targetInput)}
            disabled={loading || !targetInput.trim()}
            className="retro-btn px-6 py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 rounded-xl text-xs font-black shadow-[3px_3px_0px_#18181B] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{loading ? 'Probing...' : 'Dispatch Probe'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <span className="text-xs font-bold text-stone-600 mr-1">Quick Targets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTargetInput(p.url);
                handleRunProbe(p.url);
              }}
              className="retro-btn px-2.5 py-1 bg-white hover:bg-[#FEF08A] text-stone-800 rounded-lg text-xs font-bold shadow-[1px_1px_0px_#18181B] cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
            <div className="flex items-center gap-2">
              <span className="font-black text-stone-900 text-sm">Probe Diagnostic Result:</span>
              <span className="font-mono text-xs font-bold text-blue-700 bg-[#BAE6FD] px-2.5 py-0.5 rounded-full border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                {result.target}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 font-mono bg-[#FAF7EE] px-2.5 py-1 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {result.latency_ms} ms
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B]">
              <div className="text-[11px] font-bold text-stone-600 mb-1">Target Port</div>
              <div className="text-base font-black text-stone-900 font-mono">Port {result.port}</div>
            </div>

            <div className="p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B]">
              <div className="text-[11px] font-bold text-stone-600 mb-1">Port Status</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${
                    result.is_port_open ? 'bg-[#86EFAC]' : 'bg-[#FDA4AF]'
                  }`}
                />
                <span className="text-sm font-black text-stone-900">
                  {result.is_port_open ? 'Open & Listening' : 'Closed / Unreachable'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B]">
              <div className="text-[11px] font-bold text-stone-600 mb-1">HTTP Response Code</div>
              <div className="text-base font-black text-stone-900 font-mono">
                {result.http_status ? (
                  <span className={result.http_status < 400 ? 'text-emerald-700' : 'text-rose-700'}>
                    HTTP {result.http_status}
                  </span>
                ) : (
                  <span className="text-stone-500">None (TCP Level)</span>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostics Message */}
          {result.diagnostics && (
            <div className="p-3.5 bg-[#F4EEDC] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] text-xs font-mono text-stone-800 font-bold">
              {result.diagnostics}
            </div>
          )}

          {/* Headers Table */}
          {Object.keys(result.headers).length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">
                Received HTTP Response Headers:
              </h3>
              <div className="retro-window bg-white border-2 border-stone-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_#18181B]">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#FAF7EE] border-b-2 border-stone-900 text-stone-800 font-sans font-black">
                      <th className="p-2.5">Header Name</th>
                      <th className="p-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-stone-200">
                    {Object.entries(result.headers).map(([key, val], idx) => (
                      <tr key={idx} className="hover:bg-[#FAF7EE]/70">
                        <td className="p-2.5 font-bold text-stone-800">{key}</td>
                        <td className="p-2.5 text-stone-600 font-medium truncate max-w-md">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
