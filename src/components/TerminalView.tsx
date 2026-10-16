import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Play, RotateCcw, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { LabComponent } from '../types';
import { api } from '../services/api';

interface TerminalViewProps {
  components: LabComponent[];
  selectedComponentId?: string;
  onSelectComponent: (id: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  const [inputCommand, setInputCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const activeComp = components.find((c) => c.id === selectedComponentId) || components[0];

  useEffect(() => {
    if (!terminalRef.current) return;

    if (!xtermInstance.current) {
      const term = new Terminal({
        theme: {
          background: '#0a0e17',
          foreground: '#e2e8f0',
          cursor: '#06b6d4',
          black: '#1e293b',
          red: '#f43f5e',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        cursorBlink: true,
        convertEol: true,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(terminalRef.current);
      fit.fit();

      term.writeln('\x1b[1;36m====================================================\x1b[0m');
      term.writeln('\x1b[1;32m       NetLab Interactive Terminal Bridge v0.1      \x1b[0m');
      term.writeln('\x1b[1;36m====================================================\x1b[0m');
      term.writeln('Type commands below or click quick actions to execute.\r\n');

      xtermInstance.current = term;
      fitAddon.current = fit;
    }

    const handleResize = () => {
      fitAddon.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const runCommand = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || !activeComp) return;
    const term = xtermInstance.current;
    if (!term) return;

    setIsRunning(true);
    term.writeln(`\r\n\x1b[1;33m[root@${activeComp.name}]#\x1b[0m ${cmdToRun}`);

    try {
      const res = await api.execCommand(activeComp.id, cmdToRun, activeComp.runtime_mode);
      if (res.stdout) {
        term.writeln(res.stdout);
      }
      if (res.stderr) {
        term.writeln(`\x1b[1;31m${res.stderr}\x1b[0m`);
      }
      if (!res.stdout && !res.stderr) {
        term.writeln('\x1b[90m(Command exited with code 0)\x1b[0m');
      }
    } catch (err: unknown) {
      term.writeln(`\x1b[1;31mExecution Error: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
    } finally {
      setIsRunning(false);
      setInputCommand('');
    }
  };

  const handleQuickCommand = (cmd: string) => {
    runCommand(cmd);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      {/* Terminal Toolbar */}
      <div className="h-12 bg-[#121927] border-b border-gray-800 flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-[1px] bg-gray-700 mx-1" />
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Node:</span>
            <select
              value={activeComp?.id || ''}
              onChange={(e) => onSelectComponent(e.target.value)}
              className="bg-[#1a2336] text-cyan-300 border border-gray-700 rounded px-2 py-0.5 text-xs outline-none focus:border-cyan-500"
            >
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.runtime_mode === 'docker' ? 'Real Docker' : 'Simulated'}) - {c.status}
                </option>
              ))}
              {components.length === 0 && <option value="">No components deployed</option>}
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuickCommand('uname -a')}
            className="px-2 py-1 bg-[#1a2336] hover:bg-[#222f49] text-gray-300 hover:text-white rounded text-xs transition"
          >
            uname -a
          </button>
          <button
            onClick={() => handleQuickCommand('cat /etc/os-release')}
            className="px-2 py-1 bg-[#1a2336] hover:bg-[#222f49] text-gray-300 hover:text-white rounded text-xs transition"
          >
            os-release
          </button>
          <button
            onClick={() => handleQuickCommand('ps aux')}
            className="px-2 py-1 bg-[#1a2336] hover:bg-[#222f49] text-gray-300 hover:text-white rounded text-xs transition"
          >
            ps aux
          </button>
          <button
            onClick={() => handleQuickCommand('free -m')}
            className="px-2 py-1 bg-[#1a2336] hover:bg-[#222f49] text-gray-300 hover:text-white rounded text-xs transition"
          >
            free -m
          </button>
          <button
            onClick={() => xtermInstance.current?.clear()}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition"
            title="Clear Terminal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 p-2 bg-[#0a0e17] overflow-hidden" ref={terminalRef} />

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand(inputCommand);
        }}
        className="h-12 bg-[#121927] border-t border-gray-800 flex items-center px-4 gap-2"
      >
        <span className="text-cyan-400 font-mono text-xs select-none">$</span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder={
            activeComp
              ? `Enter command to execute in ${activeComp.name} (e.g. ls -la, df -h, cat /var/www/index.html)`
              : 'Select or start a component first'
          }
          disabled={!activeComp || isRunning}
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none font-mono placeholder:text-gray-600"
        />
        <button
          type="submit"
          disabled={!inputCommand.trim() || isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
        >
          {isRunning ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Run</span>
        </button>
      </form>
    </div>
  );
};
