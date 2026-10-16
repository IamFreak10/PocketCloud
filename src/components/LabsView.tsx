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
  Zap,
} from 'lucide-react';
import { Lab, LabComponent } from '../types';

interface LabsViewProps {
  labs: Lab[];
  currentLab: Lab | null;
  onSelectLab: (lab: Lab) => void;
  onCreateLab: (name: string, description: string, template?: string) => void;
  onAddComponent: (
    labId: string,
    name: string,
    componentType: string,
    image: string,
    hostPort?: number,
    containerPort?: number
  ) => Promise<LabComponent>;
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
  onAddComponent,
  onStartComponent,
  onStopComponent,
  onOpenTerminal,
  onViewLogs,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabDesc, setNewLabDesc] = useState('');
  const [newLabTemplate, setNewLabTemplate] = useState('vps-web');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add Node Modal Form State
  const [nodePreset, setNodePreset] = useState('ubuntu-24');
  const [customNodeName, setCustomNodeName] = useState('Ubuntu 24.04 LTS VPS');
  const [customImage, setCustomImage] = useState('ubuntu:24.04');
  const [customType, setCustomType] = useState('vps');
  const [customHostPort, setCustomHostPort] = useState('18022');
  const [customContainerPort, setCustomContainerPort] = useState('22');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;
    onCreateLab(newLabName, newLabDesc, newLabTemplate);
    setShowCreateModal(false);
    setNewLabName('');
    setNewLabDesc('');
  };

  const handleQuickLaunchUbuntu = async () => {
    let targetLabId = currentLab?.id;
    if (!targetLabId) {
      if (labs.length > 0) {
        targetLabId = labs[0].id;
      } else {
        onCreateLab('Ubuntu Cloud Lab', 'Dedicated Ubuntu 24.04 Playground', 'ubuntu-vps');
        return;
      }
    }

    try {
      setActionLoading('quick-ubuntu');
      const comp = await onAddComponent(
        targetLabId,
        'Ubuntu 24.04 LTS Full VPS',
        'vps',
        'netlab/ubuntu-vps:24.04',
        18022,
        22
      );
      await onStartComponent(targetLabId, comp.id);
      onOpenTerminal(comp.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLab) return;

    setActionLoading('add-node');
    try {
      const comp = await onAddComponent(
        currentLab.id,
        customNodeName,
        customType,
        customImage,
        customHostPort ? Number(customHostPort) : undefined,
        customContainerPort ? Number(customContainerPort) : undefined
      );
      setShowAddNodeModal(false);
      // Auto start and open terminal if it's a VPS
      if (comp.component_type === 'vps') {
        await onStartComponent(currentLab.id, comp.id);
        onOpenTerminal(comp.id);
      }
    } finally {
      setActionLoading(null);
    }
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
    <div className="h-full flex flex-col p-8 space-y-6 select-none overflow-y-auto bg-[#090d16] text-slate-100">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lab Workspace</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your isolated local cloud labs, real Linux containers, and virtual infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 1-Click Launch Ubuntu VPS */}
          <button
            onClick={handleQuickLaunchUbuntu}
            disabled={actionLoading === 'quick-ubuntu'}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-950 transition cursor-pointer disabled:opacity-50"
            title="Immediately start a real Ubuntu 24.04 LTS container and open terminal"
          >
            <Zap className={`w-4 h-4 ${actionLoading === 'quick-ubuntu' ? 'animate-spin' : ''}`} />
            <span>Launch Ubuntu 24.04 VPS</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-cyan-950 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lab</span>
          </button>
        </div>
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
            Get started by launching an Ubuntu 24.04 LTS VPS or Full Stack Web Lab.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onCreateLab('Ubuntu 24.04 LTS Cloud Lab', 'Official Ubuntu 24.04 LTS environment', 'ubuntu-vps')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs transition"
            >
              Launch Ubuntu 24.04 Lab
            </button>
            <button
              onClick={() => onCreateLab('My First Cloud Lab', 'Starter isolated Linux lab with web server', 'vps-web')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition"
            >
              Launch Starter Stack
            </button>
          </div>
        </div>
      )}

      {/* Active Lab Component Table */}
      {currentLab && (
        <div className="bg-[#0d1424] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111a2d]">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{currentLab.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  ID: {currentLab.id}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{currentLab.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {currentLab.components.filter((c) => c.status === 'running').length} / {currentLab.components.length} nodes running
              </span>
              <button
                onClick={() => setShowAddNodeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a253c] hover:bg-[#233352] text-cyan-300 border border-cyan-700/60 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Node</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#090d16] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[11px] font-sans">
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
                          <div className="font-sans font-bold">{comp.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{comp.image}</div>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-gray-400 font-mono text-[11px]">{comp.component_type}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-gray-800 text-gray-300 font-sans">
                          {comp.runtime_mode === 'docker' ? 'Docker Engine' : 'Simulated'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-sans ${
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
                        <div className="flex items-center justify-end gap-2 font-sans">
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
                                  title="Open in Host Browser"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </a>
                              )}
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

      {/* Add Infrastructure Node Modal */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Add Infrastructure Node</h2>
            <p className="text-xs text-gray-400 mb-6">
              Deploy an isolated Linux container node to the current active lab.
            </p>
            <form onSubmit={handleAddNodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Preset Template</label>
                <select
                  value={nodePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodePreset(val);
                    if (val === 'ubuntu-24') {
                      setCustomNodeName('Ubuntu 24.04 LTS Full VPS');
                      setCustomImage('netlab/ubuntu-vps:24.04');
                      setCustomType('vps');
                      setCustomHostPort('18022');
                      setCustomContainerPort('22');
                    } else if (val === 'debian-12') {
                      setCustomNodeName('Debian 12 Bookworm Node');
                      setCustomImage('debian:12');
                      setCustomType('vps');
                      setCustomHostPort('18023');
                      setCustomContainerPort('22');
                    } else if (val === 'alpine') {
                      setCustomNodeName('Alpine Linux 3.20 VPS');
                      setCustomImage('alpine:latest');
                      setCustomType('vps');
                      setCustomHostPort('18024');
                      setCustomContainerPort('22');
                    } else if (val === 'nginx') {
                      setCustomNodeName('Nginx Web Server');
                      setCustomImage('nginx:alpine');
                      setCustomType('web');
                      setCustomHostPort('18083');
                      setCustomContainerPort('80');
                    } else if (val === 'postgres') {
                      setCustomNodeName('PostgreSQL Database');
                      setCustomImage('postgres:alpine');
                      setCustomType('database');
                      setCustomHostPort('15433');
                      setCustomContainerPort('5432');
                    }
                  }}
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                >
                  <option value="ubuntu-24">Ubuntu 24.04 LTS (Noble Numbat)</option>
                  <option value="debian-12">Debian 12 Bookworm</option>
                  <option value="alpine">Alpine Linux 3.20</option>
                  <option value="nginx">Nginx Web Server</option>
                  <option value="postgres">PostgreSQL 16 Database</option>
                  <option value="custom">Custom Configuration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Node Display Name</label>
                <input
                  type="text"
                  required
                  value={customNodeName}
                  onChange={(e) => setCustomNodeName(e.target.value)}
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Docker Image</label>
                <input
                  type="text"
                  required
                  value={customImage}
                  onChange={(e) => setCustomImage(e.target.value)}
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Host Port</label>
                  <input
                    type="number"
                    value={customHostPort}
                    onChange={(e) => setCustomHostPort(e.target.value)}
                    placeholder="18022"
                    className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Container Port</label>
                  <input
                    type="number"
                    value={customContainerPort}
                    onChange={(e) => setCustomContainerPort(e.target.value)}
                    placeholder="22"
                    className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-node'}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Deploy Node
                </button>
              </div>
            </form>
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
                  placeholder="e.g. Ubuntu 24.04 Production Cluster"
                  className="w-full bg-[#172238] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="e.g. Dedicated Ubuntu VPS environment with Nginx and PostgreSQL"
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
                  <option value="ubuntu-vps">Ubuntu 24.04 LTS Dedicated VPS Lab (Recommended)</option>
                  <option value="vps-web">Full Stack (Alpine VPS + Nginx + PostgreSQL)</option>
                  <option value="empty">Empty Canvas</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
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
