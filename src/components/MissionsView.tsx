import React, { useState } from 'react';
import { Award, CheckCircle2, Circle, ArrowRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { Lab } from '../types';

interface MissionsViewProps {
  currentLab: Lab | null;
  onOpenTerminal: (compId: string) => void;
}

interface Mission {
  id: string;
  title: string;
  category: 'Linux' | 'Web Servers' | 'DNS' | 'DevOps';
  level: 'Beginner' | 'Intermediate';
  description: string;
  instructions: string[];
  concept: string;
  check: (lab: Lab | null) => { passed: boolean; message: string };
}

export const MissionsView: React.FC<MissionsViewProps> = ({ currentLab, onOpenTerminal }) => {
  const [selectedMissionId, setSelectedMissionId] = useState('mission-1');
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    message: string;
  } | null>(null);

  const missions: Mission[] = [
    {
      id: 'mission-1',
      title: '1. Create & Start Your First Linux VPS Node',
      category: 'Linux',
      level: 'Beginner',
      description: 'Spin up an isolated Linux container, verify its kernel version, and inspect the filesystem.',
      instructions: [
        'Open the "My Labs" tab or Dashboard and create/select a lab.',
        'Click the "Start" button on the Linux VPS Node component.',
        'Open the interactive terminal and run `uname -a` or `cat /etc/os-release`.',
        'Click "Verify Mission Criteria" below.',
      ],
      concept:
        'Linux containers provide isolated user spaces (namespaces and cgroups) on top of the host kernel, offering high-density and instant spin-up times compared to full virtual machines.',
      check: (lab) => {
        if (!lab) return { passed: false, message: 'No active lab selected.' };
        const vps = lab.components.find((c) => c.component_type === 'vps');
        if (!vps) return { passed: false, message: 'Lab does not contain a VPS node.' };
        if (vps.status !== 'running')
          return { passed: false, message: 'VPS Node is currently stopped. Click "Start" first.' };
        return { passed: true, message: 'Success! VPS Node is running in an isolated container environment.' };
      },
    },
    {
      id: 'mission-2',
      title: '2. Deploy an HTTP Web Server & Route to Host',
      category: 'Web Servers',
      level: 'Beginner',
      description: 'Run an HTTP web server on port 80 and expose it to the host PC browser via the NetLab Gateway.',
      instructions: [
        'Ensure your Web Server component is started in the current lab.',
        'Verify that host port 18081 is mapped to internal port 80.',
        'Click "Preview" or open `http://127.0.0.1:18081/` in your host browser.',
        'Click "Verify Mission Criteria" below.',
      ],
      concept:
        'Port forwarding binds a host loopback socket (e.g. 127.0.0.1:18081) to a container port (e.g. 80). Traffic from your browser reaches the isolated server without public network exposure.',
      check: (lab) => {
        if (!lab) return { passed: false, message: 'No active lab selected.' };
        const web = lab.components.find((c) => c.component_type === 'web');
        if (!web) return { passed: false, message: 'Lab does not contain a Web Server component.' };
        if (web.status !== 'running')
          return { passed: false, message: 'Web Server is not running. Please start it.' };
        if (!web.host_port)
          return { passed: false, message: 'Web Server does not have a host port mapped.' };
        return { passed: true, message: 'Success! Web server is active and accessible on host loopback.' };
      },
    },
    {
      id: 'mission-3',
      title: '3. Virtual Domain Resolution (RFC 6761)',
      category: 'DNS',
      level: 'Intermediate',
      description: 'Configure a virtual domain route and access it via modern .localhost loopback resolution.',
      instructions: [
        'Check the "Host Gateway Bridge" tab to inspect the registered domain routes.',
        'Verify that `app.localhost` routes to your running web server.',
        'Run an HTTP probe to test domain reachability.',
        'Click "Verify Mission Criteria" below.',
      ],
      concept:
        'RFC 6761 reserves the `.localhost` top-level domain for loopback resolution. By combining host header inspection in NetLab Gateway with standard browser behavior, we achieve seamless multi-tenant domain testing.',
      check: (lab) => {
        if (!lab) return { passed: false, message: 'No active lab selected.' };
        if (lab.routes.length === 0)
          return { passed: false, message: 'No domain routes configured in this lab.' };
        return { passed: true, message: 'Success! Virtual domain route is active and registered with Host Gateway.' };
      },
    },
  ];

  const activeMission = missions.find((m) => m.id === selectedMissionId) || missions[0];

  const handleVerify = () => {
    const result = activeMission.check(currentLab);
    setVerificationResult(result);
    if (result.passed && !completedMissions.includes(activeMission.id)) {
      setCompletedMissions([...completedMissions, activeMission.id]);
    }
  };

  return (
    <div className="h-full flex p-8 gap-8 select-none overflow-hidden">
      {/* Left: Mission list */}
      <div className="w-80 flex flex-col bg-[#0d1424] border border-gray-800 rounded-xl overflow-hidden shadow-xl shrink-0">
        <div className="p-4 border-b border-gray-800 bg-[#111a2d]">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-sm">Learning Missions</h2>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {completedMissions.length} of {missions.length} missions completed
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {missions.map((m) => {
            const isCompleted = completedMissions.includes(m.id);
            const isSelected = selectedMissionId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMissionId(m.id);
                  setVerificationResult(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-xs transition cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-cyan-950/80 border border-cyan-800/80 text-white'
                    : 'bg-[#121c31] hover:bg-[#182542] border border-gray-800/80 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-gray-200">{m.title}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                    {m.category} • {m.level}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Mission Details */}
      <div className="flex-1 bg-[#0d1424] border border-gray-800 rounded-xl p-8 overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-cyan-400 px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                {activeMission.category}
              </span>
              <h1 className="text-2xl font-bold text-white mt-2">{activeMission.title}</h1>
            </div>
            {completedMissions.includes(activeMission.id) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mission Passed</span>
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Objective</h3>
            <p className="text-sm text-gray-200 leading-relaxed">{activeMission.description}</p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h3>
            <ol className="space-y-2 text-xs text-gray-300 list-decimal list-inside bg-[#11192b] p-4 rounded-lg border border-gray-800/80">
              {activeMission.instructions.map((inst, idx) => (
                <li key={idx} className="leading-relaxed">{inst}</li>
              ))}
            </ol>
          </div>

          <div className="bg-[#121f36] border border-blue-900/40 rounded-lg p-4">
            <h3 className="text-xs font-bold text-blue-300 flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Underlying Concept</span>
            </h3>
            <p className="text-xs text-blue-200/80 leading-relaxed">{activeMission.concept}</p>
          </div>

          {verificationResult && (
            <div
              className={`p-4 rounded-lg border flex items-center gap-3 text-xs ${
                verificationResult.passed
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-800 text-rose-200'
              }`}
            >
              {verificationResult.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="font-bold">
                  {verificationResult.passed ? 'Criteria Verified!' : 'Verification Failed'}
                </div>
                <div>{verificationResult.message}</div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={handleVerify}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Verify Mission Criteria</span>
          </button>
        </div>
      </div>
    </div>
  );
};
