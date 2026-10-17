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
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🌉</span> Host-Browser Gateway Bridge
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-medium">
          Bridge internal lab subnets and virtual domains to your host PC browser safely via loopback.
        </p>
      </div>

      {/* Explainer card */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#BAE6FD] rounded-xl border-2 border-stone-900 text-stone-900 shadow-[2px_2px_0px_#18181B]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-stone-900 mb-1">
              How the NetLab Virtual Internet Bridge Works
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed mb-3 font-medium">
              Standard local hostnames like <code>shop.test</code> don't automatically resolve on your host OS.
              NetLab runs a high-performance HTTP reverse proxy on loopback (<code>127.0.0.1:{gatewayPort}</code>).
              Modern browsers natively resolve any <code>*.localhost</code> subdomains directly to <code>127.0.0.1</code> (RFC 6761)
              without requiring system root/administrator changes.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-3 py-1 bg-[#FEF08A] text-stone-900 rounded-lg border border-stone-900 font-bold shadow-[1px_1px_0px_#18181B]">
                RFC 6761 Compliant
              </span>
              <span className="px-3 py-1 bg-[#C7F9CC] text-stone-900 rounded-lg border border-stone-900 font-bold shadow-[1px_1px_0px_#18181B]">
                Zero Host File Changes
              </span>
              <span className="px-3 py-1 bg-[#F3E8FF] text-stone-900 rounded-lg border border-stone-900 font-bold shadow-[1px_1px_0px_#18181B]">
                Gateway Port :{gatewayPort}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Gateway Routes */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-stone-900" />
            <h2 className="text-sm font-black text-stone-900">
              Active Host Routes in Current Lab
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-stone-700 bg-[#FAF7EE] px-2.5 py-1 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
            Proxy: 127.0.0.1:{gatewayPort}
          </span>
        </div>

        <div className="space-y-3">
          {currentLab?.components.map((comp) => {
            const domain = `${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.localhost`;
            const isWeb = comp.component_type === 'web';
            const isVps = comp.component_type === 'vps';

            return (
              <div
                key={comp.id}
                className="flex items-center justify-between p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${
                      comp.status === 'running' ? 'bg-[#86EFAC]' : 'bg-stone-300'
                    }`}
                  />
                  <div>
                    <div className="font-black text-stone-900 text-xs font-mono">
                      http://{domain}:{gatewayPort}/
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5 flex items-center gap-1 font-medium">
                      <span>Routes to:</span>
                      <span className="font-mono font-bold text-stone-800">
                        {comp.name} ({comp.ip_address || '127.0.0.1'}:{comp.container_port || 80})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {comp.status === 'running' && (isWeb || isVps) && (
                    <a
                      href={`http://127.0.0.1:${gatewayPort}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test in Host Browser</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gateway Loopback Tester */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
          </div>
          <h2 className="text-sm font-black text-stone-900">
            Direct Gateway Loopback Test
          </h2>
        </div>

        <p className="text-xs text-stone-600 font-medium">
          Send a live HTTP request to your local gateway port (<code>127.0.0.1:{gatewayPort}</code>) to test reverse proxy health:
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleTestRoute}
            disabled={testResult?.loading}
            className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testResult?.loading ? 'Sending...' : 'Send Test Request'}</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 font-black">
              {testResult.status === 200 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-800">Status 200 OK — Proxy Operational</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span className="text-stone-900">Status {testResult.status}</span>
                </>
              )}
            </div>
            <pre className="p-3 bg-white border border-stone-900 rounded-lg text-stone-800 text-[11px] overflow-x-auto whitespace-pre-wrap font-bold">
              {testResult.body || '(Empty response body)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
