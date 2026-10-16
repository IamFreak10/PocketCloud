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

  async execCommand(componentId: string, command: string, runtimeMode: string): Promise<ExecResult> {
    if (isTauri) {
      return await invoke<ExecResult>('exec_command', { componentId, command, runtimeMode });
    }
    return {
      exit_code: 0,
      stdout: `[Simulated Exec on ${componentId}]: ${command}\nLinux netlab-vps 6.8.0 #1 SMP\n`,
      stderr: '',
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

