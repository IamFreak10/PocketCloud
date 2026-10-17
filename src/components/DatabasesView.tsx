import React, { useState } from 'react';
import {
  Database,
  Play,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Table,
  Terminal,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Lab, SqlExecuteResult } from '../types';
import { api } from '../services/api';

interface DatabasesViewProps {
  currentLab: Lab | null;
}

export const DatabasesView: React.FC<DatabasesViewProps> = ({ currentLab }) => {
  const [selectedEngine, setSelectedEngine] = useState<'postgres' | 'mysql' | 'mariadb' | 'mongodb'>('postgres');
  const [queryInput, setQueryInput] = useState('SELECT * FROM customers;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlExecuteResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const dbComponent = currentLab?.components.find(
    (c) => c.component_type === 'database'
  );
  const isRunning = dbComponent?.status === 'running';

  const handleRunQuery = async () => {
    if (!dbComponent) {
      setQueryError('No database component found in current lab. Deploy one from My Labs.');
      return;
    }
    if (!isRunning) {
      setQueryError('Database container is currently stopped. Please start PostgreSQL in the My Labs tab first.');
      return;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const result = await api.executeDatabaseQuery(dbComponent.id, queryInput);
      if (result.error) {
        setQueryError(result.error);
      } else {
        setQueryResult(result);
      }
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const sampleQueries = [
    { label: 'View Customers', sql: 'SELECT * FROM customers;' },
    { label: 'Postgres Version', sql: 'SELECT version();' },
    { label: 'Count Records', sql: 'SELECT COUNT(*) FROM customers;' },
    { label: 'Insert Record', sql: "INSERT INTO customers (name, email) VALUES ('Apex Cloud', 'support@apexcloud.io');" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🗄️</span> Real Database Management
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-medium">
          Direct psql / SQL execution against real isolated PostgreSQL, MySQL, and MongoDB container instances.
        </p>
      </div>

      {/* Engine Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'postgres', name: 'PostgreSQL 16', port: 15432, desc: 'Active container instance' },
          { id: 'mysql', name: 'MySQL 8.4 LTS', port: 13306, desc: 'Enterprise relational DB' },
          { id: 'mariadb', name: 'MariaDB 11.4', port: 13307, desc: 'Open-source community DB' },
          { id: 'mongodb', name: 'MongoDB 7.0', port: 27017, desc: 'NoSQL Document Store' },
        ].map((engine) => (
          <button
            key={engine.id}
            onClick={() => setSelectedEngine(engine.id as any)}
            className={`retro-card p-4 text-left transition cursor-pointer border-2 border-stone-900 ${
              selectedEngine === engine.id
                ? 'bg-[#FEF08A] shadow-[4px_4px_0px_#18181B]'
                : 'bg-white hover:bg-[#FAF7EE] shadow-[2px_2px_0px_#18181B]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Database className="w-5 h-5 text-stone-900" />
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                Port :{engine.port}
              </span>
            </div>
            <div className="font-black text-sm text-stone-900">{engine.name}</div>
            <div className="text-[11px] text-stone-600 font-medium mt-0.5">{engine.desc}</div>
          </button>
        ))}
      </div>

      {/* Database Status Card */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F3E8FF] border-2 border-stone-900 rounded-xl text-stone-900 shadow-[2px_2px_0px_#18181B]">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-stone-900 text-sm">
                {dbComponent ? dbComponent.name : 'PostgreSQL Database Engine'}
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border border-stone-900 shadow-[1px_1px_0px_#18181B] ${
                  isRunning
                    ? 'bg-[#86EFAC] text-stone-900'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="text-xs text-stone-600 font-mono mt-1 font-medium">
              Image: {dbComponent?.image || 'postgres:alpine'} • Connection: postgresql://postgres:netlab@127.0.0.1:15432/netlab
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700 bg-[#FAF7EE] px-3 py-1.5 rounded-xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Driver: psql / libpq CLI</span>
          </span>
        </div>
      </div>

      {/* SQL Query Runner */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-stone-900" />
            <h2 className="text-sm font-black text-stone-900">
              Interactive SQL Console & Data Query Runner
            </h2>
          </div>

          {/* Preset queries */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-stone-600 mr-1">Presets:</span>
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQueryInput(q.sql)}
                className="retro-btn px-2.5 py-1 bg-white hover:bg-[#FEF08A] text-stone-900 rounded-lg text-[11px] font-bold shadow-[1px_1px_0px_#18181B] cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Input Area */}
        <div className="retro-window bg-white border-2 border-stone-900 rounded-xl overflow-hidden shadow-[3px_3px_0px_#18181B]">
          <div className="h-8 bg-[#F4EEDC] px-3 flex items-center justify-between border-b-2 border-stone-900 text-xs font-mono text-stone-700 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-stone-900 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-stone-900 inline-block" />
              <span className="ml-2 font-mono text-stone-800">database: netlab • user: postgres</span>
            </div>
            <button
              onClick={handleRunQuery}
              disabled={isExecuting}
              className="retro-btn px-3 py-1 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black shadow-[2px_2px_0px_#18181B] gap-1 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-stone-900" />
              <span>{isExecuting ? 'Running...' : 'Execute Query'}</span>
            </button>
          </div>
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full p-4 bg-[#0c1017] text-cyan-300 font-mono text-xs outline-none resize-none leading-relaxed select-text"
          />
        </div>

        {/* Error Notification */}
        {queryError && (
          <div className="p-3.5 bg-[#FECDD3] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] text-xs font-mono font-bold text-stone-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-800 shrink-0 mt-0.5" />
            <span>{queryError}</span>
          </div>
        )}

        {/* Results Table */}
        {queryResult && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Query executed successfully • {queryResult.rows.length} rows returned
              </span>
              <span className="flex items-center gap-1 font-mono text-stone-600">
                <Clock className="w-3.5 h-3.5" />
                {queryResult.execution_time_ms} ms
              </span>
            </div>

            <div className="retro-window bg-white border-2 border-stone-900 rounded-xl overflow-hidden shadow-[3px_3px_0px_#18181B]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#FAF7EE] border-b-2 border-stone-900 text-stone-800 font-sans font-black">
                      {queryResult.columns.map((col, idx) => (
                        <th key={idx} className="p-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-stone-200">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#FAF7EE]/70 transition">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 text-stone-800 font-medium">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
