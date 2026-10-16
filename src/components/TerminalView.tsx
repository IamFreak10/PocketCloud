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
  Folder,
  Check,
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

  // Persistent Current Working Directory per component (default: '/root')
  const componentCwdMap = useRef<Record<string, string>>({});
  const [currentCwd, setCurrentCwd] = useState<string>('/root');

  // Command line buffer, cursor position & history state for interactive typing
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentLineBuffer = useRef<string>('');
  const cursorPos = useRef<number>(0);
  const isExecuting = useRef<boolean>(false);

  const activeComp = components.find((c) => c.id === selectedComponentId) || components[0];

  const getDisplayPath = (rawPath: string) => {
    if (rawPath === '/root') return '~';
    if (rawPath.startsWith('/root/')) return '~' + rawPath.slice(5);
    return rawPath;
  };

  const getPrompt = (cwdOverride?: string) => {
    const hostName = activeComp?.name?.toLowerCase().includes('ubuntu')
      ? 'ubuntu-24'
      : activeComp?.id || 'netlab-vps';
    const rawDir = cwdOverride ?? componentCwdMap.current[activeComp?.id || ''] ?? '/root';
    const displayPath = getDisplayPath(rawDir);

    // Authentic Ubuntu 24.04 colored bash prompt: green user@host, white colon, blue path, white hash
    return `\x1b[01;32mroot@${hostName}\x1b[00m:\x1b[01;34m${displayPath}\x1b[00m# `;
  };

  const printUbuntuBanner = (term: Terminal) => {
    term.clear();
    const activeDir = componentCwdMap.current[activeComp?.id || ''] || '/root';
    setCurrentCwd(activeDir);

    // Official Ubuntu 24.04 LTS Noble Numbat Welcome Banner
    term.writeln('\x1b[1;37mWelcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-45-generic x86_64)\x1b[0m\r\n');
    term.writeln(' * Documentation:  \x1b[1;34mhttps://help.ubuntu.com\x1b[0m');
    term.writeln(' * Management:     \x1b[1;34mhttps://landscape.canonical.com\x1b[0m');
    term.writeln(' * Support:        \x1b[1;34mhttps://ubuntu.com/pro\x1b[0m\r\n');
    term.writeln('  System information as of ' + new Date().toUTCString());
    term.writeln('  System load:  \x1b[1;32m0.08\x1b[0m                Processes:             \x1b[1;32m31\x1b[0m');
    term.writeln('  Usage of /:   \x1b[1;32m1.2% of 48.00GB\x1b[0m     Users logged in:       \x1b[1;32m1\x1b[0m');
    term.writeln('  Memory usage: \x1b[1;32m8%\x1b[0m                  IPv4 address for eth0: \x1b[1;36m' + (activeComp?.ip_address || '172.17.0.2') + '\x1b[0m\r\n');
    term.writeln(' * Strictly isolated persistent container environment active. Root shell ready.\r\n');
    term.write(getPrompt(activeDir));
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

    // Built-in 'clear' command (authentic Ubuntu behavior)
    if (trimmed === 'clear') {
      term.clear();
      term.write(getPrompt());
      return;
    }

    // Built-in 'history' command
    if (trimmed === 'history') {
      commandHistory.current.forEach((hCmd, idx) => {
        term.writeln(`  ${idx + 1}  ${hCmd}`);
      });
      term.write(getPrompt());
      return;
    }

    term.writeln('');
    isExecuting.current = true;
    const activeDir = componentCwdMap.current[activeComp.id] || '/root';

    try {
      const res = await api.execCommand(
        activeComp.id,
        trimmed,
        activeComp.runtime_mode,
        activeDir
      );

      let cleanStdout = res.stdout || '';

      // Extract __NETLAB_CWD__ marker if returned from container execution
      const cwdMatch = cleanStdout.match(/__NETLAB_CWD__:(.*)/);
      if (cwdMatch) {
        const detectedCwd = cwdMatch[1].trim();
        if (detectedCwd) {
          componentCwdMap.current[activeComp.id] = detectedCwd;
          setCurrentCwd(detectedCwd);
        }
        cleanStdout = cleanStdout.replace(/\r?\n?__NETLAB_CWD__:.*(\r?\n)?/g, '').trimEnd();
      } else if (res.cwd) {
        componentCwdMap.current[activeComp.id] = res.cwd;
        setCurrentCwd(res.cwd);
      }

      if (cleanStdout) {
        const formatted = cleanStdout.replace(/\r?\n/g, '\r\n');
        term.write(formatted);
        term.writeln('');
      }

      if (res.stderr) {
        const formattedErr = res.stderr.replace(/\r?\n/g, '\r\n');
        term.write(`\x1b[1;31m${formattedErr}\x1b[0m`);
        term.writeln('');
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
      cursorPos.current = 0;
      term.write(getPrompt());
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    if (!xtermInstance.current) {
      // Authentic Ubuntu Terminal GNOME Palette
      const term = new Terminal({
        theme: {
          background: '#300a24', // Official Canonical Aubergine
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

      // Direct Keyboard Input Handling in xterm.js with Full Ubuntu Line Editing
      term.onData((data) => {
        if (isExecuting.current) return;

        // Enter key
        if (data === '\r') {
          const cmd = currentLineBuffer.current;
          executeCommand(cmd);
          return;
        }

        // Ctrl+C (Interrupt)
        if (data === '\x03') {
          currentLineBuffer.current = '';
          cursorPos.current = 0;
          term.writeln('^C');
          term.write(getPrompt());
          return;
        }

        // Ctrl+L (Clear screen)
        if (data === '\x0c') {
          term.clear();
          term.write(getPrompt() + currentLineBuffer.current);
          const backSteps = currentLineBuffer.current.length - cursorPos.current;
          if (backSteps > 0) {
            term.write(`\x1b[${backSteps}D`);
          }
          return;
        }

        // Ctrl+A / Home (Move cursor to start of line)
        if (data === '\x01' || data === '\x1b[H' || data === '\x1b[1~') {
          if (cursorPos.current > 0) {
            term.write(`\x1b[${cursorPos.current}D`);
            cursorPos.current = 0;
          }
          return;
        }

        // Ctrl+E / End (Move cursor to end of line)
        if (data === '\x05' || data === '\x1b[F' || data === '\x1b[4~') {
          const fwd = currentLineBuffer.current.length - cursorPos.current;
          if (fwd > 0) {
            term.write(`\x1b[${fwd}C`);
            cursorPos.current = currentLineBuffer.current.length;
          }
          return;
        }

        // Left Arrow (\x1b[D)
        if (data === '\x1b[D') {
          if (cursorPos.current > 0) {
            cursorPos.current -= 1;
            term.write('\x1b[D');
          }
          return;
        }

        // Right Arrow (\x1b[C)
        if (data === '\x1b[C') {
          if (cursorPos.current < currentLineBuffer.current.length) {
            cursorPos.current += 1;
            term.write('\x1b[C');
          }
          return;
        }

        // Backspace key (\x7f or \b)
        if (data === '\x7f' || data === '\b') {
          if (cursorPos.current > 0) {
            const idx = cursorPos.current - 1;
            const left = currentLineBuffer.current.slice(0, idx);
            const right = currentLineBuffer.current.slice(cursorPos.current);
            currentLineBuffer.current = left + right;
            cursorPos.current -= 1;
            term.write('\b' + right + ' ' + `\x1b[${right.length + 1}D`);
          }
          return;
        }

        // Delete key (\x1b[3~)
        if (data === '\x1b[3~') {
          if (cursorPos.current < currentLineBuffer.current.length) {
            const left = currentLineBuffer.current.slice(0, cursorPos.current);
            const right = currentLineBuffer.current.slice(cursorPos.current + 1);
            currentLineBuffer.current = left + right;
            term.write(right + ' ' + `\x1b[${right.length + 1}D`);
          }
          return;
        }

        // Up Arrow (Previous command history)
        if (data === '\x1b[A') {
          if (commandHistory.current.length > 0 && historyIndex.current > 0) {
            historyIndex.current -= 1;
            const prevCmd = commandHistory.current[historyIndex.current];

            if (cursorPos.current > 0) {
              term.write(`\x1b[${cursorPos.current}D`);
            }
            term.write(' '.repeat(currentLineBuffer.current.length));
            term.write(`\x1b[${currentLineBuffer.current.length}D`);

            currentLineBuffer.current = prevCmd;
            cursorPos.current = prevCmd.length;
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

            if (cursorPos.current > 0) {
              term.write(`\x1b[${cursorPos.current}D`);
            }
            term.write(' '.repeat(currentLineBuffer.current.length));
            term.write(`\x1b[${currentLineBuffer.current.length}D`);

            currentLineBuffer.current = nextCmd;
            cursorPos.current = nextCmd.length;
            term.write(nextCmd);
          } else if (historyIndex.current >= commandHistory.current.length - 1) {
            if (cursorPos.current > 0) {
              term.write(`\x1b[${cursorPos.current}D`);
            }
            term.write(' '.repeat(currentLineBuffer.current.length));
            term.write(`\x1b[${currentLineBuffer.current.length}D`);

            historyIndex.current = commandHistory.current.length;
            currentLineBuffer.current = '';
            cursorPos.current = 0;
          }
          return;
        }

        // Tab Key (Autocompletion)
        if (data === '\t') {
          const buffer = currentLineBuffer.current;
          const tokens = buffer.split(' ');
          const lastToken = tokens[tokens.length - 1];

          const commonDirs = [
            'bin', 'boot', 'dev', 'etc', 'home', 'lib', 'lib64', 'media',
            'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys',
            'tmp', 'usr', 'var', 'ubuntu'
          ];
          const commonCmds = [
            'apt', 'apt-get', 'cat', 'cd', 'clear', 'cp', 'curl', 'df',
            'docker', 'echo', 'exit', 'free', 'grep', 'history', 'hostname',
            'htop', 'kill', 'll', 'ls', 'mkdir', 'mv', 'nano', 'nginx',
            'ps', 'pwd', 'rm', 'systemctl', 'touch', 'uname', 'uptime',
            'vim', 'whoami'
          ];

          if (tokens.length === 1 && lastToken.length > 0) {
            const match = commonCmds.find((c) => c.startsWith(lastToken));
            if (match && match !== lastToken) {
              const added = match.slice(lastToken.length) + ' ';
              currentLineBuffer.current += added;
              cursorPos.current += added.length;
              term.write(added);
            }
          } else if (
            tokens.length > 1 &&
            (tokens[0] === 'cd' || tokens[0] === 'ls' || tokens[0] === 'cat')
          ) {
            const matchDir = commonDirs.find((d) => d.startsWith(lastToken));
            if (matchDir && matchDir !== lastToken) {
              const added = matchDir.slice(lastToken.length) + '/';
              currentLineBuffer.current += added;
              cursorPos.current += added.length;
              term.write(added);
            }
          }
          return;
        }

        // Printable text input
        if (data >= ' ') {
          if (cursorPos.current === currentLineBuffer.current.length) {
            currentLineBuffer.current += data;
            cursorPos.current += data.length;
            term.write(data);
          } else {
            const left = currentLineBuffer.current.slice(0, cursorPos.current);
            const right = currentLineBuffer.current.slice(cursorPos.current);
            currentLineBuffer.current = left + data + right;
            cursorPos.current += data.length;
            term.write(data + right + `\x1b[${right.length}D`);
          }
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

  const isUbuntu =
    activeComp?.name?.toLowerCase().includes('ubuntu') ||
    activeComp?.image?.includes('ubuntu');

  const displayCurrentPath = getDisplayPath(currentCwd);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl select-none font-sans">
      {/* Authentic Ubuntu GNOME Terminal Title Bar */}
      <div className="h-11 bg-[#241f31] border-b border-black/40 flex items-center justify-between px-4 select-none">
        {/* Left: Classic Ubuntu GNOME Window Controls & Active Tab */}
        <div className="flex items-center gap-3">
          {/* Ubuntu Yaru Window Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => xtermInstance.current?.clear()}
              className="w-3.5 h-3.5 rounded-full bg-[#e95420] hover:brightness-125 transition flex items-center justify-center text-[10px] text-white opacity-80 hover:opacity-100"
              title="Close / Reset Buffer"
            >
              ×
            </button>
            <div className="w-3.5 h-3.5 rounded-full bg-[#3e3848] flex items-center justify-center text-[10px] text-gray-400">
              -
            </div>
            <div className="w-3.5 h-3.5 rounded-full bg-[#3e3848] flex items-center justify-center text-[10px] text-gray-400">
              +
            </div>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Active Terminal Tab */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#300a24] border border-[#e95420]/50 text-xs font-mono text-white shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-orange-200">
              {isUbuntu ? 'Ubuntu 24.04 LTS' : activeComp?.name || 'Linux Terminal'}
            </span>
            <span className="text-gray-400">:</span>
            <span className="text-orange-400 font-bold">{displayCurrentPath}</span>
          </div>
        </div>

        {/* Center: Component Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 text-[11px] font-semibold">Container:</span>
          <select
            value={activeComp?.id || ''}
            onChange={(e) => onSelectComponent(e.target.value)}
            className="bg-[#2d2638] text-orange-300 border border-white/10 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-orange-500 font-mono cursor-pointer"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.image}) — {c.status}
              </option>
            ))}
            {components.length === 0 && <option value="">No running container</option>}
          </select>
        </div>

        {/* Right: Authentic Ubuntu Shell Quick Commands */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuickCommand('pwd')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Print Working Directory"
          >
            pwd
          </button>
          <button
            onClick={() => handleQuickCommand('ls')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="List Directory"
          >
            ls
          </button>
          <button
            onClick={() => handleQuickCommand('cd ~')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Change to Root Home"
          >
            cd ~
          </button>
          <button
            onClick={() => handleQuickCommand('cd /home')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Change to /home"
          >
            cd /home
          </button>
          <button
            onClick={() => handleQuickCommand('cd /')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Change to Root /"
          >
            cd /
          </button>
          <button
            onClick={() => handleQuickCommand('cat /etc/os-release')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
            title="Inspect Ubuntu Version"
          >
            os-release
          </button>
          <button
            onClick={() => handleQuickCommand('whoami')}
            className="px-2 py-0.5 rounded bg-[#383144] hover:bg-[#483f56] text-gray-200 text-[11px] font-mono transition cursor-pointer"
          >
            whoami
          </button>
          <button
            onClick={() => {
              if (xtermInstance.current) printUbuntuBanner(xtermInstance.current);
            }}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition cursor-pointer"
            title="Reset to Ubuntu Welcome Banner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Actual Ubuntu Terminal Viewport (#300a24 Aubergine) */}
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
            <span>Interactive Bash PTY</span>
          </span>
          <span className="text-gray-500">|</span>
          <span className="flex items-center gap-1 text-orange-300">
            <Folder className="w-3 h-3 text-orange-400" />
            <span>CWD: {currentCwd}</span>
          </span>
          <span className="text-gray-500">|</span>
          <span>Click anywhere to type directly. Press Tab for autocomplete.</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <span>Bash 5.2.21</span>
          <span>UTF-8</span>
          <span className="text-orange-400 font-bold">Ubuntu 24.04 LTS</span>
        </div>
      </div>
    </div>
  );
};
