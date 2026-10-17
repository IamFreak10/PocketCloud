import React, { useState } from 'react';
import {
  Server,
  Globe,
  CheckCircle2,
  RefreshCw,
  FileCode,
  AlertCircle,
  Play,
  Check,
} from 'lucide-react';
import { Lab } from '../types';
import { api } from '../services/api';

interface WebServersViewProps {
  currentLab: Lab | null;
}

export const WebServersView: React.FC<WebServersViewProps> = ({ currentLab }) => {
  const [selectedServerType, setSelectedServerType] = useState<'nginx' | 'apache'>('nginx');
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'idle';
    text: string;
  }>({ type: 'idle', text: '' });

  const [configContent, setConfigContent] = useState<string>(
`worker_processes auto;
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type text/html;

    server {
        listen 80;
        server_name shop.test api.shop.test localhost;
        root /var/www/html;
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }

        location /health {
            return 200 "OK\\n";
        }
    }
}`
  );

  const webComponents =
    currentLab?.components.filter((c) => c.component_type === 'web') || [];
  const activeNginx = webComponents.find(
    (c) => c.status === 'running' || c.status === 'stopped'
  );

  const handleApplyAndValidate = async () => {
    if (!activeNginx) {
      setStatusMessage({
        type: 'error',
        text: 'No web server component found in current lab. Please start an Nginx component first.',
      });
      return;
    }

    setIsApplying(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      const output = await api.applyNginxConfig(activeNginx.id, configContent);
      setStatusMessage({
        type: 'success',
        text: output,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-none bg-[#FAF7EE] text-stone-900">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <span>🌐</span> Web Servers & Virtual Hosts
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-medium">
          Manage real Nginx and Apache HTTP server instances, virtual hosts, document roots, and validate syntax with <code>nginx -t</code>.
        </p>
      </div>

      {/* Server selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedServerType('nginx')}
          className={`retro-btn px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer gap-2 ${
            selectedServerType === 'nginx'
              ? 'bg-[#FEF08A] text-stone-900 shadow-[3px_3px_0px_#18181B]'
              : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
          }`}
        >
          <Server className="w-4 h-4 text-stone-900" />
          <span>Nginx Production Engine</span>
        </button>
        <button
          onClick={() => setSelectedServerType('apache')}
          className={`retro-btn px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer gap-2 ${
            selectedServerType === 'apache'
              ? 'bg-[#FEF08A] text-stone-900 shadow-[3px_3px_0px_#18181B]'
              : 'bg-white text-stone-700 hover:bg-[#F4EEDC] shadow-[2px_2px_0px_#18181B]'
          }`}
        >
          <Globe className="w-4 h-4 text-stone-900" />
          <span>Apache HTTP Server</span>
        </button>
      </div>

      {/* Active Web Instances */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B]">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-stone-900 mb-4">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-stone-900 inline-block shadow-[1px_1px_0px_#18181B]" />
          </div>
          <h2 className="text-sm font-black text-stone-900">
            Active Web Server Containers in Current Lab
          </h2>
        </div>

        <div className="space-y-3">
          {webComponents.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between p-3.5 bg-[#FAF7EE] border-2 border-stone-900 rounded-xl shadow-[2px_2px_0px_#18181B]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#BAE6FD] rounded-lg border border-stone-900 text-stone-900 shadow-[1px_1px_0px_#18181B]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stone-900 text-sm">{comp.name}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-stone-900 shadow-[1px_1px_0px_#18181B] ${
                        comp.status === 'running'
                          ? 'bg-[#86EFAC] text-stone-900'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {comp.status}
                    </span>
                    <span className="text-[10px] bg-white text-stone-800 px-2 py-0.5 rounded border border-stone-400 font-mono font-bold">
                      {comp.runtime_mode === 'docker' ? 'Real Container' : 'Simulated'}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 font-mono mt-1 font-medium">
                    Image: {comp.image} • Host Port: {comp.host_port || 18081}
                  </div>
                </div>
              </div>
              {comp.host_port && comp.status === 'running' && (
                <a
                  href={`http://127.0.0.1:${comp.host_port}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="retro-btn px-3 py-1.5 bg-[#FEF08A] hover:bg-[#fde047] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] transition"
                >
                  Open Live VHost
                </a>
              )}
            </div>
          ))}
          {webComponents.length === 0 && (
            <div className="text-xs text-stone-500 p-6 text-center font-medium">
              No web servers deployed yet in this lab. Deploy one from My Labs or Starter Templates.
            </div>
          )}
        </div>
      </div>

      {/* Live VHost Configuration Editor */}
      <div className="retro-window bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-[4px_4px_0px_#18181B] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-stone-900" />
            <h2 className="text-sm font-black text-stone-900">
              Live Configuration Editor (<code>/etc/nginx/nginx.conf</code>)
            </h2>
          </div>
          <button
            onClick={handleApplyAndValidate}
            disabled={isApplying}
            className="retro-btn px-4 py-2 bg-[#86EFAC] hover:bg-[#4ade80] text-stone-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_#18181B] gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isApplying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-900" />
            )}
            <span>Validate & Reload (nginx -t)</span>
          </button>
        </div>

        {/* Status message */}
        {statusMessage.type !== 'idle' && (
          <div
            className={`p-3.5 rounded-xl border-2 border-stone-900 shadow-[2px_2px_0px_#18181B] text-xs font-mono whitespace-pre-wrap font-bold ${
              statusMessage.type === 'success'
                ? 'bg-[#C7F9CC] text-stone-900'
                : 'bg-[#FECDD3] text-stone-900'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Configuration Code Editor with dark interior and retro frame */}
        <div className="retro-window bg-white border-2 border-stone-900 rounded-xl overflow-hidden shadow-[3px_3px_0px_#18181B]">
          <div className="h-8 bg-[#F4EEDC] px-3 flex items-center justify-between border-b-2 border-stone-900 text-xs font-mono text-stone-700 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-stone-900 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-stone-900 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-stone-900 inline-block" />
              <span className="ml-2 font-mono text-stone-800">nginx.conf — Direct Container Injection</span>
            </div>
            <span>Read/Write</span>
          </div>
          <textarea
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            rows={14}
            spellCheck={false}
            className="w-full p-4 bg-[#0c1017] text-emerald-400 font-mono text-xs outline-none resize-none leading-relaxed select-text"
          />
        </div>
      </div>
    </div>
  );
};
