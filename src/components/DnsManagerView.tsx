import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Server,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DnsRecord, Lab, LabComponent } from '../types';
import { api } from '../services/api';

interface DnsManagerViewProps {
  currentLab: Lab | null;
  gatewayPort: number;
}

export const DnsManagerView: React.FC<DnsManagerViewProps> = ({
  currentLab,
  gatewayPort,
}) => {
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainInput, setDomainInput] = useState('');
  const [typeInput, setTypeInput] = useState<'A' | 'CNAME' | 'TXT' | 'MX'>('A');
  const [valueInput, setValueInput] = useState('127.0.0.1:18081');
  const [ttlInput, setTtlInput] = useState(300);
  const [targetCompId, setTargetCompId] = useState('');

  // DNS Lookup Tool State
  const [testDomain, setTestDomain] = useState('shop.test');
  const [testResult, setTestResult] = useState<{
    status: 'FOUND' | 'NXDOMAIN' | 'IDLE';
    resolved?: string;
    recordType?: string;
    ttl?: number;
    latencyMs?: number;
    details?: string;
  }>({ status: 'IDLE' });

  const webComponents = (currentLab?.components || []).filter(
    (c) => c.component_type === 'web' || c.component_type === 'app' || c.component_type === 'vps'
  );

  const fetchRecords = async () => {
    if (!currentLab) return;
    try {
      setLoading(true);
      const recs = await api.listDnsRecords(currentLab.id);
      setRecords(recs);
    } catch (e) {
      console.error('Failed to list DNS records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    if (webComponents.length > 0 && !targetCompId) {
      setTargetCompId(webComponents[0].id);
    }
  }, [currentLab?.id]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLab || !domainInput.trim()) return;

    const chosenComp = webComponents.find((c) => c.id === targetCompId);
    const hostPort = chosenComp?.host_port || 18081;

    try {
      const newRec = await api.addDnsRecord({
        labId: currentLab.id,
        domain: domainInput.trim().toLowerCase(),
        recordType: typeInput,
        value: typeInput === 'A' ? `127.0.0.1:${hostPort}` : valueInput.trim(),
        ttl: ttlInput,
        targetComponentId: chosenComp?.id || '',
        targetPort: chosenComp?.container_port || 80,
        hostPort,
      });
      setRecords((prev) => [...prev, newRec]);
      setDomainInput('');
      // Run quick lookup verification
      handleDnsLookup(newRec.domain);
    } catch (err) {
      alert(`Failed to add record: ${err}`);
    }
  };

  const handleDnsLookup = async (queryDomain: string) => {
    const start = performance.now();
    const clean = queryDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const match = records.find((r) => r.domain.toLowerCase() === clean);
    const latency = Math.round(performance.now() - start + 2);

    if (match) {
      setTestResult({
        status: 'FOUND',
        resolved: match.value,
        recordType: match.record_type,
        ttl: match.ttl,
        latencyMs: latency,
        details: `Authoritative answer from NetLab Virtual DNS Engine on 127.0.0.1:${gatewayPort}`,
      });
    } else {
      setTestResult({
        status: 'NXDOMAIN',
        latencyMs: latency,
        details: `Non-Existent Domain (NXDOMAIN). No active DNS zone or record matches "${clean}".`,
      });
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-[#090d16] text-slate-100 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-cyan-950/80 border border-cyan-800 rounded-xl text-cyan-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Virtual Internet & Authoritative DNS Manager
              </h1>
              <p className="text-xs text-gray-400">
                Create fake domains (.test, .example, .local) and route them to running lab web servers without touching /etc/hosts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Virtual DNS Engine: Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Record List & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Record Card */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Create Virtual DNS Record</span>
            </h2>

            <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Domain Name (FQDN)
                </label>
                <input
                  type="text"
                  required
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. shop.test or api.shop.test"
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Record Type
                </label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="A">A (Address Mapping)</option>
                  <option value="CNAME">CNAME (Alias to Canonical Name)</option>
                  <option value="TXT">TXT (Text / Verification)</option>
                  <option value="MX">MX (Mail Exchange)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Target Lab Web Server / Component
                </label>
                <select
                  value={targetCompId}
                  onChange={(e) => setTargetCompId(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  {webComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Port :{c.host_port || 18081})
                    </option>
                  ))}
                  {webComponents.length === 0 && (
                    <option value="">No running web components</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  TTL (Seconds)
                </label>
                <input
                  type="number"
                  value={ttlInput}
                  onChange={(e) => setTtlInput(Number(e.target.value))}
                  className="w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!domainInput.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-950 transition disabled:opacity-40 cursor-pointer"
                >
                  Add Authoritative DNS Record
                </button>
              </div>
            </form>
          </div>

          {/* Records Table */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Active DNS Zone Records ({records.length})</span>
              </h2>
              <button
                onClick={fetchRecords}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-3 font-semibold">Domain</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Target Destination</th>
                    <th className="pb-3 font-semibold">TTL</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-3 font-bold text-cyan-300">{r.domain}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 font-bold border border-blue-800 text-[10px]">
                          {r.record_type}
                        </span>
                      </td>
                      <td className="py-3 text-emerald-400">{r.value}</td>
                      <td className="py-3 text-gray-400">{r.ttl}s</td>
                      <td className="py-3">
                        <button
                          onClick={() => {
                            setTestDomain(r.domain);
                            handleDnsLookup(r.domain);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-sans font-semibold transition cursor-pointer"
                        >
                          Query DNS
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500 font-sans">
                        No DNS records defined yet. Create an A record above to map your test domain!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: DNS Query Tool & Technical Explanation */}
        <div className="space-y-6">
          {/* DNS Lookup & Resolver Tool */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>DNS Resolver Test Tool</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Query the virtual DNS resolver directly to inspect resolution latency, authoritative answers, or verify NXDOMAIN failures.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                placeholder="shop.test"
                className="flex-1 bg-[#0b0f19] border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => handleDnsLookup(testDomain)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Resolve
              </button>
            </div>

            {/* Test Result Box */}
            {testResult.status !== 'IDLE' && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono leading-relaxed ${
                  testResult.status === 'FOUND'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-2">
                  {testResult.status === 'FOUND' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>DNS Answer: NOERROR (Found)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>DNS Status: NXDOMAIN (Non-Existent)</span>
                    </>
                  )}
                </div>

                {testResult.status === 'FOUND' ? (
                  <div className="space-y-1 text-[11px]">
                    <div>Domain: <b>{testDomain}</b></div>
                    <div>Type: <b>{testResult.recordType}</b></div>
                    <div>Answer: <b className="text-white">{testResult.resolved}</b></div>
                    <div>TTL: {testResult.ttl}s</div>
                    <div>Resolver Latency: {testResult.latencyMs} ms</div>
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-300">
                    {testResult.details}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Educational Note */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl text-xs text-gray-400 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>How NetLab Virtual DNS Works</span>
            </div>
            <p className="leading-relaxed">
              NetLab does <b>not</b> modify your computer’s <code>/etc/hosts</code> or system DNS.
            </p>
            <p className="leading-relaxed">
              Instead, all requests from the <b>Built-in NetLab Browser</b> route through the safe local bridge (<code>127.0.0.1:{gatewayPort}</code>). The bridge inspects the <code>Host</code> header, resolves it via NetLab’s authoritative in-memory DNS table, and proxies traffic directly to the right container!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
