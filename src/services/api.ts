import { invoke } from '@tauri-apps/api/core';
import {
  DnsRecord,
  ExecResult,
  Lab,
  LabComponent,
  NetworkProbeResult,
  SqlExecuteResult,
  SystemCapabilities,
} from '../types';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const api = {
  async getCapabilities(): Promise<SystemCapabilities> {
    if (isTauri) {
      return await invoke<SystemCapabilities>('get_capabilities');
    }
    // Browser Mock for rapid dev and testing
    return {
      docker_available: true,
      docker_version: '29.8.1 (Native)',
      kvm_available: false,
      total_memory_mb: 15347,
      available_memory_mb: 5186,
      cpu_cores: 16,
      os_platform: 'Linux (Ubuntu 24.04)',
      gateway_port: 18080,
      gateway_url: 'http://127.0.0.1:18080',
    };
  },

  async listLabs(): Promise<Lab[]> {
    if (isTauri) {
      return await invoke<Lab[]>('list_labs');
    }
    const stored = localStorage.getItem('netlab_labs');
    if (stored) return JSON.parse(stored);
    return [];
  },

  async createLab(name: string, description: string, template?: string): Promise<Lab> {
    if (isTauri) {
      return await invoke<Lab>('create_lab', { name, description, template });
    }
    const labId = `lab-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const components: LabComponent[] = template === 'vps-web' ? [
      {
        id: `vps-${Math.random().toString(36).substring(2, 8)}`,
        lab_id: labId,
        name: 'Linux VPS Node (Alpine)',
        component_type: 'vps',
        runtime_mode: 'docker',
        image: 'alpine:latest',
        status: 'stopped',
        created_at: now,
      },
      {
        id: `web-${Math.random().toString(36).substring(2, 8)}`,
        lab_id: labId,
        name: 'Web Server (Nginx)',
        component_type: 'web',
        runtime_mode: 'docker',
        image: 'alpine:latest',
        status: 'stopped',
        host_port: 18081,
        container_port: 80,
        created_at: now,
      }
    ] : [];

    const newLab: Lab = {
      id: labId,
      name,
      description,
      status: 'Draft',
      created_at: now,
      components,
      routes: [
        {
          id: `rt-${Math.random().toString(36).substring(2, 8)}`,
          lab_id: labId,
          domain: 'app.localhost',
          target_component_id: components[1]?.id || '',
          target_port: 80,
          host_port: 18081,
        }
      ],
    };

    const current = await this.listLabs();
    localStorage.setItem('netlab_labs', JSON.stringify([newLab, ...current]));
    return newLab;
  },

  async addComponent(
    labId: string,
    name: string,
    componentType: string,
    image: string,
    hostPort?: number,
    containerPort?: number,
    runtimeMode?: string
  ): Promise<LabComponent> {
    if (isTauri) {
      return await invoke<LabComponent>('add_component', {
        labId,
        name,
        componentType,
        image,
        hostPort,
        containerPort,
        runtimeMode,
      });
    }
    const labs = await this.listLabs();
    const lab = labs.find((l) => l.id === labId);
    if (!lab) throw new Error('Lab not found');
    const comp: LabComponent = {
      id: `${componentType}-${Math.random().toString(36).substring(2, 8)}`,
      lab_id: labId,
      name,
      component_type: componentType as any,
      runtime_mode: (runtimeMode || 'docker') as any,
      image,
      status: 'stopped',
      host_port: hostPort,
      container_port: containerPort,
      created_at: new Date().toISOString(),
    };
    lab.components.push(comp);
    localStorage.setItem('netlab_labs', JSON.stringify(labs));
    return comp;
  },

  async startComponent(labId: string, componentId: string): Promise<LabComponent> {
    if (isTauri) {
      return await invoke<LabComponent>('start_component', { labId, componentId });
    }
    const labs = await this.listLabs();
    const lab = labs.find((l) => l.id === labId);
    if (!lab) throw new Error('Lab not found');
    const comp = lab.components.find((c) => c.id === componentId);
    if (!comp) throw new Error('Component not found');
    comp.status = 'running';
    comp.ip_address = '172.17.0.2';
    comp.container_id = `cnt-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('netlab_labs', JSON.stringify(labs));
    return comp;
  },

  async stopComponent(labId: string, componentId: string): Promise<LabComponent> {
    if (isTauri) {
      return await invoke<LabComponent>('stop_component', { labId, componentId });
    }
    const labs = await this.listLabs();
    const lab = labs.find((l) => l.id === labId);
    if (!lab) throw new Error('Lab not found');
    const comp = lab.components.find((c) => c.id === componentId);
    if (!comp) throw new Error('Component not found');
    comp.status = 'stopped';
    comp.container_id = undefined;
    localStorage.setItem('netlab_labs', JSON.stringify(labs));
    return comp;
  },

  async execCommand(
    componentId: string,
    command: string,
    runtimeMode: string,
    cwd?: string
  ): Promise<ExecResult> {
    if (isTauri) {
      return await invoke<ExecResult>('exec_command', {
        componentId,
        command,
        runtimeMode,
        cwd: cwd || '/root',
      });
    }

    const currentCwd = cwd || '/root';
    const trimmed = command.trim();
    const parts = trimmed.split(/\s+/);
    const mainCmd = parts[0];

    if (mainCmd === 'cd') {
      const target = parts[1] || '/root';
      let newDir = currentCwd;
      if (target === '~' || !target) {
        newDir = '/root';
      } else if (target === '/') {
        newDir = '/';
      } else if (target === '..') {
        if (currentCwd === '/') {
          newDir = '/';
        } else {
          const segs = currentCwd.split('/').filter(Boolean);
          segs.pop();
          newDir = segs.length ? '/' + segs.join('/') : '/';
        }
      } else if (target.startsWith('/')) {
        newDir = target;
      } else {
        newDir = currentCwd === '/' ? '/' + target : currentCwd + '/' + target;
      }
      return { exit_code: 0, stdout: '', stderr: '', cwd: newDir };
    }

    if (mainCmd === 'pwd') {
      return { exit_code: 0, stdout: `${currentCwd}\n`, stderr: '', cwd: currentCwd };
    }

    if (mainCmd === 'whoami') {
      return { exit_code: 0, stdout: 'root\n', stderr: '', cwd: currentCwd };
    }

    if (mainCmd === 'uname' || trimmed === 'uname -a') {
      return {
        exit_code: 0,
        stdout: 'Linux ubuntu-24 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 Linux\n',
        stderr: '',
        cwd: currentCwd,
      };
    }

    if (mainCmd === 'ls' || mainCmd === 'll' || mainCmd === 'la') {
      let stdout = '';
      if (currentCwd === '/') {
        stdout = '\x1b[01;34mbin\x1b[0m   \x1b[01;34mdev\x1b[0m  \x1b[01;34mhome\x1b[0m  \x1b[01;34mlib64\x1b[0m  \x1b[01;34mmnt\x1b[0m  \x1b[01;34mproc\x1b[0m  \x1b[01;34mrun\x1b[0m   \x1b[01;34msrv\x1b[0m  \x1b[01;34mtmp\x1b[0m  \x1b[01;34mvar\x1b[0m\n\x1b[01;34mboot\x1b[0m  \x1b[01;34metc\x1b[0m  \x1b[01;34mlib\x1b[0m   \x1b[01;34mmedia\x1b[0m  \x1b[01;34mopt\x1b[0m  \x1b[01;34mroot\x1b[0m  \x1b[01;34msbin\x1b[0m  \x1b[01;34msys\x1b[0m  \x1b[01;34musr\x1b[0m\n';
      } else if (currentCwd === '/home') {
        stdout = '\x1b[01;34mubuntu\x1b[0m\n';
      } else if (currentCwd === '/etc') {
        stdout = 'hostname  \x1b[01;34mnginx\x1b[0m  os-release  resolv.conf\n';
      } else {
        stdout = 'test.txt  config.json\n';
      }
      return { exit_code: 0, stdout, stderr: '', cwd: currentCwd };
    }

    if (trimmed === 'cat /etc/os-release') {
      return {
        exit_code: 0,
        stdout: 'NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\nVERSION_ID="24.04"\nPRETTY_NAME="Ubuntu 24.04 LTS"\nVERSION_CODENAME=noble\n',
        stderr: '',
        cwd: currentCwd,
      };
    }

    // git commands
    if (mainCmd === 'git') {
      if (parts[1] === '--version') {
        return { exit_code: 0, stdout: 'git version 2.43.0\n', stderr: '', cwd: currentCwd };
      }
      if (parts[1] === 'clone') {
        const repo = parts[2] || 'repo';
        const repoName = repo.split('/').pop()?.replace('.git', '') || 'repo';
        return {
          exit_code: 0,
          stdout: `Cloning into '${repoName}'...\nremote: Enumerating objects: 100, done.\nremote: Counting objects: 100% (100/100), done.\nremote: Compressing objects: 100% (80/80), done.\nReceiving objects: 100% (100/100), 42.00 KiB | 2.00 MiB/s, done.\n`,
          stderr: '',
          cwd: currentCwd,
        };
      }
      if (parts[1] === 'init') {
        return { exit_code: 0, stdout: `Initialized empty Git repository in ${currentCwd}/.git/\n`, stderr: '', cwd: currentCwd };
      }
      if (parts[1] === 'status') {
        return { exit_code: 0, stdout: 'On branch main\nnothing to commit, working tree clean\n', stderr: '', cwd: currentCwd };
      }
      return { exit_code: 0, stdout: `git: '${parts.slice(1).join(' ')}' executed\n`, stderr: '', cwd: currentCwd };
    }

    // apt / apt-get package manager
    if (mainCmd === 'apt' || mainCmd === 'apt-get') {
      const subCmd = parts[1];
      const pkgName = parts.slice(2).filter(p => !p.startsWith('-')).join(' ') || 'package';
      if (subCmd === 'update') {
        return {
          exit_code: 0,
          stdout: 'Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nHit:2 http://security.ubuntu.com/ubuntu noble-security InRelease\nReading package lists... Done\nBuilding dependency tree... Done\n',
          stderr: '', cwd: currentCwd,
        };
      }
      if (subCmd === 'install') {
        return {
          exit_code: 0,
          stdout: `Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  ${pkgName}\n0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.\nNeed to get 3,456 kB of archives.\nAfter this operation, 12.3 MB of additional disk space will be used.\nSelecting previously unselected package ${pkgName}.\nPreparing to unpack .../archives/${pkgName}_*.deb ...\nUnpacking ${pkgName} ...\nSetting up ${pkgName} ...\nProcessing triggers for man-db ...\n\n✅ ${pkgName} installed successfully!\n`,
          stderr: '', cwd: currentCwd,
        };
      }
      return { exit_code: 0, stdout: `apt: executed ${trimmed}\n`, stderr: '', cwd: currentCwd };
    }

    // echo command
    if (mainCmd === 'echo') {
      return { exit_code: 0, stdout: parts.slice(1).join(' ').replace(/^["']|["']$/g, '') + '\n', stderr: '', cwd: currentCwd };
    }

    // hostname
    if (mainCmd === 'hostname') {
      return { exit_code: 0, stdout: 'ubuntu-24\n', stderr: '', cwd: currentCwd };
    }

    // uptime
    if (mainCmd === 'uptime') {
      return { exit_code: 0, stdout: ' 22:08:00 up 3 days, 4:20, 1 user, load average: 0.08, 0.03, 0.01\n', stderr: '', cwd: currentCwd };
    }

    // free
    if (mainCmd === 'free') {
      return { exit_code: 0, stdout: '               total        used        free      shared  buff/cache   available\nMem:        15728640     2834432     9437184      131072     3457024    12582912\nSwap:        2097152           0     2097152\n', stderr: '', cwd: currentCwd };
    }

    // df
    if (mainCmd === 'df') {
      return { exit_code: 0, stdout: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        48G  1.5G   44G   4% /\ntmpfs           7.5G     0  7.5G   0% /dev/shm\n', stderr: '', cwd: currentCwd };
    }

    // ps
    if (mainCmd === 'ps') {
      return { exit_code: 0, stdout: 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.1  0.2  12345  4096 ?        Ss   00:00   0:00 /usr/sbin/sshd -D\nroot        24  0.0  0.1   8192  2048 pts/0    S    00:01   0:00 bash\nroot        42  0.0  0.0   7168  1024 pts/0    R+   00:01   0:00 ps aux\n', stderr: '', cwd: currentCwd };
    }

    // curl
    if (mainCmd === 'curl') {
      return { exit_code: 0, stdout: '< HTTP/1.1 200 OK\n< Content-Type: text/html\n<!DOCTYPE html><html><body><h1>NetLab VPS</h1></body></html>\n', stderr: '', cwd: currentCwd };
    }

    // mkdir
    if (mainCmd === 'mkdir') {
      return { exit_code: 0, stdout: '', stderr: '', cwd: currentCwd };
    }

    // touch
    if (mainCmd === 'touch') {
      return { exit_code: 0, stdout: '', stderr: '', cwd: currentCwd };
    }

    // cat (generic)
    if (mainCmd === 'cat') {
      const filePath = parts[1] || '';
      return { exit_code: 0, stdout: `# Content of ${filePath}\n(File content would appear here in a real VPS)\n`, stderr: '', cwd: currentCwd };
    }

    // systemctl
    if (mainCmd === 'systemctl') {
      const svcAction = parts[1];
      const svc = parts[2] || 'service';
      return { exit_code: 0, stdout: `${svc}: ${svcAction === 'status' ? 'active (running)' : svcAction + ' done'}\n`, stderr: '', cwd: currentCwd };
    }

    // nginx
    if (mainCmd === 'nginx' || mainCmd === 'service') {
      return { exit_code: 0, stdout: `${mainCmd} ${parts.slice(1).join(' ')}: OK\n`, stderr: '', cwd: currentCwd };
    }

    // python3
    if (mainCmd === 'python3') {
      if (parts[1] === '--version') return { exit_code: 0, stdout: 'Python 3.12.3\n', stderr: '', cwd: currentCwd };
      return { exit_code: 0, stdout: `python3: executed\n`, stderr: '', cwd: currentCwd };
    }

    // node
    if (mainCmd === 'node') {
      if (parts[1] === '--version') return { exit_code: 0, stdout: 'v20.18.0\n', stderr: '', cwd: currentCwd };
      return { exit_code: 0, stdout: `node: executed\n`, stderr: '', cwd: currentCwd };
    }

    // npm
    if (mainCmd === 'npm') {
      if (parts[1] === '--version') return { exit_code: 0, stdout: '10.8.2\n', stderr: '', cwd: currentCwd };
      return { exit_code: 0, stdout: `npm ${parts.slice(1).join(' ')}: done\n`, stderr: '', cwd: currentCwd };
    }

    // Generic fallback
    return {
      exit_code: 0,
      stdout: `[NetLab VPS] $ ${command}\n`,
      stderr: '',
      cwd: currentCwd,
    };
  },

  async getComponentLogs(componentId: string): Promise<string> {
    if (isTauri) {
      return await invoke<string>('get_component_logs', { componentId });
    }
    return `[System] Starting container ${componentId}...\n[System] Ready for connections on 127.0.0.1:18081`;
  },

  async applyNginxConfig(componentId: string, config: string): Promise<string> {
    if (isTauri) {
      return await invoke<string>('apply_nginx_config', { componentId, config });
    }
    return 'nginx: configuration file /etc/nginx/nginx.conf test is successful\n[Simulated] Configuration reloaded.';
  },

  async executeDatabaseQuery(componentId: string, query: string): Promise<SqlExecuteResult> {
    if (isTauri) {
      return await invoke<SqlExecuteResult>('execute_database_query', { componentId, query });
    }
    return {
      columns: ['id', 'name', 'email', 'created_at'],
      rows: [
        ['1', 'Acme Corp', 'contact@acme.com', '2026-10-16 10:00:00+00'],
        ['2', 'Global Hosting', 'admin@globalhost.net', '2026-10-16 10:05:00+00'],
      ],
      execution_time_ms: 12,
      row_count: 2,
    };
  },

  async probeNetworkTarget(target: string): Promise<NetworkProbeResult> {
    if (isTauri) {
      return await invoke<NetworkProbeResult>('probe_network_target', { target });
    }
    return {
      target,
      resolved_ip: '127.0.0.1',
      port: 80,
      is_port_open: true,
      http_status: 200,
      latency_ms: 4,
      headers: { server: 'nginx/1.27.4', 'content-type': 'text/html' },
      diagnostics: 'Connection succeeded. DNS resolved to 127.0.0.1:18081 with HTTP 200 OK.',
    };
  },

  async listDnsRecords(labId: string): Promise<DnsRecord[]> {
    if (isTauri) {
      return await invoke<DnsRecord[]>('list_dns_records', { labId });
    }
    return [
      {
        id: 'rec-1',
        lab_id: labId,
        domain: 'shop.test',
        record_type: 'A',
        value: '127.0.0.1:18081',
        ttl: 300,
        target_component_id: 'web-1',
        target_port: 80,
        host_port: 18081,
      },
      {
        id: 'rec-2',
        lab_id: labId,
        domain: 'api.shop.test',
        record_type: 'CNAME',
        value: 'shop.test',
        ttl: 300,
        target_component_id: 'web-1',
        target_port: 80,
        host_port: 18081,
      },
    ];
  },

  async addDnsRecord(record: {
    labId: string;
    domain: string;
    recordType: 'A' | 'CNAME' | 'TXT' | 'MX';
    value: string;
    ttl: number;
    targetComponentId: string;
    targetPort: number;
    hostPort: number;
  }): Promise<DnsRecord> {
    if (isTauri) {
      return await invoke<DnsRecord>('add_dns_record', {
        labId: record.labId,
        domain: record.domain,
        recordType: record.recordType,
        value: record.value,
        ttl: record.ttl,
        targetComponentId: record.targetComponentId,
        targetPort: record.targetPort,
        hostPort: record.hostPort,
      });
    }
    return {
      id: `rec-${Math.random().toString(36).substring(2, 8)}`,
      lab_id: record.labId,
      domain: record.domain,
      record_type: record.recordType,
      value: record.value,
      ttl: record.ttl,
      target_component_id: record.targetComponentId,
      target_port: record.targetPort,
      host_port: record.hostPort,
    };
  },
};

