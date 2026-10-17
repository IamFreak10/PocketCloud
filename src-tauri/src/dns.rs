use crate::models::{DnsRecord, NetworkProbeResult};
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Instant;
use tokio::net::TcpStream;

pub struct DnsEngine {
    // domain -> DnsRecord
    records: RwLock<HashMap<String, DnsRecord>>,
}

impl DnsEngine {
    pub fn new() -> Self {
        DnsEngine {
            records: RwLock::new(HashMap::new()),
        }
    }

    pub fn add_record(&self, record: DnsRecord) {
        let mut map = self.records.write().unwrap();
        map.insert(record.domain.to_lowercase(), record);
    }

    pub fn remove_record(&self, record_id: &str) {
        let mut map = self.records.write().unwrap();
        map.retain(|_, r| r.id != record_id);
    }

    pub fn list_records(&self, lab_id: &str) -> Vec<DnsRecord> {
        let map = self.records.read().unwrap();
        map.values()
            .filter(|r| r.lab_id == lab_id)
            .cloned()
            .collect()
    }

    pub fn resolve(&self, domain: &str) -> Option<DnsRecord> {
        let map = self.records.read().unwrap();
        let cleaned = domain.to_lowercase();
        // check exact match
        if let Some(r) = map.get(&cleaned) {
            return Some(r.clone());
        }
        // check if it's a subdomain or localhost variant
        None
    }

    pub async fn probe(&self, domain: &str) -> NetworkProbeResult {
        let start = Instant::now();
        let cleaned = domain.trim().to_lowercase();
        let host_part = cleaned
            .trim_start_matches("http://")
            .trim_start_matches("https://")
            .split('/')
            .next()
            .unwrap_or("");

        let (stripped, explicit_port) = if let Some((h, p_str)) = host_part.split_once(':') {
            (h, p_str.parse::<u16>().ok())
        } else {
            (host_part, None)
        };

        let record = self.resolve(stripped);

        let target_port_opt = explicit_port.or_else(|| record.as_ref().map(|r| r.host_port));

        if let Some(host_port) = target_port_opt {
            let target_addr = format!("127.0.0.1:{}", host_port);

            let is_open = match TcpStream::connect(&target_addr).await {
                Ok(_) => true,
                Err(_) => false,
            };

            let latency = start.elapsed().as_millis() as u64;

            let ttl = record.as_ref().map(|r| r.ttl).unwrap_or(60);
            let rec_type = record
                .as_ref()
                .map(|r| r.record_type.clone())
                .unwrap_or_else(|| "DIRECT".to_string());

            let mut headers = HashMap::new();
            headers.insert(
                "X-NetLab-DNS-Status".to_string(),
                "NOERROR (Resolved)".to_string(),
            );
            headers.insert("X-NetLab-TTL".to_string(), format!("{}s", ttl));
            headers.insert("X-NetLab-Target-Port".to_string(), host_port.to_string());

            let (http_status, diagnostics) = if is_open {
                (
                    Some(200),
                    format!(
                        "DNS NOERROR: Domain '{}' successfully resolved to 127.0.0.1:{} (Type: {}). Internal port is active and responding.",
                        stripped, host_port, rec_type
                    ),
                )
            } else {
                (
                    Some(502),
                    format!(
                        "DNS NOERROR, but Connection Refused on 127.0.0.1:{}. The target container or web service is not running or not listening on this port.",
                        host_port
                    ),
                )
            };

            NetworkProbeResult {
                target: stripped.to_string(),
                resolved_ip: Some(format!("127.0.0.1:{}", host_port)),
                port: host_port,
                is_port_open: is_open,
                http_status,
                latency_ms: latency,
                headers,
                diagnostics,
            }
        } else {
            let latency = start.elapsed().as_millis() as u64;
            NetworkProbeResult {
                target: stripped.to_string(),
                resolved_ip: None,
                port: 0,
                is_port_open: false,
                http_status: Some(404),
                latency_ms: latency,
                headers: HashMap::new(),
                diagnostics: format!(
                    "DNS NXDOMAIN: Domain '{}' does not exist in NetLab's authoritative DNS zone. To fix this, open the 'Domains & DNS' tab and create an A or CNAME record mapping this domain to an active lab service.",
                    stripped
                ),
            }
        }
    }
}
