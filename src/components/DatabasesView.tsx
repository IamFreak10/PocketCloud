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
    <div className="h-full overflow-y-auto p-8 space-y-8 select-none bg-[#090d16] text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Real Database Management</h1>
        <p className="text-xs text-gray-400 mt-1">
          Direct psql / SQL execution against real isolated PostgreSQL, MySQL, and MongoDB container instances.
        </p>
      </div>

      {/* Engine Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'postgres', name: 'PostgreSQL 16', port: 15432, desc: 'Active container instance' },
          { id: 'mysql', name: 'MySQL 8.0', port: 3306, desc: 'Enterprise relational RDBMS' },
          { id: 'mariadb', name: 'MariaDB 11', port: 3306, desc: 'High performance open-source MySQL' },
          { id: 'mongodb', name: 'MongoDB 7.0', port: 27017, desc: 'Document NoSQL database' },
        ].map((db) => {
          const isSelected = selectedEngine === db.id;
          return (
            <div
              key={db.id}
              onClick={() => {
                setSelectedEngine(db.id as any);
                setQueryResult(null);
                setQueryError(null);
              }}
              className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/60 border-purple-500 shadow-xl shadow-purple-950/30'
                  : 'bg-[#111827] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white">{db.name}</span>
                  <Database className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-gray-500'}`} />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">{db.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-[11px] font-mono text-gray-400">
                <span>Mapped Port:</span>
                <span className="text-purple-300 font-semibold">127.0.0.1:{db.port}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Parameters & Status */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Connection Parameters</span>
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border font-mono ${
              isRunning
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-rose-950 text-rose-400 border-rose-800'
            }`}
          >
            ● {isRunning ? 'Container Running (Healthy)' : 'Container Stopped'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-500 block mb-1">Host</span>
            <span className="text-white font-semibold">127.0.0.1</span>
          </div>
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-500 block mb-1">Port</span>
            <span className="text-purple-400 font-semibold">{dbComponent?.host_port || 15432}</span>
          </div>
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-500 block mb-1">Database / User</span>
            <span className="text-white font-semibold">netlab</span>
          </div>
          <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-500 block mb-1">Password</span>
            <span className="text-white font-semibold">netlab123</span>
          </div>
        </div>
      </div>

      {/* Interactive SQL Query Console */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white">Interactive SQL Runner (Direct psql CLI)</h2>
          </div>
          <button
            onClick={handleRunQuery}
            disabled={isExecuting || !isRunning}
            className="flex items-center justify-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950 transition cursor-pointer disabled:opacity-40"
          >
            {isExecuting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Execute SQL Query</span>
          </button>
        </div>

        {/* Preset Sample Queries */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500 font-semibold">Sample Queries:</span>
          {sampleQueries.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                setQueryInput(q.sql);
              }}
              className="px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-750 text-purple-300 border border-gray-700 hover:border-purple-500 text-[11px] font-mono transition cursor-pointer"
            >
              {q.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="SELECT * FROM customers;"
          className="w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-4 py-3 font-mono text-xs text-purple-200 outline-none focus:border-purple-500"
        />

        {queryError && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 font-mono text-xs whitespace-pre-line flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">SQL Execution Error:</div>
              {queryError}
            </div>
          </div>
        )}

        {queryResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Query executed successfully
              </span>
              <span>
                {queryResult.row_count} rows returned in <b className="text-white">{queryResult.execution_time_ms} ms</b>
              </span>
            </div>

            <div className="bg-[#0b0f19] rounded-xl border border-gray-800 overflow-x-auto shadow-inner">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#111827] text-gray-300 border-b border-gray-800">
                  <tr>
                    {queryResult.columns.map((col, idx) => (
                      <th key={idx} className="p-3 font-bold text-purple-300 tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-800/40 transition">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3 text-gray-200">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {queryResult.rows.length === 0 && (
                    <tr>
                      <td colSpan={queryResult.columns.length || 1} className="p-4 text-center text-gray-500 font-sans">
                        Query returned 0 rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
