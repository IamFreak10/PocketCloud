import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  RotateCcw,
  Terminal as TerminalIcon,
  Server,
  Zap,
  Play,
  Copy,
  ChevronDown,
} from 'lucide-react';
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

  // Command line buffer & history state for interactive typing
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentLineBuffer = useRef<string>('');
  const isExecuting = useRef<boolean>(false);

  const activeComp = components.find((c) => c.id === selectedComponentId) || components[0];

  const getPrompt = () => {
    const hostName = activeComp?.name?.toLowerCase().includes('ubuntu')
      ? 'ubuntu-24'
      : activeComp?.id || 'netlab-vps';
    // Authentic Ubuntu 24.04 colored bash prompt: green user@host, blue directory, white hash
    return `\x1b[01;32mroot@${hostName}\x1b[00m:\x1b[01;34m~\x1b[00m# `;
  };

  const printUbuntuBanner = (term: Terminal) => {
    term.clear();
    // Official Ubuntu 24.04 LTS Noble Numbat Welcome Banner
    term.writeln('\x1b[1;37mWelcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-45-generic x86_64)\x1b[0m\r\n');
    term.writeln(' * Documentation:  \x1b[1;34mhttps://help.ubuntu.com\x1b[0m');
    term.writeln(' * Management:     \x1b[1;34mhttps://landscape.canonical.com\x1b[0m');
    term.writeln(' * Support:        \x1b[1;34mhttps://ubuntu.com/pro\x1b[0m\r\n');
    term.writeln('  System information as of ' + new Date().toUTCString());
    term.writeln('  System load:  \x1b[1;32m0.08\x1b[0m                Processes:             \x1b[1;32m31\x1b[0m');
    term.writeln('  Usage of /:   \x1b[1;32m1.2% of 48.00GB\x1b[0m     Users logged in:       \x1b[1;32m1\x1b[0m');
    term.writeln('  Memory usage: \x1b[1;32m8%\x1b[0m                  IPv4 address for eth0: \x1b[1;36m' + (activeComp?.ip_address || '172.17.0.2') + '\x1b[0m\r\n');
    term.writeln(' * Strictly confined container environment active. Root shell ready.\r\n');
    term.write(getPrompt());
  };

  const executeCommand = async (cmd: string) => {
    const term = xtermInstance.current;
    if (!term || !activeComp) return;

    const trimmed = cmd.trim();
    if (!trimmed) {
      term.writeln('');
      term.write(getPrompt());
      return;
    }

    // Add to history
    commandHistory.current.push(trimmed);
    historyIndex.current = commandHistory.current.length;

    // Built-in 'clear' command
    if (trimmed === 'clear') {
      printUbuntuBanner(term);
      return;
    }

    term.writeln('');
    isExecuting.current = true;

    try {
      const res = await api.execCommand(
        activeComp.id,
        trimmed,
        activeComp.runtime_mode
      );

      if (res.stdout) {
        // Ensure CRLF formatting so text does not staircase
        const formatted = res.stdout.replace(/\r?\n/g, '\r\n');
        term.write(formatted);
        if (!formatted.endsWith('\r\n')) {
          term.writeln('');
        }
      }

      if (res.stderr) {
        const formattedErr = res.stderr.replace(/\r?\n/g, '\r\n');
        term.write(`\x1b[1;31m${formattedErr}\x1b[0m`);
        if (!formattedErr.endsWith('\r\n')) {
          term.writeln('');
        }
      }

      if (!res.stdout && !res.stderr && res.exit_code === 0) {
        // Silent success commands like touch/mkdir
      }
    } catch (err: unknown) {
      term.writeln(
        `\x1b[1;31mbash: ${trimmed}: execution error: ${
          err instanceof Error ? err.message : String(err)
        }\x1b[0m`
      );
    } finally {
      isExecuting.current = false;
      currentLineBuffer.current = '';
      term.write(getPrompt());
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    if (!xtermInstance.current) {
      // Authentic Ubuntu Terminal Palette
      const term = new Terminal({
        theme: {
          background: '#300a24', // Official Ubuntu Aubergine
          foreground: '#ffffff',
          cursor: '#ffffff',
          cursorAccent: '#300a24',
          selectionBackground: '#77216f',
          black: '#2e3436',
          red: '#cc0000',
          green: '#4e9a06',
          yellow: '#c4a000',
          blue: '#3465a4',
          magenta: '#75507b',
          cyan: '#06989a',
          white: '#d3d7cf',
          brightBlack: '#555753',
          brightRed: '#ef2929',
          brightGreen: '#8ae234',
          brightYellow: '#fce94f',
          brightBlue: '#729fcf',
          brightMagenta: '#ad7fa8',
          brightCyan: '#34e2e2',
          brightWhite: '#eeeeec',
        },
        fontFamily: '"Ubuntu Mono", "Ubuntu Sans Mono", "DejaVu Sans Mono", Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.25,
        cursorBlink: true,
        cursorStyle: 'block',
        convertEol: true,
        allowTransparency: false,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(terminalRef.current);
      fit.fit();

      printUbuntuBanner(term);

      // Direct Keyboard Input Handling in xterm.js
      term.onData((data) => {
        if (isExecuting.current) return;

        // Enter key
        if (data === '\r') {
          const cmd = currentLineBuffer.current;
          executeCommand(cmd);
          return;
        }

        // Backspace key
        if (data === '\x7f' || data === '\b') {
          if (currentLineBuffer.current.length > 0) {
            currentLineBuffer.current = currentLineBuffer.current.slice(0, -1);
            term.write('\b \b');
          }
          return;
        }

        // Ctrl+C (Interrupt)
        if (data === '\x03') {
          currentLineBuffer.current = '';
          term.writeln('^C');
          term.write(getPrompt());
          return;
        }

        // Ctrl+L (Clear screen)
        if (data === '\x0c') {
          printUbuntuBanner(term);
          term.write(currentLineBuffer.current);
          return;
        }

        // Up Arrow (Previous command history)
        if (data === '\x1b[A') {
          if (commandHistory.current.length > 0 && historyIndex.current > 0) {
            historyIndex.current -= 1;
            const prevCmd = commandHistory.current[historyIndex.current];
            // Clear current line on screen
            while (currentLineBuffer.current.length > 0) {
              term.write('\b \b');
              currentLineBuffer.current = currentLineBuffer.current.slice(0, -1);
            }
            currentLineBuffer.current = prevCmd;
            term.write(prevCmd);
          }
          return;
        }

        // Down Arrow (Next command history)
        if (data === '\x1b[B') {
          if (
            commandHistory.current.length > 0 &&
            historyIndex.current < commandHistory.current.length - 1
          ) {
            historyIndex.current += 1;
            const nextCmd = commandHistory.current[historyIndex.current];
            while (currentLineBuffer.current.length > 0) {
              term.write('\b \b');
              currentLineBuffer.current = currentLineBuffer.current.slice(0, -1);
            }
            currentLineBuffer.current = nextCmd;
            term.write(nextCmd);
          } else if (historyIndex.current >= commandHistory.current.length - 1) {
            while (currentLineBuffer.current.length > 0) {
              term.write('\b \b');
              currentLineBuffer.current = currentLineBuffer.current.slice(0, -1);
            }
            historyIndex.current = commandHistory.current.length;
          }
          return;
        }

        // Printable text input
        if (data >= ' ' || data === '\t') {
          currentLineBuffer.current += data;
          term.write(data);
        }
      });

      xtermInstance.current = term;
      fitAddon.current = fit;
    }

    const handleResize = () => {
      fitAddon.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeComp?.id]);

  const handleQuickCommand = (cmd: string) => {
    const term = xtermInstance.current;
    if (!term || isExecuting.current) return;
    term.write(cmd);
    currentLineBuffer.current = cmd;
    executeCommand(cmd);
  };

  const isUbuntu = activeComp?.name?.toLowerCase().includes('ubuntu') || activeComp?.image?.includes('ubuntu');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl select-none font-sans">
      {/* GNOME / Ubuntu Yaru Terminal Header */}
      <div className="h-11 bg-[#241f31] border-b border-black/40 flex items-center justify-between px-4 select-none">
        {/* Left: Window controls and active tab */}
        <div className="flex items-center gap-3">
          {/* Classic Ubuntu Window Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => xtermInstance.current?.clear()}
              className="w-3 h-3 rounded-full bg-[#e95420] hover:brightness-125 transition"
              title="Close / Reset"
            />
            <div className="w-3 h-3 rounded-full bg-[#3e3848]" />
            <div className="w-3 h-3 rounded-full bg-[#3e3848]" />
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Active Terminal Tab */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#300a24] border border-[#e95420]/40 text-xs font-mono text-white shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold">
              {isUbuntu ? 'Ubuntu 24.04 LTS' : activeComp?.name || 'Linux Terminal'}
            </span>
            <span className="text-gray-400">~</span>
          </div>
        </div>

        {/* Center: Component Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 text-[11px] font-semibold">Active Container:</span>
          <select
            value={activeComp?.id || ''}
            onChange={(e) => onSelectComponent(e.target.value)}
            className="bg-[#2d2638] text-orange-300 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-orange-500 font-mono"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.image}) — {c.status}
              </option>
            ))}
            {components.length === 0 && <option value="">No running container</option>}
          </select>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuickCommand('cat /etc/os-release')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Inspect Ubuntu Version"
          >
            os-release
          </button>
          <button
            onClick={() => handleQuickCommand('apt update')}
            className="px-2 py-0.5 rounded bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-700/60 text-[11px] font-mono transition cursor-pointer"
            title="Run apt update"
          >
            apt update
          </button>
          <button
            onClick={() => handleQuickCommand('whoami')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
          >
            whoami
          </button>
          <button
            onClick={() => handleQuickCommand('uname -a')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
          >
            uname -a
          </button>
          <button
            onClick={() => {
              if (xtermInstance.current) printUbuntuBanner(xtermInstance.current);
            }}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition cursor-pointer"
            title="Reset to Ubuntu Banner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Actual Ubuntu Terminal Viewport (#300a24) */}
      <div
        className="flex-1 p-3 bg-[#300a24] overflow-hidden cursor-text"
        ref={terminalRef}
        onClick={() => xtermInstance.current?.focus()}
      />

      {/* Bottom Status & Info Bar */}
      <div className="h-7 bg-[#241f31] border-t border-black/40 flex items-center justify-between px-4 text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive PTY Shell</span>
          </span>
          <span className="text-gray-500">|</span>
          <span>Click anywhere to type directly. Press Enter to run.</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <span>Bash Shell</span>
          <span>UTF-8</span>
          <span className="text-orange-400 font-bold">Ubuntu 24.04</span>
        </div>
      </div>
    </div>
  );
};
