import React, { useState } from 'react';
import { Globe, ArrowRight, ExternalLink, ShieldCheck, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GatewayRoute, Lab } from '../types';

interface GatewayViewProps {
  currentLab: Lab | null;
  gatewayPort: number;
}

export const GatewayView: React.FC<GatewayViewProps> = ({ currentLab, gatewayPort }) => {
  const [testDomain, setTestDomain] = useState('app.localhost');
  const [testResult, setTestResult] = useState<{
    status: number;
    body: string;
    loading: boolean;
  } | null>(null);

  const handleTestRoute = async () => {
    setTestResult({ status: 0, body: '', loading: true });
    try {
      const targetUrl = `http://127.0.0.1:${gatewayPort}/`;
      const res = await fetch(targetUrl);
      const text = await res.text();
      setTestResult({
        status: res.status,
        body: text.substring(0, 500),
        loading: false,
      });
    } catch (err: unknown) {
      setTestResult({
        status: 502,
        body: `Connection error: ${err instanceof Error ? err.message : String(err)}. Make sure the component container is running.`,
        loading: false,
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 select-none">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Host-Browser Gateway Bridge</h1>
        <p className="text-xs text-gray-400 mt-1">
          Bridge internal lab subnets and virtual domains to your host PC browser safely via loopback.
        </p>
      </div>

      {/* Explainer card */}
      <div className="bg-[#0f172a] border border-cyan-800/40 rounded-xl p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-950 rounded-xl border border-cyan-800 text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">
              How the NetLab Virtual Internet Bridge Works
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              Standard local hostnames like <code>shop.test</code> don't automatically resolve on your host OS.
              NetLab runs a high-performance HTTP reverse proxy on loopback (<code>127.0.0.1:{gatewayPort}</code>).
              Modern browsers natively resolve any <code>*.localhost</code> subdomains directly to <code>127.0.0.1</code> (RFC 6761)
              without requiring root permissions or editing <code>/etc/hosts</code>.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`http://127.0.0.1:${gatewayPort}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
              >
                <span>Open Gateway Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Active Domain Routes */}
      <div className="bg-[#0d1424] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#111a2d]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Virtual Domain Mappings for Current Lab</span>
          </h2>
          <span className="text-xs text-gray-400">
            {currentLab?.routes.length || 0} registered routes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090d16] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Virtual Host / Domain</th>
                <th className="p-4">Target Component</th>
                <th className="p-4">Internal Port</th>
                <th className="p-4">Host Loopback Link</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {currentLab?.routes.map((route) => {
                const comp = currentLab.components.find((c) => c.id === route.target_component_id);
                const isRunning = comp?.status === 'running';

                return (
                  <tr key={route.id} className="hover:bg-[#121c33]/50 transition">
                    <td className="p-4 font-mono font-semibold text-cyan-300">
                      http://{route.domain}:{gatewayPort}/
                    </td>
                    <td className="p-4 text-gray-300">{comp?.name || route.target_component_id}</td>
                    <td className="p-4 font-mono text-gray-400">{route.target_port}</td>
                    <td className="p-4 font-mono text-emerald-400">
                      127.0.0.1:{route.host_port}
                    </td>
                    <td className="p-4 text-right">
                      {isRunning ? (
                        <a
                          href={`http://127.0.0.1:${route.host_port}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs font-semibold transition"
                        >
                          <span>Open in Browser</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">Component Stopped</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!currentLab || currentLab.routes.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No virtual domain routes defined in this lab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Resolution Tester */}
      <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span>Virtual DNS & HTTP Probe</span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Test whether your lab's web servers are reachable through the local gateway bridge.
        </p>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={testDomain}
            onChange={(e) => setTestDomain(e.target.value)}
            className="flex-1 bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
            placeholder="e.g. app.localhost"
          />
          <button
            onClick={handleTestRoute}
            disabled={testResult?.loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send HTTP Probe</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 bg-[#0a0e17] rounded-lg border border-gray-800 font-mono text-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
              <span className="text-gray-400">Response Status:</span>
              <span
                className={`font-bold ${
                  testResult.status === 200 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                HTTP {testResult.status || '502 Bad Gateway'}
              </span>
            </div>
            <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-40">
              {testResult.body || '(No response body)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
