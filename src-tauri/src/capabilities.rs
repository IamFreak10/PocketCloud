use crate::models::SystemCapabilities;
use std::fs;
use std::path::Path;

pub async fn detect_capabilities(gateway_port: u16) -> SystemCapabilities {
    // 1. Detect Docker
    let (docker_available, docker_version) = match bollard::Docker::connect_with_local_defaults() {
        Ok(docker) => match docker.version().await {
            Ok(ver) => (true, ver.version.unwrap_or_else(|| "Unknown".to_string())),
            Err(e) => (false, format!("Not responding: {}", e)),
        },
        Err(e) => (false, format!("Daemon not found: {}", e)),
    };

    // 2. Detect KVM
    let kvm_available = Path::new("/dev/kvm").exists() && fs::OpenOptions::new().read(true).write(true).open("/dev/kvm").is_ok();

    // 3. Detect System Memory and CPUs
    let cpu_cores = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4);

    let (total_memory_mb, available_memory_mb) = read_linux_memory().unwrap_or((16384, 8192));

    let os_platform = if cfg!(target_os = "linux") {
        "Linux (Ubuntu/Debian)".to_string()
    } else if cfg!(target_os = "windows") {
        "Windows".to_string()
    } else {
        std::env::consts::OS.to_string()
    };

    SystemCapabilities {
        docker_available,
        docker_version,
        kvm_available,
        total_memory_mb,
        available_memory_mb,
        cpu_cores,
        os_platform,
        gateway_port,
        gateway_url: format!("http://127.0.0.1:{}", gateway_port),
    }
}

fn read_linux_memory() -> Option<(u64, u64)> {
    if let Ok(content) = fs::read_to_string("/proc/meminfo") {
        let mut total_kb = 0u64;
        let mut avail_kb = 0u64;

        for line in content.lines() {
            if line.starts_with("MemTotal:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    total_kb = parts[1].parse().unwrap_or(0);
                }
            } else if line.starts_with("MemAvailable:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    avail_kb = parts[1].parse().unwrap_or(0);
                }
            }
        }

        if total_kb > 0 {
            return Some((total_kb / 1024, avail_kb / 1024));
        }
    }
    None
}
