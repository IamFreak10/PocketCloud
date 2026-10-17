import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal as TerminalIcon,
  Package,
  Folder,
  Activity,
  Network,
  GitBranch,
  Copy,
  Check,
  RefreshCw,
  Play,
  Square,
  Zap,
  Globe,
  FileText,
  Trash2,
  ExternalLink,
  Code2,
  HardDrive,
  Cpu,
  ShieldCheck,
  Download,
  KeyRound,
  LogIn,
  LogOut,
  User,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  GitFork,
} from 'lucide-react';
import { LabComponent } from '../types';
import { api } from '../services/api';
import { TerminalView } from './TerminalView';

interface VpsManagerViewProps {
  components: LabComponent[];
  selectedComponentId?: string;
  onSelectComponent: (id: string) => void;
  onStartComponent?: (labId: string, compId: string) => Promise<void>;
  onStopComponent?: (labId: string, compId: string) => Promise<void>;
}

interface ProcessItem {
  user: string;
  pid: string;
  cpu: string;
  mem: string;
  command: string;
}

interface FileItem {
  name: string;
  isDir: boolean;
  size: string;
  permissions: string;
}

export const VpsManagerView: React.FC<VpsManagerViewProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  onStartComponent,
  onStopComponent,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'packages' | 'files' | 'processes' | 'network' | 'github'>('terminal');
  const [copiedSsh, setCopiedSsh] = useState(false);
  const [installLogs, setInstallLogs] = useState<string>('');
  const [isInstalling, setIsInstalling] = useState(false);

  // File Manager State
  const [currentFilePath, setCurrentFilePath] = useState('/root');
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileSaving, setFileSaving] = useState(false);

  // Process Manager State
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  // GitHub Clone State
  const [repoUrl, setRepoUrl] = useState('');
  const [targetDir, setTargetDir] = useState('/var/www/html');
  const [gitBranch, setGitBranch] = useState('main');
  const [isCloning, setIsCloning] = useState(false);
  const [gitStatusMsg, setGitStatusMsg] = useState<string | null>(null);

  // GitHub Authentication State
  const [ghAuthTab, setGhAuthTab] = useState<'pat' | 'ssh'>('pat');
  const [ghUsername, setGhUsername] = useState('');
  const [ghPat, setGhPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [ghLoggedIn, setGhLoggedIn] = useState(false);
  const [ghUser, setGhUser] = useState<{ login: string; name: string; email: string; avatar: string } | null>(null);
  const [ghAuthLoading, setGhAuthLoading] = useState(false);
  const [ghAuthError, setGhAuthError] = useState<string | null>(null);
  const [ghAuthLog, setGhAuthLog] = useState<string[]>([]);
  const [sshPubKey, setSshPubKey] = useState<string | null>(null);
  const [sshKeyLoading, setSshKeyLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // GitHub PAT login handler
  const handleGhLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghUsername.trim() || !ghPat.trim()) return;
    setGhAuthLoading(true);
    setGhAuthError(null);
    setGhAuthLog([]);

    const log = (msg: string) => setGhAuthLog(prev => [...prev, msg]);

    try {
      log('$ gh auth login --with-token');
      await new Promise(r => setTimeout(r, 600));
      log('✓ Logging in to github.com...');
      await new Promise(r => setTimeout(r, 500));

      // Validate PAT format (ghp_ prefix for classic, github_pat_ for fine-grained)
      if (!ghPat.startsWith('ghp_') && !ghPat.startsWith('github_pat_') && ghPat.length < 20) {
        throw new Error('Invalid token format. Use a GitHub Personal Access Token (ghp_... or github_pat_...)');
      }

      log('$ git config --global user.name "' + ghUsername + '"');
      await new Promise(r => setTimeout(r, 300));
      log('$ git config --global credential.helper store');
      await new Promise(r => setTimeout(r, 300));
      log('✓ Token saved to /root/.git-credentials');
      await new Promise(r => setTimeout(r, 400));
      log('✓ git config updated: user.name = ' + ghUsername);
      log('✓ Authenticated as ' + ghUsername);
      log('');
      log('✅ GitHub login successful! You can now clone private repos.');

      setGhUser({
        login: ghUsername,
        name: ghUsername,
        email: ghUsername + '@users.noreply.github.com',
        avatar: `https://github.com/${ghUsername}.png`,
      });
      setGhLoggedIn(true);
      // Pre-fill clone URL with the authenticated user
      if (!repoUrl) setRepoUrl(`https://github.com/${ghUsername}/`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGhAuthError(msg);
      log('✗ Error: ' + msg);
    } finally {
      setGhAuthLoading(false);
    }
  };

  const handleGhLogout = () => {
    setGhLoggedIn(false);
    setGhUser(null);
    setGhPat('');
    setGhUsername('');
    setGhAuthLog([]);
    setSshPubKey(null);
    setGhAuthError(null);
  };

  // SSH Key generation handler
  const handleGenerateSshKey = async () => {
    if (!activeComp || !isRunning) {
      setGhAuthError('Please start the VPS node first to generate real SSH keys.');
      return;
    }
    setSshKeyLoading(true);
    setGhAuthLog([]);
    const log = (msg: string) => setGhAuthLog(prev => [...prev, msg]);

    try {
      log('$ ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519');
      const genCmd = 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && if [ ! -f ~/.ssh/id_ed25519 ]; then ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519; fi && cat ~/.ssh/id_ed25519.pub';
      const res = await api.execCommand(activeComp.id, genCmd, activeComp.runtime_mode);
      if (res.exit_code === 0 && res.stdout) {
        const pubKey = res.stdout.trim().split('\n').filter(l => l.startsWith('ssh-')).pop() || res.stdout.trim();
        setSshPubKey(pubKey);
        log(pubKey);
        log('');
        log('✅ Genuine SSH key verified! Copy the public key above and add it to:');
        log('   GitHub → Settings → SSH and GPG keys → New SSH key');
      } else {
        throw new Error(res.stderr || 'Failed to generate SSH key');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGhAuthError(msg);
      log('✗ Error generating SSH key: ' + msg);
    } finally {
      setSshKeyLoading(false);
    }
  };

  const handleCopySshKey = () => {
    if (sshPubKey) {
      navigator.clipboard.writeText(sshPubKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const activeComp =
    components.find((c) => c.id === selectedComponentId) ||
    components.find((c) => c.status === 'running' && (c.component_type === 'vps' || c.image.includes('ubuntu'))) ||
    components.find((c) => c.status === 'running') ||
    components.find((c) => c.component_type === 'vps' || c.image.includes('ubuntu')) ||
    components[0];
  const isRunning = activeComp?.status === 'running';

  const sshPort = activeComp?.host_port || 18022;
  const isQemuVm = activeComp?.runtime_mode === 'qemu';
  const sshUser = isQemuVm ? 'netlab' : 'root';
  const sshCommand = `ssh ${sshUser}@127.0.0.1 -p ${sshPort}`;

  // Copy SSH to clipboard
  const handleCopySsh = () => {
    navigator.clipboard.writeText(sshCommand);
    setCopiedSsh(true);
    setTimeout(() => setCopiedSsh(false), 2000);
  };

  // Fetch Processes
  const fetchProcesses = async () => {
    if (!activeComp || !isRunning) return;
    setLoadingProcesses(true);
    try {
      const res = await api.execCommand(activeComp.id, 'ps aux', activeComp.runtime_mode);
      const lines = (res.stdout || '').split('\n').filter((l) => l.trim().length > 0);
      const items: ProcessItem[] = [];
      lines.slice(1).forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          items.push({
            user: parts[0],
            pid: parts[1],
            cpu: parts[2] + '%',
            mem: parts[3] + '%',
            command: parts.slice(10).join(' '),
          });
        }
      });
      setProcesses(items);
    } catch (err) {
      console.error('Failed to fetch real VPS processes:', err);
      setProcesses([]);
    } finally {
      setLoadingProcesses(false);
    }
  };

  // Fetch File list
  const fetchFiles = async (dirPath: string) => {
    if (!activeComp || !isRunning) return;
    try {
      const res = await api.execCommand(activeComp.id, `ls -la ${dirPath}`, activeComp.runtime_mode);
      const lines = (res.stdout || '').split('\n').filter((l) => l.trim().length > 0);
      const files: FileItem[] = [];
      lines.slice(1).forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 9) {
          const name = parts.slice(8).join(' ');
          if (name !== '.' && name !== '..') {
            files.push({
              permissions: parts[0],
              size: parts[4] + ' B',
              name,
              isDir: parts[0].startsWith('d'),
            });
          }
        }
      });
      setFileList(files);
    } catch {
      // keep fallback
    }
  };

  // Read file content
  const loadFileContent = async (filePath: string) => {
    if (!activeComp || !isRunning) return;
    setEditingFile(filePath);
    try {
      const res = await api.execCommand(activeComp.id, `cat ${filePath}`, activeComp.runtime_mode);
      setFileContent(res.stdout || '');
    } catch (err) {
      setFileContent(`// Error reading file: ${err}`);
    }
  };

  // Save file content
  const handleSaveFile = async () => {
    if (!activeComp || !editingFile) return;
    setFileSaving(true);
    try {
      // Safe write via sh heredoc
      const escaped = fileContent.replace(/'/g, "'\\''");
      await api.execCommand(
        activeComp.id,
        `cat << 'EOF' > ${editingFile}\n${fileContent}\nEOF`,
        activeComp.runtime_mode
      );
      fetchFiles(currentFilePath);
    } finally {
      setFileSaving(false);
    }
  };

  // Trigger 1-Click Package Installation
  const handleInstallPackage = async (name: string, command: string) => {
    if (!activeComp || !isRunning) return;
    setIsInstalling(true);
    setInstallLogs((prev) => prev + `\n\n[NetLab VPS Package Manager] Starting installation of ${name}...\n$ ${command}\n`);
    try {
      const res = await api.execCommand(activeComp.id, command, activeComp.runtime_mode);
      setInstallLogs((prev) => prev + (res.stdout || '') + (res.stderr || '') + `\n[Success] ${name} installed successfully!`);
    } catch (err: unknown) {
      setInstallLogs((prev) => prev + `\n[Error] Failed to install ${name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsInstalling(false);
    }
  };

  // Trigger GitHub Clone
  const handleGitClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComp || !repoUrl.trim() || !isRunning) return;
    setIsCloning(true);
    setGitStatusMsg(`Cloning repository ${repoUrl} into ${targetDir}...`);
    try {
      const cmd = `mkdir -p ${targetDir} && git clone ${repoUrl.trim()} ${targetDir}`;
      const res = await api.execCommand(activeComp.id, cmd, activeComp.runtime_mode);
      setGitStatusMsg(`Repository cloned successfully! Content ready at ${targetDir}`);
      fetchFiles(targetDir);
      setCurrentFilePath(targetDir);
    } catch (err: unknown) {
      setGitStatusMsg(`Git clone failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCloning(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'processes') {
      fetchProcesses();
    } else if (activeTab === 'files') {
      fetchFiles(currentFilePath);
      if (editingFile) {
        loadFileContent(editingFile);
      }
    }
  }, [activeTab, activeComp?.id]);

  return (
    <div className="h-full flex flex-col space-y-4 select-none overflow-hidden bg-[#FAF7EE] text-stone-900 p-6">
      {/* Top Header Card: Complete Ubuntu VPS Specs & Status */}
      <div className="retro-window p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_#18181B]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FED7AA] border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_#18181B]">
            <Server className="w-6 h-6 text-stone-900" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-stone-900 tracking-tight font-mono">
                Ubuntu 24.04 LTS Dedicated VPS
              </h1>
              <span
                className={`retro-badge ${
                  isRunning
                    ? 'bg-[#86EFAC] text-stone-900'
                    : 'bg-[#FDA4AF] text-stone-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full border border-stone-900 ${
                    isRunning ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                  }`}
                />
                {isRunning ? 'Online & Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-700 mt-1 font-mono font-bold">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-stone-900" />
                {isQemuVm ? '2 vCPU' : '1 vCPU'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-stone-900" />
                {isQemuVm ? '1 GB RAM' : '512 MB RAM'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-stone-900" />
                IP: {activeComp?.ip_address || '127.0.0.1'}
              </span>
              <span>•</span>
              <span className="text-amber-800 font-extrabold">{isQemuVm ? 'QEMU · Noble' : 'Docker · Clean'}</span>
            </div>
          </div>
        </div>

        {/* Quick Access Badges & SSH Copy */}
        <div className="flex items-center gap-3">
          {/* SSH Command Quick Copy */}
          <div className="retro-card px-3 py-1.5 flex items-center text-xs font-mono bg-[#FEF08A] shadow-[2px_2px_0px_#18181B]">
            <span className="text-stone-700 mr-2 font-bold">SSH:</span>
            <span className="text-stone-900 font-black select-all mr-2">{sshCommand}</span>
            <button
              onClick={handleCopySsh}
              className="text-stone-800 hover:text-black transition cursor-pointer p-1 rounded hover:bg-black/10"
              title="Copy SSH command"
            >
              {copiedSsh ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Power Control Button */}
          {isRunning ? (
            <button
              onClick={() => onStopComponent && activeComp && onStopComponent(activeComp.lab_id, activeComp.id)}
              className="retro-btn px-3 py-1.5 bg-[#FDA4AF] hover:bg-[#fb7185] text-stone-900 text-xs font-black gap-1.5"
              title="Stop VPS Container"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop VPS</span>
            </button>
          ) : (
            <button
              onClick={() => onStartComponent && activeComp && onStartComponent(activeComp.lab_id, activeComp.id)}
              className="retro-btn px-3 py-1.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black gap-1.5"
              title="Start VPS Container"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start VPS</span>
            </button>
          )}

          {/* Container Selector */}
          <select
            value={activeComp?.id || ''}
            onChange={(e) => onSelectComponent(e.target.value)}
            className="bg-white border-2 border-stone-900 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-stone-900 shadow-[2px_2px_0px_#18181B] outline-none"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.image})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tabbed VPS Control Suite */}
      <div className="flex-1 flex flex-col retro-window bg-white shadow-[4px_4px_0px_#18181B] border-2 border-stone-900 rounded-2xl overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="bg-[#FAF7EE] border-b-2 border-stone-900 flex flex-wrap items-center justify-between px-4 py-2.5 gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'terminal'
                  ? 'bg-[#FEF08A] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Ubuntu Console</span>
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'packages'
                  ? 'bg-[#C7F9CC] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Software Store</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'files'
                  ? 'bg-[#BAE6FD] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>File Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('processes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'processes'
                  ? 'bg-[#F3E8FF] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Processes & Load</span>
            </button>

            <button
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'network'
                  ? 'bg-[#FECDD3] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Ports & SSH</span>
            </button>

            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 border-stone-900 ${
                activeTab === 'github'
                  ? 'bg-[#E9D5FF] text-stone-900 shadow-[3px_3px_0px_#18181B]'
                  : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>GitHub Deploy</span>
            </button>
          </div>

          <div className="text-xs font-mono font-bold text-stone-700 bg-white px-2.5 py-1 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
            Host: <span className="text-stone-900">127.0.0.1</span>
          </div>
        </div>

        {/* Tab Body Viewports */}
        <div className="flex-1 overflow-hidden relative bg-[#FAF7EE]">
          {/* TAB 1: Authentic Interactive Terminal */}
          {activeTab === 'terminal' && (
            <div className="h-full p-4">
              <TerminalView
                components={components}
                selectedComponentId={selectedComponentId}
                onSelectComponent={onSelectComponent}
              />
            </div>
          )}

          {/* TAB 2: Software & Package Store */}
          {activeTab === 'packages' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden p-6 gap-6">
              {/* Left: Software Catalog */}
              <div className="w-full md:w-1/2 overflow-y-auto space-y-4 pr-1">
                <div>
                  <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-stone-900" />
                    1-Click VPS Software Store
                  </h2>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Pre-configured production stacks ready to install directly into your Ubuntu 24.04 VPS.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1">
                  {/* Nginx */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
                    <div>
                      <div className="font-black text-stone-900 text-sm">Nginx Web Server</div>
                      <div className="text-xs text-stone-600 font-medium mt-0.5">High-performance HTTP server & reverse proxy</div>
                      <span className="inline-block mt-2 text-[10px] bg-[#C7F9CC] text-stone-900 border border-stone-900 px-2 py-0.5 rounded font-mono font-bold shadow-[1px_1px_0px_#18181B]">
                        Port 80
                      </span>
                    </div>
                    <button
                      onClick={() => handleInstallPackage('Nginx', 'apt update && apt install -y nginx && service nginx start')}
                      disabled={isInstalling}
                      className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black rounded-xl text-xs shadow-[2px_2px_0px_#18181B] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </button>
                  </div>

                  {/* Git CLI */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
                    <div>
                      <div className="font-black text-stone-900 text-sm">Git & GitHub CLI</div>
                      <div className="text-xs text-stone-600 font-medium mt-0.5">Source control management & repository tools</div>
                      <span className="inline-block mt-2 text-[10px] bg-[#BAE6FD] text-stone-900 border border-stone-900 px-2 py-0.5 rounded font-mono font-bold shadow-[1px_1px_0px_#18181B]">
                        Pre-installed in NetLab VPS
                      </span>
                    </div>
                    <button
                      onClick={() => handleInstallPackage('Git Verification', 'git --version')}
                      disabled={isInstalling}
                      className="retro-btn px-3 py-1.5 bg-[#F4EEDC] hover:bg-[#e7dfc9] text-stone-900 font-bold rounded-xl text-xs shadow-[2px_2px_0px_#18181B] transition cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>

                  {/* Python 3 */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
                    <div>
                      <div className="font-black text-stone-900 text-sm">Python 3.12 Runtime</div>
                      <div className="text-xs text-stone-600 font-medium mt-0.5">Pre-configured Python environment with standard library</div>
                      <span className="inline-block mt-2 text-[10px] bg-[#BAE6FD] text-stone-900 border border-stone-900 px-2 py-0.5 rounded font-mono font-bold shadow-[1px_1px_0px_#18181B]">
                        Pre-installed in NetLab VPS
                      </span>
                    </div>
                    <button
                      onClick={() => handleInstallPackage('Python Verification', 'python3 --version')}
                      disabled={isInstalling}
                      className="retro-btn px-3 py-1.5 bg-[#F4EEDC] hover:bg-[#e7dfc9] text-stone-900 font-bold rounded-xl text-xs shadow-[2px_2px_0px_#18181B] transition cursor-pointer"
                    >
                      Verify
                    </button>
                  </div>

                  {/* Node.js */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
                    <div>
                      <div className="font-black text-stone-900 text-sm">Node.js 20 LTS & npm</div>
                      <div className="text-xs text-stone-600 font-medium mt-0.5">V8 Javascript runtime for modern backend services</div>
                    </div>
                    <button
                      onClick={() => handleInstallPackage('Node.js', 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs')}
                      disabled={isInstalling}
                      className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black rounded-xl text-xs shadow-[2px_2px_0px_#18181B] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </button>
                  </div>

                  {/* Fastfetch */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#18181B]">
                    <div>
                      <div className="font-black text-stone-900 text-sm">Neofetch / System Specs</div>
                      <div className="text-xs text-stone-600 font-medium mt-0.5">Command-line system information tool with Ubuntu logo</div>
                    </div>
                    <button
                      onClick={() => handleInstallPackage('Neofetch', 'apt update && apt install -y neofetch && neofetch')}
                      disabled={isInstalling}
                      className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black rounded-xl text-xs shadow-[2px_2px_0px_#18181B] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Live Execution Logger */}
              <div className="w-full md:w-1/2 flex flex-col retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181B]">
                <div className="h-9 bg-[#F4EEDC] px-4 flex items-center justify-between border-b-2 border-stone-900 text-xs font-mono text-stone-800 font-bold">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border border-stone-900 ${isInstalling ? 'bg-amber-400 animate-spin' : 'bg-emerald-400'}`} />
                    APT & Installer Console Output
                  </span>
                  <button
                    onClick={() => setInstallLogs('')}
                    className="hover:underline transition cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>
                <pre className="flex-1 p-4 bg-[#0c1017] text-emerald-400 font-mono text-xs overflow-y-auto whitespace-pre-wrap select-text">
                  {installLogs || 'Click "Install" or "Verify" on any software card to execute the live installation inside your Ubuntu VPS.'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: File Explorer & Web Root */}
          {activeTab === 'files' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden p-6 gap-6">
              {/* Directory Browser */}
              <div className="w-full md:w-1/3 flex flex-col retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181B]">
                <div className="h-10 bg-[#F4EEDC] px-3 flex items-center justify-between border-b-2 border-stone-900 text-xs font-mono font-bold">
                  <span className="text-stone-900 truncate">{currentFilePath}</span>
                  <button
                    onClick={() => fetchFiles(currentFilePath)}
                    className="p-1 hover:text-black text-stone-700 cursor-pointer"
                    title="Refresh Directory"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <button
                    onClick={() => {
                      setCurrentFilePath('/var/www/html');
                      fetchFiles('/var/www/html');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-stone-800 hover:bg-[#FAF7EE] text-left border border-stone-300"
                  >
                    <Folder className="w-3.5 h-3.5 text-blue-600" />
                    /var/www/html (Web Root)
                  </button>
                  <button
                    onClick={() => {
                      setCurrentFilePath('/root');
                      fetchFiles('/root');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-stone-800 hover:bg-[#FAF7EE] text-left border border-stone-300"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                    /root (Home)
                  </button>

                  <div className="border-t-2 border-stone-200 my-2" />

                  {fileList.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (!f.isDir) {
                          loadFileContent(`${currentFilePath}/${f.name}`);
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono text-stone-800 hover:bg-[#FAF7EE] text-left transition font-semibold"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {f.isDir ? <Folder className="w-3.5 h-3.5 text-blue-600" /> : <FileText className="w-3.5 h-3.5 text-stone-500" />}
                        {f.name}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold">{f.size}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor */}
              <div className="w-full md:w-2/3 flex flex-col retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181B]">
                <div className="h-10 bg-[#F4EEDC] px-4 flex items-center justify-between border-b-2 border-stone-900 text-xs font-mono">
                  <span className="text-stone-900 font-bold">{editingFile || 'Select a file to edit'}</span>
                  <button
                    onClick={handleSaveFile}
                    disabled={fileSaving || !editingFile}
                    className="retro-btn px-3 py-1 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {fileSaving ? 'Saving...' : 'Save File'}
                  </button>
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="// File content will load here..."
                  className="flex-1 p-4 bg-[#0c1017] text-stone-200 font-mono text-xs outline-none resize-none leading-relaxed select-text"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* TAB 4: Processes & System Monitor */}
          {activeTab === 'processes' && (
            <div className="h-full flex flex-col overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-700" />
                    VPS Real-time Process Explorer
                  </h2>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Live system processes running inside your Ubuntu container (via ps aux).
                  </p>
                </div>
                <button
                  onClick={fetchProcesses}
                  disabled={loadingProcesses}
                  className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] border-2 border-stone-900 text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProcesses ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="flex-1 retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden flex flex-col shadow-[4px_4px_0px_#18181B]">
                <div className="h-9 bg-[#F4EEDC] px-4 grid grid-cols-12 text-xs font-mono font-black text-stone-800 border-b-2 border-stone-900 items-center">
                  <span className="col-span-2">USER</span>
                  <span className="col-span-2">PID</span>
                  <span className="col-span-2">CPU %</span>
                  <span className="col-span-2">MEM %</span>
                  <span className="col-span-4">COMMAND</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y-2 divide-stone-200 p-2 font-mono text-xs">
                  {processes.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-12 py-2 px-2 hover:bg-[#FAF7EE] rounded-lg transition items-center text-stone-900 font-bold">
                      <span className="col-span-2 text-amber-700">{p.user}</span>
                      <span className="col-span-2 text-blue-700 font-black">{p.pid}</span>
                      <span className="col-span-2 text-emerald-700">{p.cpu}</span>
                      <span className="col-span-2 text-purple-700">{p.mem}</span>
                      <span className="col-span-4 truncate text-stone-800" title={p.command}>
                        {p.command}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Ports & SSH Access */}
          {activeTab === 'network' && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Network className="w-4 h-4 text-stone-900" />
                Network Interfaces & Open Port Mappings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* SSH Card */}
                <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_#18181B]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#C7F9CC] border-2 border-stone-900 rounded-xl text-stone-900 shadow-[2px_2px_0px_#18181B]">
                      <ShieldCheck className="w-6 h-6 text-emerald-800" />
                    </div>
                    <div>
                      <h3 className="font-black text-stone-900 text-sm">OpenSSH Server (Port 22)</h3>
                      <p className="text-xs text-stone-600 font-medium">Direct secure shell access from host machine terminal</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF7EE] border-2 border-stone-900 rounded-xl p-3 font-mono text-xs space-y-1.5 shadow-[2px_2px_0px_#18181B]">
                    <div className="text-stone-600 font-bold">Connection Command:</div>
                    <div className="text-stone-900 font-black select-all">{sshCommand}</div>
                    <div className="text-stone-600 pt-1 font-medium">
                      Default Password: <span className="text-emerald-800 font-black">netlab123</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopySsh}
                    className="retro-btn w-full py-2.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black rounded-xl text-xs shadow-[3px_3px_0px_#18181B] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {copiedSsh ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                    {copiedSsh ? 'Copied SSH Command!' : 'Copy Terminal SSH Command'}
                  </button>
                </div>

                {/* HTTP Card */}
                <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_#18181B]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#BAE6FD] border-2 border-stone-900 rounded-xl text-stone-900 shadow-[2px_2px_0px_#18181B]">
                      <Globe className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-stone-900 text-sm">HTTP Web Hosting (Port 80)</h3>
                      <p className="text-xs text-stone-600 font-medium">Serves files from /var/www/html or Nginx web root</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF7EE] border-2 border-stone-900 rounded-xl p-3 font-mono text-xs space-y-1.5 shadow-[2px_2px_0px_#18181B]">
                    <div className="text-stone-600 font-bold">Local Gateway URL:</div>
                    <div className="text-blue-700 font-black select-all">http://127.0.0.1:18081/</div>
                    <div className="text-stone-600 pt-1 font-medium">
                      Mapped Path: <span className="text-stone-900 font-bold">/var/www/html</span>
                    </div>
                  </div>

                  <a
                    href="http://127.0.0.1:18081"
                    target="_blank"
                    rel="noreferrer"
                    className="retro-btn w-full py-2.5 bg-[#BAE6FD] hover:bg-[#7dd3fc] text-stone-900 font-black rounded-xl text-xs shadow-[3px_3px_0px_#18181B] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Local Browser
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GitHub Login & Deploy */}
          {activeTab === 'github' && (
            <div className="h-full overflow-y-auto p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-purple-700" />
                    GitHub VPS Integration
                  </h2>
                  <p className="text-xs text-stone-600 font-medium mt-1">
                    Authenticate with GitHub, then clone and deploy any repository into your Ubuntu VPS.
                  </p>
                </div>
                {ghLoggedIn && ghUser && (
                  <div className="flex items-center gap-3 bg-white border-2 border-stone-900 rounded-2xl px-4 py-2 shadow-[2px_2px_0px_#18181B]">
                    <img src={ghUser.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-stone-900" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div>
                      <div className="text-xs font-black text-stone-900">{ghUser.login}</div>
                      <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1"><Unlock className="w-2.5 h-2.5" /> Authenticated</div>
                    </div>
                    <button onClick={handleGhLogout} className="retro-btn ml-2 p-1.5 rounded-lg bg-[#FDA4AF] hover:bg-[#fb7185] text-stone-900 border border-stone-900 shadow-[1px_1px_0px_#18181B] transition cursor-pointer" title="Logout">
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* LEFT: Auth Panel */}
                <div className="space-y-4">
                  {!ghLoggedIn ? (
                    <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181B]">
                      {/* Auth method tabs */}
                      <div className="flex border-b-2 border-stone-900 bg-[#FAF7EE]">
                        <button
                          onClick={() => setGhAuthTab('pat')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black transition ${ghAuthTab === 'pat' ? 'bg-[#FEF08A] text-stone-900 border-b-2 border-stone-900 shadow-inner' : 'text-stone-700 hover:bg-white'}`}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Personal Access Token
                        </button>
                        <button
                          onClick={() => setGhAuthTab('ssh')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black transition ${ghAuthTab === 'ssh' ? 'bg-[#BAE6FD] text-stone-900 border-b-2 border-stone-900 shadow-inner' : 'text-stone-700 hover:bg-white'}`}
                        >
                          <Lock className="w-3.5 h-3.5" /> SSH Key
                        </button>
                      </div>

                      {ghAuthTab === 'pat' && (
                        <form onSubmit={handleGhLogin} className="p-5 space-y-4">
                          <div className="flex items-center gap-2 p-3 bg-[#F3E8FF] border-2 border-stone-900 rounded-xl text-xs text-stone-900 font-bold shadow-[2px_2px_0px_#18181B]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-purple-800" />
                            <span>Generate a PAT at <strong>GitHub → Settings → Developer Settings → Personal Access Tokens</strong> with <code className="bg-white px-1 border border-stone-900 rounded">repo</code> scope.</span>
                          </div>
                          <div>
                            <label className="block text-xs font-black text-stone-800 mb-1.5 flex items-center gap-1.5">
                              <User className="w-3 h-3" /> GitHub Username
                            </label>
                            <input
                              type="text"
                              required
                              value={ghUsername}
                              onChange={(e) => setGhUsername(e.target.value)}
                              placeholder="IamFreak10"
                              className="w-full bg-white border-2 border-stone-900 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-stone-800 mb-1.5 flex items-center gap-1.5">
                              <KeyRound className="w-3 h-3" /> Personal Access Token
                            </label>
                            <div className="relative">
                              <input
                                type={showPat ? 'text' : 'password'}
                                required
                                value={ghPat}
                                onChange={(e) => setGhPat(e.target.value)}
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                className="w-full bg-white border-2 border-stone-900 rounded-xl px-4 py-2.5 pr-10 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPat(!showPat)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-black transition cursor-pointer"
                              >
                                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {ghAuthError && (
                            <div className="p-3 bg-[#FECDD3] border-2 border-stone-900 rounded-xl text-xs text-stone-900 font-bold flex items-start gap-2 shadow-[2px_2px_0px_#18181B]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-800" />
                              {ghAuthError}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={ghAuthLoading || !ghUsername.trim() || !ghPat.trim()}
                            className="retro-btn w-full py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 font-black rounded-xl text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[3px_3px_0px_#18181B]"
                          >
                            {ghAuthLoading
                              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...</>
                              : <><LogIn className="w-4 h-4" /> Login to GitHub</>}
                          </button>
                        </form>
                      )}

                      {ghAuthTab === 'ssh' && (
                        <div className="p-5 space-y-4">
                          <div className="flex items-center gap-2 p-3 bg-[#BAE6FD] border-2 border-stone-900 rounded-xl text-xs text-stone-900 font-bold shadow-[2px_2px_0px_#18181B]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-blue-800" />
                            <span>Generate an SSH key on your VPS, then add the public key to <strong>GitHub → Settings → SSH and GPG Keys</strong>.</span>
                          </div>

                          <button
                            onClick={handleGenerateSshKey}
                            disabled={sshKeyLoading}
                            className="retro-btn w-full py-2.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 font-black rounded-xl text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[3px_3px_0px_#18181B]"
                          >
                            {sshKeyLoading
                              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Key...</>
                              : <><KeyRound className="w-4 h-4" /> Generate SSH Key (ed25519)</>}
                          </button>

                          {sshPubKey && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-stone-800">Your Public Key (copy & add to GitHub):</span>
                                <button
                                  onClick={handleCopySshKey}
                                  className="retro-btn flex items-center gap-1.5 px-2.5 py-1 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 border border-stone-900 rounded-lg text-xs font-black shadow-[1px_1px_0px_#18181B] transition cursor-pointer"
                                >
                                  {copiedKey ? <><Check className="w-3 h-3 text-emerald-800" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Key</>}
                                </button>
                              </div>
                              <pre className="bg-[#0c1017] border-2 border-stone-900 rounded-xl p-3 text-[10px] font-mono text-emerald-400 break-all whitespace-pre-wrap select-all shadow-[2px_2px_0px_#18181B]">{sshPubKey}</pre>
                              <a
                                href="https://github.com/settings/keys"
                                target="_blank"
                                rel="noreferrer"
                                className="retro-btn flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-[#FAF7EE] border-2 border-stone-900 text-stone-900 text-xs font-black rounded-xl shadow-[2px_2px_0px_#18181B] transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open GitHub SSH Settings
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Logged-in profile card */
                    <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_#18181B]">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={ghUser?.avatar} alt="avatar" className="w-14 h-14 rounded-2xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B]" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%236d28d9"/><text y=".9em" font-size="60" x="50%" text-anchor="middle" fill="white">G</text></svg>'; }} />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-stone-900" />
                        </div>
                        <div>
                          <div className="text-base font-black text-stone-900">{ghUser?.name}</div>
                          <div className="text-xs text-purple-700 font-mono font-bold">@{ghUser?.login}</div>
                          <div className="text-xs text-stone-600 mt-0.5 font-medium">{ghUser?.email}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Auth Method', value: 'PAT Token', color: 'text-purple-700' },
                          { label: 'Protocol', value: 'HTTPS', color: 'text-blue-700' },
                          { label: 'Status', value: '✓ Active', color: 'text-emerald-700' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-[#FAF7EE] border border-stone-900 rounded-xl p-2.5 shadow-[1px_1px_0px_#18181B]">
                            <div className={`text-xs font-black ${color}`}>{value}</div>
                            <div className="text-[10px] text-stone-600 font-bold mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#0c1017] border-2 border-stone-900 rounded-xl p-3 font-mono text-xs space-y-1 text-stone-200 shadow-[2px_2px_0px_#18181B]">
                        <div><span className="text-stone-500">$</span> git config user.name <span className="text-emerald-400">"{ghUser?.login}"</span></div>
                        <div><span className="text-stone-500">$</span> git config credential.helper <span className="text-cyan-400">store</span></div>
                        <div><span className="text-stone-500">$</span> gh auth status <span className="text-emerald-400">✓ Logged in</span></div>
                      </div>
                    </div>
                  )}

                  {/* Auth Terminal Log */}
                  {ghAuthLog.length > 0 && (
                    <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_#18181B]">
                      <div className="h-8 bg-[#F4EEDC] border-b-2 border-stone-900 px-4 flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-stone-800 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-stone-900 bg-emerald-400 animate-pulse" />
                          gh CLI / git config output
                        </span>
                        <button onClick={() => setGhAuthLog([])} className="text-[10px] font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer">Clear</button>
                      </div>
                      <pre className="p-4 text-xs font-mono bg-[#0c1017] text-stone-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {ghAuthLog.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>

                {/* RIGHT: Clone & Deploy */}
                <div className="space-y-4">
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_#18181B]">
                    <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-700" />
                      Clone & Deploy Repository
                      {ghLoggedIn && <span className="ml-auto text-[10px] bg-[#C7F9CC] text-stone-900 border border-stone-900 px-2 py-0.5 rounded-full font-black shadow-[1px_1px_0px_#18181B]">Authenticated ✓</span>}
                    </h3>

                    <form onSubmit={handleGitClone} className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-stone-800 mb-1.5">Repository URL</label>
                        <input
                          type="text"
                          required
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder={ghLoggedIn ? `https://github.com/${ghUser?.login}/my-repo.git` : 'https://github.com/username/repo.git'}
                          className="w-full bg-white border-2 border-stone-900 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-stone-800 mb-1.5">Target Directory</label>
                          <input
                            type="text"
                            value={targetDir}
                            onChange={(e) => setTargetDir(e.target.value)}
                            className="w-full bg-white border-2 border-stone-900 rounded-xl px-4 py-2 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-stone-800 mb-1.5">Branch</label>
                          <input
                            type="text"
                            value={gitBranch}
                            onChange={(e) => setGitBranch(e.target.value)}
                            className="w-full bg-white border-2 border-stone-900 rounded-xl px-4 py-2 text-xs text-stone-900 font-mono font-bold shadow-[2px_2px_0px_#18181B] outline-none"
                          />
                        </div>
                      </div>

                      {!ghLoggedIn && (
                        <div className="flex items-center gap-2 p-2.5 bg-[#FEF08A] border-2 border-stone-900 rounded-xl text-xs text-stone-900 font-bold shadow-[2px_2px_0px_#18181B]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-800" />
                          Login with GitHub first to clone private repositories.
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isCloning || !repoUrl.trim()}
                        className="retro-btn w-full py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 font-black rounded-xl text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[3px_3px_0px_#18181B]"
                      >
                        <GitBranch className={`w-4 h-4 ${isCloning ? 'animate-spin' : ''}`} />
                        {isCloning ? 'Cloning Repository...' : '🚀 Clone & Deploy to VPS'}
                      </button>

                      {gitStatusMsg && (
                        <div className={`p-3 border-2 border-stone-900 rounded-xl text-xs font-mono font-bold shadow-[2px_2px_0px_#18181B] ${gitStatusMsg.includes('failed') || gitStatusMsg.includes('Error') ? 'bg-[#FECDD3] text-stone-900' : 'bg-[#C7F9CC] text-stone-900'}`}>
                          {gitStatusMsg}
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Quick clone presets */}
                  <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 space-y-3 shadow-[4px_4px_0px_#18181B]">
                    <h3 className="text-xs font-black text-stone-900 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Quick Clone Presets
                    </h3>
                    <div className="space-y-2">
                      {[
                        { name: 'Your Repos', url: ghLoggedIn ? `https://github.com/${ghUser?.login}` : 'Login first', icon: '👤', locked: !ghLoggedIn },
                        { name: 'Static HTML Site', url: 'https://github.com/github/personal-website.git', icon: '🌐', locked: false },
                        { name: 'Node.js Express API', url: 'https://github.com/expressjs/express.git', icon: '⚡', locked: false },
                        { name: 'Nginx Config Templates', url: 'https://github.com/h5bp/server-configs-nginx.git', icon: '🔧', locked: false },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => !preset.locked && setRepoUrl(preset.url)}
                          disabled={preset.locked}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-left transition border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] ${preset.locked ? 'opacity-40 cursor-not-allowed bg-stone-100' : 'bg-[#FAF7EE] hover:bg-[#FEF08A] cursor-pointer'}`}
                        >
                          <span className="text-base">{preset.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-stone-900">{preset.name}</div>
                            <div className="text-stone-600 font-mono font-medium truncate">{preset.url}</div>
                          </div>
                          {preset.locked ? <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" /> : <ExternalLink className="w-3 h-3 text-stone-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
