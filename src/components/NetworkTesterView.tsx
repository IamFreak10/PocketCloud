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
    <div className="p-8 h-full overflow-y-auto bg-[#090d16] text-slate-100 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-950/80 border border-blue-800 rounded-xl text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Worldwide Network Tester & Diagnostics
              </h1>
              <p className="text-xs text-gray-400">
                End-to-end DNS lookup, TCP reachability, HTTP latency, and failure analysis for virtual and local network targets
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Diagnostic Engine: Online</span>
          </span>
        </div>
      </div>

      {/* Target Input Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl mb-6">
        <label className="block text-xs font-semibold text-gray-300 mb-2">
          Network Target (URL, Fake Domain, or IP:Port)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="http://shop.test or http://127.0.0.1:18081"
            className="flex-1 bg-[#0b0f19] border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
          />
          <button
            onClick={() => handleRunProbe(targetInput)}
            disabled={loading || !targetInput.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Diagnostics...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Run Network Probe</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 mt-4 flex-wrap text-xs">
          <span className="text-gray-500 font-semibold">Test Presets:</span>
          {presets.map((p) => (
            <button
              key={p.url}
              onClick={() => {
                setTargetInput(p.url);
                handleRunProbe(p.url);
              }}
              className="px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-750 text-gray-300 border border-gray-700 hover:border-cyan-500 text-[11px] font-mono transition cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostics Results View */}
      {result && (
        <div className="space-y-6">
          {/* Main Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: DNS Resolution */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>DNS Resolution</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {result.resolved_ip ? (
                  <span className="text-emerald-400">{result.resolved_ip}</span>
                ) : (
                  <span className="text-rose-400">NXDOMAIN</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {result.resolved_ip
                  ? 'Authoritative Virtual DNS match'
                  : 'Domain does not exist in DNS'}
              </p>
            </div>

            {/* Card 2: TCP Port Status */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>TCP Port :{result.port}</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-lg font-bold font-mono">
                {result.is_port_open ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" /> Open / Listening
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-5 h-5" /> Refused / Closed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {result.is_port_open
                  ? 'Socket connection established'
                  : 'Connection refused by kernel'}
              </p>
            </div>

            {/* Card 3: HTTP Response Code */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>HTTP Status</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold font-mono">
                {result.http_status ? (
                  <span
                    className={
                      result.http_status < 400 ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    HTTP {result.http_status}
                  </span>
                ) : (
                  <span className="text-rose-400">No Response</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {result.http_status === 200
                  ? '200 OK — Website healthy'
                  : result.http_status
                  ? `Status code ${result.http_status}`
                  : 'No HTTP handshake formed'}
              </p>
            </div>

            {/* Card 4: Round-Trip Latency */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Probe Latency</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">
                {result.latency_ms} ms
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Local loopback virtual network latency
              </p>
            </div>
          </div>

          {/* Hop Path Visualization */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Diagnostic Packet Hop Path</span>
            </h3>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-4 bg-[#090d16] border border-gray-800 rounded-xl text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Client (NetLab Tester)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />

              <div className="flex items-center gap-2 text-blue-300">
                <span>NetLab Bridge (127.0.0.1:18080)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />

              <div className="flex items-center gap-2 text-purple-300">
                <span>DNS Zone ({result.resolved_ip || 'NXDOMAIN'})</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />

              <div
                className={`flex items-center gap-2 font-bold ${
                  result.is_port_open ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>
                  Target Service (:{result.port}) —{' '}
                  {result.is_port_open ? 'REACHED' : 'UNREACHABLE'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Root Cause & Response Headers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Diagnostic Findings */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Root Cause & Failure Diagnosis</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-mono bg-[#090d16] p-4 rounded-xl border border-gray-800 mb-4">
                {result.diagnostics}
              </p>

              {!result.is_port_open && (
                <div className="bg-rose-950/40 border border-rose-900/80 p-4 rounded-xl text-xs text-rose-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>How to fix this issue:</span>
                  </div>
                  <div>1. Open <b>My Labs</b> tab and ensure your Web Server or VPS container is started.</div>
                  <div>2. If using fake domains, open <b>Domains & DNS</b> and ensure an A record maps to port 18081.</div>
                </div>
              )}
            </div>

            {/* Box 2: Response Headers */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Observed Response Headers ({Object.keys(result.headers).length})</span>
              </h3>
              <div className="bg-[#090d16] border border-gray-800 rounded-xl p-4 max-h-56 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
                {Object.keys(result.headers).length > 0 ? (
                  Object.entries(result.headers).map(([k, v]) => (
                    <div key={k} className="flex">
                      <span className="text-cyan-400 font-semibold w-36 shrink-0">{k}:</span>
                      <span className="text-gray-200 truncate">{v}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 italic">No headers received</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
