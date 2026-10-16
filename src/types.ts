export interface SystemCapabilities {
  docker_available: boolean;
  docker_version: string;
  kvm_available: boolean;
  total_memory_mb: number;
  available_memory_mb: number;
  cpu_cores: number;
  os_platform: string;
  gateway_port: number;
  gateway_url: string;
}

export interface Lab {
  id: string;
  name: string;
  description: string;
  status: 'Draft' | 'Running' | 'Stopped' | 'Error';
  created_at: string;
  components: LabComponent[];
  routes: GatewayRoute[];
}

export interface LabComponent {
  id: string;
  lab_id: string;
  name: string;
  component_type: 'vps' | 'web' | 'app' | 'database' | 'dns' | 'router';
  runtime_mode: 'docker' | 'qemu' | 'simulated';
  image: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  container_id?: string;
  ip_address?: string;
  host_port?: number;
  container_port?: number;
  created_at: string;
}

export interface GatewayRoute {
  id: string;
  lab_id: string;
  domain: string;
  target_component_id: string;
  target_port: number;
  host_port: number;
}

export interface ExecResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  cwd?: string;
}

export interface DnsRecord {
  id: string;
  lab_id: string;
  domain: string;
  record_type: 'A' | 'CNAME' | 'TXT' | 'MX';
  value: string;
  ttl: number;
  target_component_id: string;
  target_port: number;
  host_port: number;
}

export interface NetworkProbeResult {
  target: string;
  resolved_ip?: string;
  port: number;
  is_port_open: boolean;
  http_status?: number;
  latency_ms: number;
  headers: Record<string, string>;
  diagnostics: string;
}

export interface SqlExecuteResult {
  columns: string[];
  rows: string[][];
  execution_time_ms: number;
  row_count: number;
  error?: string;
}

