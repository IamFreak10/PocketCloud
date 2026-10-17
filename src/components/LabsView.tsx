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
  onDeleteComponent?: (labId: string, compId: string) => Promise<void>;
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
  onDeleteComponent,
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
  const [customImage, setCustomImage] = useState('netlab/ubuntu-vps:24.04');
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
    <div className="h-full flex flex-col p-6 space-y-6 select-none overflow-y-auto bg-[#FAF7EE] text-stone-900">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>🧪</span> Lab Workspace & Environments
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-medium">
            Manage your isolated local cloud labs, real Linux containers, and virtual infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 1-Click Launch Ubuntu VPS */}
          <button
            onClick={handleQuickLaunchUbuntu}
            disabled={actionLoading === 'quick-ubuntu'}
            className="retro-btn px-4 py-2 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black text-xs gap-2 shadow-[3px_3px_0px_#18181B] cursor-pointer disabled:opacity-50"
            title="Download and boot an official Ubuntu 24.04 VM, then open its terminal"
          >
            <Zap className={`w-4 h-4 text-amber-700 ${actionLoading === 'quick-ubuntu' ? 'animate-spin' : ''}`} />
            <span>Launch Ubuntu 24.04 VPS</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="retro-btn px-4 py-2 bg-[#C7F9CC] hover:bg-[#a7f3d0] text-stone-900 font-black text-xs gap-2 shadow-[3px_3px_0px_#18181B] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lab</span>
          </button>
        </div>
      </div>

      {/* Lab Tabs */}
      {labs.length > 0 ? (
        <div className="flex items-center gap-2 pb-1 overflow-x-auto">
          {labs.map((lab) => {
            const isSelected = currentLab?.id === lab.id;
            return (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border-2 border-stone-900 ${
                  isSelected
                    ? 'bg-[#FEF08A] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                    : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
                }`}
              >
                <span>{lab.name}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${
                    lab.status === 'Running' ? 'bg-[#86EFAC]' : 'bg-stone-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="retro-window bg-white shadow-[4px_4px_0px_#18181B] rounded-2xl p-12 text-center border-2 border-stone-900">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-stone-900 mb-1">No Labs Created Yet</h3>
          <p className="text-xs text-stone-600 max-w-sm mx-auto mb-5 font-medium">
            Get started by launching a clean Ubuntu 24.04 LTS VPS or Full Stack Web Lab.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onCreateLab('Ubuntu 24.04 LTS Cloud Lab', 'Official Ubuntu 24.04 LTS environment', 'ubuntu-vps')}
              className="retro-btn px-4 py-2 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-bold text-xs"
            >
              Launch Ubuntu 24.04 Lab
            </button>
            <button
              onClick={() => onCreateLab('My First Cloud Lab', 'Starter isolated Linux lab with web server', 'vps-web')}
              className="retro-btn px-4 py-2 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 font-bold text-xs"
            >
              Launch Starter Stack
            </button>
          </div>
        </div>
      )}

      {/* Active Lab Component Table */}
      {currentLab && (
        <div className="retro-window bg-white shadow-[4px_4px_0px_#18181B] rounded-2xl overflow-hidden border-2 border-stone-900">
          {/* Header Bar */}
          <div className="p-4 border-b-2 border-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F4EEDC]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-stone-900">{currentLab.name}</h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white text-stone-800 border border-stone-900 font-bold shadow-[1px_1px_0px_#18181B]">
                    ID: {currentLab.id}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5 font-medium">{currentLab.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-700 bg-white px-2.5 py-1 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                {currentLab.components.filter((c) => c.status === 'running').length} / {currentLab.components.length} nodes active
              </span>
              <button
                onClick={() => setShowAddNodeModal(true)}
                className="retro-btn px-3 py-1.5 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 text-xs font-bold gap-1.5 shadow-[2px_2px_0px_#18181B]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Node</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#FAF7EE] text-stone-800 border-b-2 border-stone-900 uppercase tracking-wider text-[11px] font-sans font-black">
                <tr>
                  <th className="p-3.5">Component</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Runtime</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Port Forwarding</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-stone-200">
                {currentLab.components.map((comp) => {
                  const isRunning = comp.status === 'running';
                  const isLoading = actionLoading === comp.id;

                  return (
                    <tr key={comp.id} className="hover:bg-[#FAF7EE]/70 transition">
                      <td className="p-3.5 font-semibold text-stone-900 flex items-center gap-2.5">
                        {comp.component_type === 'vps' && (
                          <div className="p-1.5 bg-[#FEF08A] rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                            <Server className="w-4 h-4 text-stone-900" />
                          </div>
                        )}
                        {comp.component_type === 'web' && (
                          <div className="p-1.5 bg-[#BAE6FD] rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                            <Globe className="w-4 h-4 text-stone-900" />
                          </div>
                        )}
                        {comp.component_type === 'database' && (
                          <div className="p-1.5 bg-[#F3E8FF] rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                            <Database className="w-4 h-4 text-stone-900" />
                          </div>
                        )}
                        <div>
                          <div className="font-sans font-black text-stone-900">{comp.name}</div>
                          <div className="text-[10px] text-stone-500 font-mono font-medium">{comp.image}</div>
                        </div>
                      </td>
                      <td className="p-3.5 uppercase text-stone-700 font-mono text-[11px] font-bold">{comp.component_type}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#FAF7EE] text-stone-800 font-sans font-bold border border-stone-400">
                          {comp.runtime_mode === 'qemu' ? 'QEMU VM' : comp.runtime_mode === 'docker' ? 'Docker Engine' : 'Simulated'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black font-sans border border-stone-900 shadow-[1px_1px_0px_#18181B] ${
                            isRunning
                              ? 'bg-[#86EFAC] text-stone-900'
                              : 'bg-[#E5E7EB] text-stone-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full border border-stone-900 ${isRunning ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                          {isRunning ? 'Running' : 'Stopped'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-stone-800">{comp.ip_address || '—'}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-700">
                        {comp.host_port ? `127.0.0.1:${comp.host_port} -> ${comp.container_port || 80}` : '—'}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2 font-sans">
                          <button
                            onClick={() => handleToggleComponent(comp)}
                            disabled={isLoading}
                            className={`retro-btn px-2.5 py-1 text-xs font-black shadow-[2px_2px_0px_#18181B] gap-1 cursor-pointer ${
                              isRunning
                                ? 'bg-[#FDA4AF] hover:bg-[#fb7185] text-stone-900'
                                : 'bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900'
                            }`}
                          >
                            {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isRunning ? 'Stop' : 'Start'}</span>
                          </button>

                          {isRunning && (
                            <>
                              <button
                                onClick={() => onOpenTerminal(comp.id)}
                                className="retro-btn px-2.5 py-1 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 text-xs font-black shadow-[2px_2px_0px_#18181B] gap-1 cursor-pointer"
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
                                  className="retro-btn px-2.5 py-1 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs font-black shadow-[2px_2px_0px_#18181B] gap-1 inline-flex items-center"
                                  title="Open in Host Browser"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </a>
                              )}
                            </>
                          )}

                          {onDeleteComponent && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete component "${comp.name}"? This will stop and remove its container.`)) {
                                  onDeleteComponent(comp.lab_id, comp.id);
                                }
                              }}
                              className="retro-btn p-1.5 bg-[#FCA5A5] hover:bg-[#ef4444] hover:text-white text-stone-900 shadow-[2px_2px_0px_#18181B] cursor-pointer"
                              title="Delete Component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="retro-window bg-[#FAF7EE] border-3 border-stone-900 rounded-2xl max-w-md w-full p-6 shadow-[8px_8px_0px_#18181B]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <h2 className="text-base font-black text-stone-900 ml-2">Add Infrastructure Node</h2>
              </div>
            </div>
            <p className="text-xs text-stone-600 mb-5 font-medium">
              Deploy an isolated Linux container node to the current active lab.
            </p>
            <form onSubmit={handleAddNodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">Preset Template</label>
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
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
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
                <label className="block text-xs font-black text-stone-800 mb-1">Node Display Name</label>
                <input
                  type="text"
                  required
                  value={customNodeName}
                  onChange={(e) => setCustomNodeName(e.target.value)}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">Docker Image</label>
                <input
                  type="text"
                  required
                  value={customImage}
                  onChange={(e) => setCustomImage(e.target.value)}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">Host Port</label>
                  <input
                    type="number"
                    value={customHostPort}
                    onChange={(e) => setCustomHostPort(e.target.value)}
                    placeholder="18022"
                    className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">Container Port</label>
                  <input
                    type="number"
                    value={customContainerPort}
                    onChange={(e) => setCustomContainerPort(e.target.value)}
                    placeholder="22"
                    className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-stone-900">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="retro-btn px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-node'}
                  className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black disabled:opacity-50"
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
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="retro-window bg-[#FAF7EE] border-3 border-stone-900 rounded-2xl max-w-md w-full p-6 shadow-[8px_8px_0px_#18181B]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
                <h2 className="text-base font-black text-stone-900 ml-2">Create New Lab</h2>
              </div>
            </div>
            <p className="text-xs text-stone-600 mb-5 font-medium">
              Create an isolated cloud workspace with starter containers and network routing.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">Lab Name</label>
                <input
                  type="text"
                  required
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  placeholder="e.g. Ubuntu 24.04 Production Cluster"
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">Description</label>
                <textarea
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  placeholder="e.g. Dedicated Ubuntu VPS environment with Nginx and PostgreSQL"
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">Initial Template</label>
                <select
                  value={newLabTemplate}
                  onChange={(e) => setNewLabTemplate(e.target.value)}
                  className="w-full bg-white border-2 border-stone-900 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
                >
                  <option value="ubuntu-vps">Ubuntu 24.04 LTS Dedicated VPS Lab (Recommended)</option>
                  <option value="vps-web">Full Stack (Alpine VPS + Nginx + PostgreSQL)</option>
                  <option value="empty">Empty Canvas</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-stone-900">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="retro-btn px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black"
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
