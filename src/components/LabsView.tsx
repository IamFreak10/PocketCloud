import React, { useState } from 'react';
import {
  Play,
  Square,
  Terminal,
  ExternalLink,
  Plus,
  Server,
  Globe,
  Database,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Lab, LabComponent } from '../types';

interface LabsViewProps {
  labs: Lab[];
  currentLab: Lab | null;
  onSelectLab: (lab: Lab) => void;
  onCreateLab: (name: string, description: string, template?: string) => void;
  onStartComponent: (labId: string, compId: string) => Promise<void>;
  onStopComponent: (labId: string, compId: string) => Promise<void>;
  onOpenTerminal: (compId: string) => void;
  onViewLogs: (compId: string) => void;
}

export const LabsView: React.FC<LabsViewProps> = ({
  labs,
  currentLab,
  onSelectLab,
  onCreateLab,
  onStartComponent,
  onStopComponent,
  onOpenTerminal,
  onViewLogs,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabTemplate, setNewLabTemplate] = useState('vps-web');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;
    onCreateLab(newLabName, newLabDesc, newLabTemplate);
    setShowCreateModal(false);
    setNewLabName('');
    setNewLabDesc('');
  };

  const handleToggleComponent = async (comp: LabComponent) => {
    if (!currentLab) return;
    setActionLoading(comp.id);
    try {
      if (comp.status === 'running') {
        await onStopComponent(currentLab.id, comp.id);
      } else {
        await onStartComponent(currentLab.id, comp.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-6 select-none overflow-y-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lab Workspace</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your isolated local cloud labs and virtual infrastructure components.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Lab</span>
        </button>
      </div>

      {/* Lab Tabs */}
      {labs.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
          {labs.map((lab) => {
            const isSelected = currentLab?.id === lab.id;
            return (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm'
                    : 'bg-[#111827] text-gray-400 hover:text-gray-200 hover:bg-[#1a2336] border border-gray-800'
                }`}
              >
                <span>{lab.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    lab.status === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Labs Created Yet</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            Get started by launching our Linux VPS + Web Server starter template.
          </p>
          <button
            onClick={() => onCreateLab('My First Cloud Lab', 'Starter isolated Linux lab with web server', 'vps-web')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition"
          >
            Launch Starter Lab
          </button>
        </div>
      )}

      {/* Active Lab Component Table */}
      {currentLab && (
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#111a2d]">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{currentLab.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  ID: {currentLab.id}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{currentLab.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {currentLab.components.filter((c) => c.status === 'running').length} / {currentLab.components.length} nodes running
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090d16] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Component</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Runtime</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Port Forwarding</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {currentLab.components.map((comp) => {
                  const isRunning = comp.status === 'running';
                  const isLoading = actionLoading === comp.id;

                  return (
                    <tr key={comp.id} className="hover:bg-[#121c33]/50 transition">
                      <td className="p-4 font-semibold text-white flex items-center gap-2.5">
                        {comp.component_type === 'vps' && <Server className="w-4 h-4 text-blue-400" />}
                        {comp.component_type === 'web' && <Globe className="w-4 h-4 text-cyan-400" />}
                        {comp.component_type === 'database' && <Database className="w-4 h-4 text-purple-400" />}
                        <div>
                          <div>{comp.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{comp.image}</div>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-gray-400 font-mono text-[11px]">{comp.component_type}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-gray-800 text-gray-300">
                          {comp.runtime_mode === 'docker' ? 'Docker Engine' : 'Simulated'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isRunning
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                          {isRunning ? 'Running' : 'Stopped'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-gray-300">{comp.ip_address || '—'}</td>
                      <td className="p-4 font-mono text-cyan-400">
                        {comp.host_port ? `127.0.0.1:${comp.host_port} -> ${comp.container_port || 80}` : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleComponent(comp)}
                            disabled={isLoading}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isRunning
                                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isRunning ? 'Stop' : 'Start'}</span>
                          </button>

                          {isRunning && (
                            <>
                              <button
                                onClick={() => onOpenTerminal(comp.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#172238] hover:bg-[#1e2d4a] text-cyan-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Open Terminal"
                              >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Terminal</span>
                              </button>

                              {comp.host_port && (
                                <a
                                  href={`http://127.0.0.1:${comp.host_port}/`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-semibold transition"
                                  title="Open Web Server in Host Browser"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </a>
                              )}

                              <button
                                onClick={() => onViewLogs(comp.id)}
                                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition"
                                title="View Logs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Lab Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Create New Lab</h2>
            <p className="text-xs text-gray-400 mb-6">
              Create an isolated cloud workspace with starter containers and network routing.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Lab Name</label>
                <input
                  type="text"
                  required
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. Production Cluster Alpha"
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="e.g. Multi-tier hosting playground with Nginx and MySQL"
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Initial Template</label>
                <select
                  value={newLabTemplate}
                  onChange={(e) => setNewLabTemplate(e.target.value)}
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                >
                  <option value="vps-web">Linux VPS + Web Server (Recommended)</option>
                  <option value="empty">Empty Canvas</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Create Lab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
