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

    await new Promise((r) => setTimeout(r, 60));
    const end = performance.now();
    const latency = Math.round(end - start);

    if (match) {
      setTestResult({
        status: 'FOUND',
        resolved: match.value,
        recordType: match.record_type,
        ttl: match.ttl,
        latencyMs: latency,
      });
    } else {
      setTestResult({
        status: 'NXDOMAIN',
        latencyMs: latency,
        details: `Name Error (NXDOMAIN): No authoritative DNS record found for '${clean}' in NetLab zone.`,
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-2 border-stone-900 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#BAE6FD] border-2 border-stone-900 rounded-xl text-stone-900 shadow-[3px_3px_0px_#18181B]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-2">
              Virtual Internet & Authoritative DNS Manager
            </h1>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              Create fake domains (.test, .example, .local) and route them to running lab web servers without touching /etc/hosts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#C7F9CC] text-stone-900 border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Virtual DNS Engine: Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Record List & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Record Card */}
          <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <h2 className="text-sm font-black text-stone-900 ml-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-stone-900" />
                  <span>Create Virtual DNS Record</span>
                </h2>
              </div>
            </div>

            <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  Domain Name (FQDN)
                </label>
                <input
                  type="text"
                  required
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. shop.test or api.shop.test"
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  Record Type
                </label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value as any)}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold shadow-[2px_2px_0px_#18181B] focus:outline-none"
                >
                  <option value="A">A (Address Mapping)</option>
                  <option value="CNAME">CNAME (Alias to Canonical Name)</option>
                  <option value="TXT">TXT (Text / Verification)</option>
                  <option value="MX">MX (Mail Exchange)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  Target Lab Web Server / Component
                </label>
                <select
                  value={targetCompId}
                  onChange={(e) => setTargetCompId(e.target.value)}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold shadow-[2px_2px_0px_#18181B] focus:outline-none"
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
                <label className="block text-xs font-black text-stone-800 mb-1">
                  TTL (Seconds)
                </label>
                <input
                  type="number"
                  value={ttlInput}
                  onChange={(e) => setTtlInput(Number(e.target.value))}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!domainInput.trim()}
                  className="retro-btn px-5 py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 font-black text-xs shadow-[3px_3px_0px_#18181B] disabled:opacity-40 cursor-pointer"
                >
                  Add Authoritative DNS Record
                </button>
              </div>
            </form>
          </div>

          {/* Records Table */}
          <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-900" />
                <h2 className="text-sm font-black text-stone-900">
                  Active DNS Zone Records ({records.length})
                </h2>
              </div>
              <button
                onClick={fetchRecords}
                className="retro-btn px-2.5 py-1 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs font-black shadow-[2px_2px_0px_#18181B] cursor-pointer"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b-2 border-stone-900 bg-[#FAF7EE] text-stone-800 font-sans font-black">
                    <th className="p-3">Domain</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Target Destination</th>
                    <th className="p-3">TTL</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-stone-200">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF7EE]/70 transition">
                      <td className="p-3 font-black text-blue-700">{r.domain}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-[#BAE6FD] text-stone-900 font-black border border-stone-900 text-[10px] shadow-[1px_1px_0px_#18181B]">
                          {r.record_type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-700">{r.value}</td>
                      <td className="p-3 text-stone-600 font-bold">{r.ttl}s</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setTestDomain(r.domain);
                            handleDnsLookup(r.domain);
                          }}
                          className="retro-btn px-2.5 py-1 bg-[#F3E8FF] hover:bg-[#e9d5ff] text-stone-900 rounded-lg text-[11px] font-sans font-black shadow-[2px_2px_0px_#18181B] cursor-pointer"
                        >
                          Query DNS
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-500 font-sans font-medium">
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
          <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B]">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900 mb-3">
              <Search className="w-4 h-4 text-stone-900" />
              <h2 className="text-sm font-black text-stone-900">DNS Resolver Test Tool</h2>
            </div>
            <p className="text-xs text-stone-600 mb-4 font-medium leading-relaxed">
              Query the virtual DNS resolver directly to inspect resolution latency, authoritative answers, or verify NXDOMAIN failures.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                placeholder="shop.test"
                className="flex-1 bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] focus:outline-none"
              />
              <button
                onClick={() => handleDnsLookup(testDomain)}
                className="retro-btn px-4 py-2 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] cursor-pointer"
              >
                Resolve
              </button>
            </div>

            {/* Test Result Box */}
            {testResult.status !== 'IDLE' && (
              <div
                className={`p-4 rounded-xl border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] text-xs font-mono leading-relaxed ${
                  testResult.status === 'FOUND'
                    ? 'bg-[#C7F9CC] text-stone-900'
                    : 'bg-[#FECDD3] text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-black mb-2">
                  {testResult.status === 'FOUND' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                      <span>DNS Answer: NOERROR (Found)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-800" />
                      <span>DNS Status: NXDOMAIN (Non-Existent)</span>
                    </>
                  )}
                </div>

                {testResult.status === 'FOUND' ? (
                  <div className="space-y-1 text-[11px] font-bold">
                    <div>Domain: <b>{testDomain}</b></div>
                    <div>Type: <b>{testResult.recordType}</b></div>
                    <div>Answer: <b className="text-stone-900 underline">{testResult.resolved}</b></div>
                    <div>TTL: {testResult.ttl}s</div>
                    <div>Resolver Latency: {testResult.latencyMs} ms</div>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-rose-900">
                    {testResult.details}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Educational Note */}
          <div className="retro-window bg-[#FEF08A] border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] text-xs text-stone-800 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-black">
              <HelpCircle className="w-4 h-4" />
              <span>How NetLab Virtual DNS Works</span>
            </div>
            <p className="leading-relaxed font-medium">
              NetLab does <b>not</b> modify your computer’s <code>/etc/hosts</code> or system DNS.
            </p>
            <p className="leading-relaxed font-medium">
              Instead, all requests from the <b>Built-in NetLab Browser</b> route through the safe local bridge (<code>127.0.0.1:{gatewayPort}</code>). The bridge inspects the <code>Host</code> header, resolves it via NetLab’s authoritative in-memory DNS table, and proxies traffic directly to the right container!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
