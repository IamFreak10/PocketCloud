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
        'Open the "Web Servers" tab to verify the Nginx configuration.',
        'In your browser, visit the gateway route or open the Built-in NetLab Browser.',
        'Click "Verify Mission Criteria".',
      ],
      concept:
        'Reverse proxies examine the incoming HTTP Host header to route traffic to distinct internal containers running on different private ports.',
      check: (lab) => {
        if (!lab) return { passed: false, message: 'No active lab selected.' };
        const web = lab.components.find((c) => c.component_type === 'web');
        if (!web) return { passed: false, message: 'Lab does not contain a Web Server component.' };
        if (web.status !== 'running')
          return { passed: false, message: 'Web server is not running. Please start it.' };
        return { passed: true, message: 'Success! Web server is active and accessible via loopback gateway.' };
      },
    },
    {
      id: 'mission-3',
      title: '3. Configure Authoritative DNS for shop.test',
      category: 'DNS',
      level: 'Intermediate',
      description: 'Map a virtual domain name to your running web server without editing /etc/hosts or system configs.',
      instructions: [
        'Open the "Virtual DNS" tab.',
        'Create an A record mapping "shop.test" to your Web Server component.',
        'Use the built-in resolver tool to query "shop.test" and verify NOERROR status.',
        'Click "Verify Mission Criteria".',
      ],
      concept:
        'Authoritative DNS servers hold the official mapping records for a domain zone. NetLab operates an in-process authoritative zone for all lab requests.',
      check: (lab) => {
        if (!lab) return { passed: false, message: 'No active lab selected.' };
        return { passed: true, message: 'Success! Authoritative DNS mapping is configured.' };
      },
    },
  ];

  const activeMission = missions.find((m) => m.id === selectedMissionId) || missions[0];

  const handleVerify = () => {
    const res = activeMission.check(currentLab);
    setVerificationResult(res);
    if (res.passed && !completedMissions.includes(activeMission.id)) {
      setCompletedMissions([...completedMissions, activeMission.id]);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🏆</span> Hands-on Guided Missions & Labs
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-medium">
          Step-by-step challenges to master Linux sysadmin, networking, reverse proxies, and cloud infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mission list */}
        <div className="space-y-3">
          {missions.map((mission) => {
            const isCompleted = completedMissions.includes(mission.id);
            const isSelected = selectedMissionId === mission.id;

            return (
              <button
                key={mission.id}
                onClick={() => {
                  setSelectedMissionId(mission.id);
                  setVerificationResult(null);
                }}
                className={`w-full text-left p-4 rounded-2xl border-2 border-stone-900 transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#FEF08A] shadow-[4px_4px_0px_#18181B]'
                    : 'bg-white hover:bg-[#FAF7EE] shadow-[2px_2px_0px_#18181B]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded bg-white border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                    {mission.category}
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-[#C7F9CC] px-2 py-0.5 rounded-full border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passed
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-stone-500">Not verified</span>
                  )}
                </div>
                <h3 className="font-black text-sm text-stone-900">{mission.title}</h3>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2 font-medium">{mission.description}</p>
              </button>
            );
          })}
        </div>

        {/* Mission Details Pane */}
        <div className="lg:col-span-2 space-y-6">
          <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-6 shadow-[4px_4px_0px_#18181B] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-stone-900" />
                <h2 className="text-base font-black text-stone-900">{activeMission.title}</h2>
              </div>
              <span className="text-xs font-bold text-stone-700 bg-[#BAE6FD] px-2.5 py-1 rounded-lg border border-stone-900 shadow-[1px_1px_0px_#18181B]">
                {activeMission.level} Level
              </span>
            </div>

            <p className="text-xs text-stone-700 font-medium leading-relaxed">{activeMission.description}</p>

            {/* Step-by-step instructions */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider">
                Step-by-Step Instructions:
              </h3>
              <div className="space-y-2">
                {activeMission.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-800 font-medium">
                    <span className="font-mono font-black text-stone-900 bg-[#FAF7EE] border border-stone-900 w-5 h-5 rounded flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#18181B]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core concept explainer */}
            <div className="p-4 bg-[#F4EEDC] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                <BookOpen className="w-4 h-4" />
                <span>Core Concept: Why This Matters</span>
              </div>
              <p className="text-xs text-stone-700 font-medium leading-relaxed">{activeMission.concept}</p>
            </div>

            {/* Verification Trigger */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleVerify}
                className="retro-btn w-full sm:w-auto px-6 py-2.5 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 rounded-xl text-xs font-black shadow-[3px_3px_0px_#18181B] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Verify Mission Criteria</span>
              </button>

              {verificationResult && (
                <div
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] text-xs font-bold flex items-center gap-2 ${
                    verificationResult.passed
                      ? 'bg-[#C7F9CC] text-stone-900'
                      : 'bg-[#FECDD3] text-stone-900'
                  }`}
                >
                  {verificationResult.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-800" />
                  )}
                  <span>{verificationResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
