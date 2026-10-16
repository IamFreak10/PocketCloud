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
    <div className="h-full overflow-y-auto p-8 space-y-8 select-none bg-[#090d16] text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Web Servers & Virtual Hosts
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage real Nginx and Apache HTTP server instances, virtual hosts, document roots, and validate syntax with <code>nginx -t</code>.
        </p>
      </div>

      {/* Server selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedServerType('nginx')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            selectedServerType === 'nginx'
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700 shadow-md'
              : 'bg-[#111928] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4 text-cyan-400" />
          <span>Nginx Production Engine</span>
        </button>
        <button
          onClick={() => setSelectedServerType('apache')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
            selectedServerType === 'apache'
              ? 'bg-amber-950/80 text-amber-300 border-amber-700 shadow-md'
              : 'bg-[#111928] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-amber-400" />
          <span>Apache HTTP Server</span>
        </button>
      </div>

      {/* Active Web Instances */}
      <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4">
          Active Web Server Containers in Current Lab
        </h2>
        <div className="space-y-3">
          {webComponents.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between p-4 bg-[#11192b] border border-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950 rounded-lg border border-cyan-800 text-cyan-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{comp.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        comp.status === 'running'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {comp.status}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {comp.runtime_mode === 'docker' ? 'Real Container' : 'Simulated'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    Image: {comp.image} • Host Port: {comp.host_port || 18081}
                  </div>
                </div>
              </div>
              {comp.host_port && comp.status === 'running' && (
                <a
                  href={`http://127.0.0.1:${comp.host_port}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition"
                >
                  Open Live VHost
                </a>
              )}
            </div>
          ))}
          {webComponents.length === 0 && (
            <div className="text-xs text-gray-500 p-4 text-center">
              No web servers deployed yet in this lab. Deploy one from My Labs or Starter Templates.
            </div>
          )}
        </div>
      </div>

      {/* Live VHost Configuration Editor */}
      <div className="bg-[#0d1424] border border-gray-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Live Configuration Editor (<code>/etc/nginx/nginx.conf</code>)
            </h2>
          </div>
          <button
            onClick={handleApplyAndValidate}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {isApplying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Validate & Reload (nginx -t)</span>
          </button>
        </div>

        <textarea
          value={configContent}
          onChange={(e) => setConfigContent(e.target.value)}
          className="w-full bg-[#0a0e17] border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-200 outline-none focus:border-cyan-500 h-64 resize-none leading-relaxed"
        />

        {statusMessage.type !== 'idle' && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono whitespace-pre-line leading-relaxed ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <div className="font-bold mb-1 flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Validation & Reload Succeeded:</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Nginx Syntax Error:</span>
                </>
              )}
            </div>
            {statusMessage.text}
          </div>
        )}
      </div>
    </div>
  );
};
