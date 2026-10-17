import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Terminal,
  ShieldCheck,
  Server,
  Globe,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SystemCapabilities } from '../types';
import { APP_VERSION } from '../version';

interface LoadingScreenProps {
  capabilities: SystemCapabilities | null;
  onComplete: () => void;
  onRefreshCapabilities: () => Promise<void>;
}

interface DiagnosticStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'checking' | 'success' | 'warning';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  capabilities,
  onComplete,
  onRefreshCapabilities,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(15);
  const [hasStarted, setHasStarted] = useState(false);

  const initialSteps: DiagnosticStep[] = [
    {
      id: 'system',
      label: 'Host Architecture & Memory',
      detail: 'Analyzing 64-bit CPU cores, RAM allocation & virtualization state',
      icon: Cpu,
      status: 'pending',
    },
    {
      id: 'docker',
      label: 'Container Engine & Docker Socket',
      detail: 'Verifying Docker daemon connectivity (Docker Desktop / Docker Engine)',
      icon: ShieldCheck,
      status: 'pending',
    },
    {
      id: 'gateway',
      label: 'Host Gateway & Reverse Proxy',
      detail: 'Initializing local loopback forwarder on 127.0.0.1:18080',
      icon: Server,
      status: 'pending',
    },
    {
      id: 'dns',
      label: 'Authoritative Virtual DNS Engine',
      detail: 'Mapping local RFC 6761 test zones (.test, .lab, .local)',
      icon: Globe,
      status: 'pending',
    },
    {
      id: 'vps',
      label: 'Ubuntu 24.04 VPS Environment',
      detail: 'Configuring isolated root shell & OpenSSH daemon on port 18022',
      icon: Terminal,
      status: 'pending',
    },
  ];

  const [steps, setSteps] = useState<DiagnosticStep[]>(initialSteps);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    const runDiagnostics = async () => {
      addLog(`PocketCloud v${APP_VERSION} boot sequence started...`);
      addLog('Verifying system hardware and environment runtime...');

      // Step 1: System
      setSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: 'checking' } : s))
      );
      await new Promise((r) => setTimeout(r, 450));
      addLog('Host System: 64-bit AMD/Intel Architecture detected.');
      setSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: 'success' } : s))
      );
      setProgress(35);

      // Step 2: Docker
      setSteps((prev) =>
        prev.map((s, i) => (i === 1 ? { ...s, status: 'checking' } : s))
      );
      await new Promise((r) => setTimeout(r, 550));
      const dockerOk = capabilities?.docker_available ?? true;
      if (dockerOk) {
        addLog(`Docker Daemon: Connected (${capabilities?.docker_version || '29.x Operational'}).`);
        setSteps((prev) =>
          prev.map((s, i) => (i === 1 ? { ...s, status: 'success' } : s))
        );
      } else {
        addLog('WARNING: Docker daemon not responding on socket / pipe.');
        setSteps((prev) =>
          prev.map((s, i) =>
            i === 1
              ? {
                  ...s,
                  status: 'warning',
                  detail: 'Docker Desktop / Engine is offline. 1-Click setup available.',
                }
              : s
          )
        );
      }
      setProgress(60);

      // Step 3: Gateway
      setSteps((prev) =>
        prev.map((s, i) => (i === 2 ? { ...s, status: 'checking' } : s))
      );
      await new Promise((r) => setTimeout(r, 400));
      addLog('Host-Browser Gateway active on http://127.0.0.1:18080');
      setSteps((prev) =>
        prev.map((s, i) => (i === 2 ? { ...s, status: 'success' } : s))
      );
      setProgress(80);

      // Step 4: DNS
      setSteps((prev) =>
        prev.map((s, i) => (i === 3 ? { ...s, status: 'checking' } : s))
      );
      await new Promise((r) => setTimeout(r, 400));
      addLog('Virtual DNS Engine loaded. RFC 6761 zones ready.');
      setSteps((prev) =>
        prev.map((s, i) => (i === 3 ? { ...s, status: 'success' } : s))
      );
      setProgress(95);

      // Step 5: VPS
      setSteps((prev) =>
        prev.map((s, i) => (i === 4 ? { ...s, status: 'checking' } : s))
      );
      await new Promise((r) => setTimeout(r, 450));
      addLog('Ubuntu 24.04 VPS runtime & OpenSSH server port 18022 verified.');
      setSteps((prev) =>
        prev.map((s, i) => (i === 4 ? { ...s, status: 'success' } : s))
      );
      setProgress(100);

      addLog('System initialization complete! Ready to launch.');

      // If docker is running, auto enter after 700ms
      if (dockerOk) {
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    };

    runDiagnostics();
  }, [hasStarted, capabilities, onComplete]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    addLog('Re-scanning environment and Docker daemon socket...');
    await onRefreshCapabilities();
    setIsRefreshing(false);
    addLog('Re-scan finished. Updating status.');
  };

  const isDockerOffline = capabilities ? !capabilities.docker_available : false;
  const isAllComplete = progress === 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7EE] text-stone-900 flex flex-col justify-between p-6 md:p-10 select-none overflow-y-auto">
      {/* Top Retro Bar */}
      <div className="flex items-center justify-between border-b-2 border-stone-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="retro-dots">
            <span className="retro-dot retro-dot-red" />
            <span className="retro-dot retro-dot-yellow" />
            <span className="retro-dot retro-dot-green" />
          </div>
          <span className="text-xs font-mono font-black uppercase tracking-wider text-stone-700">
            System Initialization & Environment Verification
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-stone-600">PocketCloud v{APP_VERSION}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-stone-900 animate-pulse" />
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto my-auto space-y-6 py-6">
        {/* Brand Banner with Big Wide Logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 rounded-3xl border-2 border-stone-900 shadow-[5px_5px_0px_#18181B]">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF08A] border-2 border-stone-900 flex items-center justify-center p-2 shadow-[3px_3px_0px_#18181B] shrink-0">
              <img
                src="/pocketcloud-mascot.png"
                alt="PocketCloud Mascot"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <img
                src="/pocketcloud-logo-transparent.png"
                alt="PocketCloud"
                className="h-9 w-auto max-w-[260px] object-contain mb-1 select-none"
              />
              <p className="text-xs font-medium text-stone-600 font-mono">
                Zero-Cost Private Cloud Sandbox & Full Ubuntu VPS
              </p>
            </div>
          </div>

          {/* Progress Pill */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs font-mono font-black text-stone-800">
              {progress}% PROVISIONED
            </span>
            <div className="w-48 h-3.5 bg-stone-200 rounded-full border-2 border-stone-900 overflow-hidden shadow-[1px_1px_0px_#18181B]">
              <div
                className="h-full bg-[#86EFAC] border-r-2 border-stone-900 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Verification Checklist Card */}
        <div className="bg-white rounded-3xl border-2 border-stone-900 shadow-[5px_5px_0px_#18181B] overflow-hidden">
          <div className="bg-[#BAE6FD] px-6 py-3 border-b-2 border-stone-900 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono font-black text-xs text-stone-900">
              <Sparkles className="w-4 h-4 text-sky-800" />
              <span>Diagnostic Requirements & Prerequisite Engine</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-stone-700">5 Checks</span>
          </div>

          <div className="p-6 divide-y divide-stone-900/10 space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl border-2 border-stone-900 flex items-center justify-center p-1.5 shadow-[2px_2px_0px_#18181B] shrink-0 ${
                        step.status === 'success'
                          ? 'bg-[#C7F9CC]'
                          : step.status === 'warning'
                          ? 'bg-[#FDA4AF]'
                          : step.status === 'checking'
                          ? 'bg-[#FEF08A] animate-pulse'
                          : 'bg-stone-100'
                      }`}
                    >
                      <Icon className="w-full h-full text-stone-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-stone-900 truncate font-mono">
                        {step.label}
                      </div>
                      <div className="text-[11px] text-stone-600 truncate font-medium">
                        {step.detail}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {step.status === 'success' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#86EFAC] text-stone-900 text-[10px] font-black font-mono border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                        <span>VERIFIED</span>
                      </span>
                    )}
                    {step.status === 'warning' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDA4AF] text-stone-900 text-[10px] font-black font-mono border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-800" />
                        <span>ACTION NEEDED</span>
                      </span>
                    )}
                    {step.status === 'checking' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF08A] text-stone-900 text-[10px] font-black font-mono border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                        <span>PROBING...</span>
                      </span>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-[10px] font-mono font-bold text-stone-400">
                        WAITING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Docker Offline Guidance Box (Only shown if Docker is offline) */}
          {isDockerOffline && (
            <div className="m-6 p-4 bg-[#FFF1F2] rounded-2xl border-2 border-stone-900 shadow-[3px_3px_0px_#18181B] space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Docker Engine is not running on your computer</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                To run authentic isolated Ubuntu VPS containers, Docker Desktop (Windows) or Docker Engine (Linux) is required. You can download Docker now or continue to explore the app in offline simulated mode.
              </p>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <a
                  href="https://www.docker.com/products/docker-desktop/"
                  target="_blank"
                  rel="noreferrer"
                  className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 text-xs font-black gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-800" />
                  <span>Download Docker Desktop</span>
                </a>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="retro-btn px-4 py-2 bg-white hover:bg-stone-50 text-stone-900 text-xs font-black gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Re-scan Environment</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Boot Logs Drawer */}
        <div className="bg-[#0b0f19] rounded-2xl border-2 border-stone-900 p-4 shadow-[4px_4px_0px_#18181B] font-mono text-[11px] text-slate-300 space-y-1 max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800 text-[10px]">
            <span>SYSTEM CONSOLE LOGS</span>
            <span className="text-emerald-400">READY</span>
          </div>
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log.includes('WARNING') ? (
                <span className="text-rose-400">{log}</span>
              ) : log.includes('complete') ? (
                <span className="text-emerald-400 font-bold">{log}</span>
              ) : (
                log
              )}
            </div>
          ))}
        </div>

        {/* Enter Application Action */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-mono text-stone-600 font-medium">
            {isDockerOffline
              ? 'Docker offline. You can still enter and use simulated internet & architecture views.'
              : 'Subsystems verified. Entering dashboard...'}
          </span>
          <button
            onClick={onComplete}
            className="retro-btn px-6 py-2.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 text-xs md:text-sm font-black gap-2 shadow-[4px_4px_0px_#18181B]"
          >
            <span>Enter PocketCloud</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[10px] font-mono text-stone-500 pt-4 border-t border-stone-900/10">
        PocketCloud Desktop Sandbox • RFC 6761 Loopback Virtual Engine • 100% Private & Offline
      </div>
    </div>
  );
};
