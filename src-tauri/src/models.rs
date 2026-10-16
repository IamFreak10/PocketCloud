use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCapabilities {
    pub docker_available: bool,
    pub docker_version: String,
    pub kvm_available: bool,
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub cpu_cores: usize,
    pub os_platform: String,
    pub gateway_port: u16,
    pub gateway_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lab {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub created_at: String,
    pub components: Vec<LabComponent>,
    pub routes: Vec<GatewayRoute>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabComponent {
    pub id: String,
    pub lab_id: String,
    pub name: String,
    pub component_type: String, // "vps", "web", "app", "database", "dns", "router"
    pub runtime_mode: String,   // "docker", "simulated"
    pub image: String,
    pub status: String,         // "stopped", "starting", "running", "error"
    pub container_id: Option<String>,
    pub ip_address: Option<String>,
    pub host_port: Option<u16>,
    pub container_port: Option<u16>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayRoute {
    pub id: String,
    pub lab_id: String,
    pub domain: String,
    pub target_component_id: String,
    pub target_port: u16,
    pub host_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecResult {
    pub exit_code: i64,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceMetrics {
    pub total_cpu_usage: f32,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub running_containers: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsRecord {
    pub id: String,
    pub lab_id: String,
    pub domain: String,
    pub record_type: String, // "A", "CNAME", "TXT", "MX"
    pub value: String,
    pub ttl: u32,
    pub target_component_id: String,
    pub target_port: u16,
    pub host_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkProbeResult {
    pub target: String,
    pub resolved_ip: Option<String>,
    pub port: u16,
    pub is_port_open: bool,
    pub http_status: Option<u16>,
    pub latency_ms: u64,
    pub headers: std::collections::HashMap<String, String>,
    pub diagnostics: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlExecuteResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub execution_time_ms: u64,
    pub row_count: usize,
    pub error: Option<String>,
}

