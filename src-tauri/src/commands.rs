use crate::capabilities::detect_capabilities;
use crate::db::Database;
use crate::dns::DnsEngine;
use crate::docker::DockerManager;
use crate::gateway::HostGateway;
use crate::models::{
    DnsRecord, DockerImageInfo, ExecResult, GatewayRoute, Lab, LabComponent, NetworkProbeResult,
    SqlExecuteResult, SystemCapabilities,
};
use crate::simulator::Simulator;
use crate::qemu::QemuManager;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

pub struct AppState {
    pub db: Arc<Database>,
    pub docker: Arc<DockerManager>,
    pub simulator: Arc<Simulator>,
    pub qemu: Arc<QemuManager>,
    pub gateway: Arc<HostGateway>,
    pub dns: Arc<DnsEngine>,
    pub gateway_port: u16,
}

#[tauri::command]
pub async fn get_capabilities(state: State<'_, AppState>) -> Result<SystemCapabilities, String> {
    Ok(detect_capabilities(state.gateway_port).await)
}

#[tauri::command]
pub async fn list_labs(state: State<'_, AppState>) -> Result<Vec<Lab>, String> {
    let mut labs = state.db.list_labs().map_err(|e| e.to_string())?;
    for lab in &mut labs {
        let mut lab_changed = false;
        for comp in &mut lab.components {
            if comp.runtime_mode == "docker" {
                if let Some(cid) = &comp.container_id {
                    let running = state.docker.is_container_running(cid).await;
                    if running && comp.status != "running" {
                        comp.status = "running".to_string();
                        lab_changed = true;
                    } else if !running && comp.status == "running" {
                        comp.status = "stopped".to_string();
                        lab_changed = true;
                    }
                } else if comp.status == "running" {
                    comp.status = "stopped".to_string();
                    lab_changed = true;
                }
            } else if comp.runtime_mode == "qemu" {
                if !state.qemu.is_running(&comp.id) && comp.status == "running" {
                    comp.status = "stopped".to_string();
                    lab_changed = true;
                }
            }
        }
        if lab_changed {
            let _ = state.db.save_lab(lab);
        }
    }
    Ok(labs)
}

#[tauri::command]
pub async fn create_lab(
    state: State<'_, AppState>,
    name: String,
    description: String,
    template: Option<String>,
) -> Result<Lab, String> {
    let lab_id = format!("lab-{}", Uuid::new_v4().to_string()[..8].to_string());
    let now = chrono::Utc::now().to_rfc3339();

    let mut components = Vec::new();
    let mut routes = Vec::new();

    let is_docker = state.docker.is_available();

    // Starter template logic:
    if let Some(tmpl) = template {
        if tmpl == "vps-web" || tmpl == "starter" || tmpl == "full-stack" {
            let vps_id = format!("vps-{}", Uuid::new_v4().to_string()[..6].to_string());
            let web_id = format!("web-{}", Uuid::new_v4().to_string()[..6].to_string());
            let db_id = format!("db-{}", Uuid::new_v4().to_string()[..6].to_string());

            components.push(LabComponent {
                id: vps_id.clone(),
                lab_id: lab_id.clone(),
                name: "Linux VPS Node (Alpine)".to_string(),
                component_type: "vps".to_string(),
                runtime_mode: if is_docker { "docker".to_string() } else { "simulated".to_string() },
                image: "alpine:latest".to_string(),
                status: "stopped".to_string(),
                container_id: None,
                ip_address: None,
                host_port: None,
                container_port: None,
                created_at: now.clone(),
            });

            components.push(LabComponent {
                id: web_id.clone(),
                lab_id: lab_id.clone(),
                name: "Nginx Production Web Server".to_string(),
                component_type: "web".to_string(),
                runtime_mode: if is_docker { "docker".to_string() } else { "simulated".to_string() },
                image: "nginx:alpine".to_string(),
                status: "stopped".to_string(),
                container_id: None,
                ip_address: None,
                host_port: Some(18081),
                container_port: Some(80),
                created_at: now.clone(),
            });

            components.push(LabComponent {
                id: db_id.clone(),
                lab_id: lab_id.clone(),
                name: "PostgreSQL 16 Database Server".to_string(),
                component_type: "database".to_string(),
                runtime_mode: if is_docker { "docker".to_string() } else { "simulated".to_string() },
                image: "postgres:alpine".to_string(),
                status: "stopped".to_string(),
                container_id: None,
                ip_address: None,
                host_port: Some(15432),
                container_port: Some(5432),
                created_at: now.clone(),
            });

            routes.push(GatewayRoute {
                id: Uuid::new_v4().to_string(),
                lab_id: lab_id.clone(),
                domain: "shop.test".to_string(),
                target_component_id: web_id.clone(),
                target_port: 80,
                host_port: 18081,
            });

            routes.push(GatewayRoute {
                id: Uuid::new_v4().to_string(),
                lab_id: lab_id.clone(),
                domain: "api.shop.test".to_string(),
                target_component_id: web_id.clone(),
                target_port: 80,
                host_port: 18081,
            });

            // Seed in DNS Engine
            state.dns.add_record(DnsRecord {
                id: Uuid::new_v4().to_string(),
                lab_id: lab_id.clone(),
                domain: "shop.test".to_string(),
                record_type: "A".to_string(),
                value: "127.0.0.1:18081".to_string(),
                ttl: 300,
                target_component_id: web_id.clone(),
                target_port: 80,
                host_port: 18081,
            });

            state.dns.add_record(DnsRecord {
                id: Uuid::new_v4().to_string(),
                lab_id: lab_id.clone(),
                domain: "api.shop.test".to_string(),
                record_type: "CNAME".to_string(),
                value: "shop.test".to_string(),
                ttl: 300,
                target_component_id: web_id,
                target_port: 80,
                host_port: 18081,
            });
        } else if tmpl == "ubuntu" || tmpl == "ubuntu-vps" {
            let vps_id = format!("vps-{}", &Uuid::new_v4().to_string()[..6]);
            let host_ssh_port = find_available_port(18022);
            let mut status = "stopped".to_string();
            let mut container_id = None;
            let mut ip_address = None;

            let (runtime_mode, image) = if is_docker {
                ("docker".to_string(), "ubuntu:24.04".to_string())
            } else if state.qemu.is_available() {
                ("qemu".to_string(), "ubuntu:24.04".to_string())
            } else {
                ("docker".to_string(), "ubuntu:24.04".to_string())
            };

            if is_docker {
                let container_name = format!("netlab_{}_{}", lab_id, vps_id);
                if let Ok((cid, ip)) = state
                    .docker
                    .start_container(
                        &container_name,
                        "ubuntu:24.04",
                        Some(host_ssh_port),
                        Some(22),
                        vec!["NETLAB=true".to_string()],
                        Some(vec!["sleep".to_string(), "infinity".to_string()]),
                        Some("bridge".to_string()),
                    )
                    .await
                {
                    container_id = Some(cid);
                    ip_address = ip;
                    status = "running".to_string();
                    state.gateway.register_component(&vps_id, host_ssh_port);
                }
            }

            components.push(LabComponent {
                id: vps_id.clone(),
                lab_id: lab_id.clone(),
                name: "Ubuntu 24.04 LTS VPS Node".to_string(),
                component_type: "vps".to_string(),
                runtime_mode,
                image,
                status,
                container_id,
                ip_address,
                host_port: Some(host_ssh_port),
                container_port: Some(22),
                created_at: now.clone(),
            });
        }
    }

    let lab = Lab {
        id: lab_id,
        name,
        description,
        status: "Draft".to_string(),
        created_at: now,
        components,
        routes,
    };

    state.db.save_lab(&lab).map_err(|e| e.to_string())?;
    Ok(lab)
}

fn find_available_port(preferred: u16) -> u16 {
    let mut port = preferred;
    for _ in 0..100 {
        if let Ok(listener) = std::net::TcpListener::bind(("127.0.0.1", port)) {
            drop(listener);
            return port;
        }
        port += 1;
    }
    preferred
}

#[tauri::command]
pub async fn start_component(
    state: State<'_, AppState>,
    lab_id: String,
    component_id: String,
) -> Result<LabComponent, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    let lab = labs.into_iter().find(|l| l.id == lab_id).ok_or("Lab not found")?;
    let mut comp = lab
        .components
        .iter()
        .find(|c| c.id == component_id)
        .cloned()
        .ok_or("Component not found")?;

    if comp.runtime_mode == "qemu" {
        // Never allocate a second port for an already-running VM.  Doing so
        // makes the database point at a port different from QEMU's SSH
        // forward and leaves the UI permanently unable to connect.
        let port = if state.qemu.is_running(&comp.id) {
            comp.host_port.ok_or("Running VM has no recorded SSH port")?
        } else {
            find_available_port(comp.host_port.unwrap_or(18022))
        };
        let pid = state.qemu.start_vm(&comp.id, port)?;
        comp.container_id = Some(pid);
        comp.ip_address = Some("127.0.0.1 (QEMU VM)".to_string());
        comp.host_port = Some(port);
        comp.container_port = Some(22);
        comp.status = "running".to_string();
    } else if comp.runtime_mode == "docker" && state.docker.is_available() {
        let container_name = format!("netlab_{}_{}", lab_id, comp.id);
        let (host_port_opt, container_port_opt, net_mode) = match comp.component_type.as_str() {
            "database" => (
                Some(find_available_port(comp.host_port.unwrap_or(15432))),
                Some(comp.container_port.unwrap_or(5432)),
                "bridge".to_string(),
            ),
            "web" => (
                Some(find_available_port(comp.host_port.unwrap_or(18081))),
                Some(comp.container_port.unwrap_or(80)),
                "bridge".to_string(),
            ),
            "vps" => {
                let vps_ssh_port = find_available_port(comp.host_port.unwrap_or(18022));
                (
                    Some(vps_ssh_port),
                    Some(comp.container_port.unwrap_or(22)),
                    "bridge".to_string(),
                )
            }
            _ => (comp.host_port.map(find_available_port), comp.container_port, "bridge".to_string()),
        };

        let actual_image = if comp.component_type == "vps" && (comp.image.contains("ubuntu") || comp.image.is_empty()) {
            "ubuntu:24.04".to_string()
        } else {
            comp.image.clone()
        };

        let mut env = vec!["NETLAB=true".to_string()];
        let cmd = if comp.component_type == "database" {
            env.push("POSTGRES_PASSWORD=netlab123".to_string());
            env.push("POSTGRES_USER=netlab".to_string());
            env.push("POSTGRES_DB=netlab".to_string());
            None
        } else if comp.component_type == "web" {
            None // Nginx runs its default CMD
        } else {
            Some(vec!["sleep".to_string(), "infinity".to_string()])
        };

        let (container_id, ip) = state
            .docker
            .start_container(
                &container_name,
                &actual_image,
                host_port_opt,
                container_port_opt,
                env,
                cmd,
                Some(net_mode),
            )
            .await?;

        // If it's a VPS with SSH, copy host SSH public key into container if available
        if comp.component_type == "vps" && comp.image.contains("ubuntu") {
            let docker = state.docker.clone();
            let cid = container_id.clone();
            tokio::spawn(async move {
                let home = std::env::var("HOME").unwrap_or_default();
                let pub_key_path = format!("{}/.ssh/id_ed25519.pub", home);
                if let Ok(key) = tokio::fs::read_to_string(pub_key_path).await {
                    let inject_cmd = format!(
                        "mkdir -p /root/.ssh && echo '{}' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys",
                        key.trim()
                    );
                    let _ = docker.exec_command(&cid, vec!["sh", "-c", &inject_cmd]).await;
                }
            });
        }

        // If it's PostgreSQL, initialize default table after container boots
        if comp.component_type == "database" {
            let docker = state.docker.clone();
            let cid = container_id.clone();
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                let init_sql = "CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT, email TEXT, created_at TIMESTAMPTZ DEFAULT NOW()); INSERT INTO customers (name, email) VALUES ('Acme Corp', 'contact@acme.com'), ('Global Hosting', 'admin@globalhost.net');";
                let _ = docker.exec_sql_query(&cid, "netlab", "netlab", init_sql).await;
            });
        }

        comp.container_id = Some(container_id);
        comp.ip_address = ip;
        comp.status = "running".to_string();
        comp.host_port = host_port_opt;

        if let Some(hp) = host_port_opt {
            state.gateway.register_component(&comp.id, hp);
        }

        // Register any domain routes for this component in Gateway and DNS
        for r in &lab.routes {
            if r.target_component_id == comp.id {
                state.gateway.register_route(&r.domain, r.host_port);
                state.dns.add_record(DnsRecord {
                    id: r.id.clone(),
                    lab_id: lab_id.clone(),
                    domain: r.domain.clone(),
                    record_type: "A".to_string(),
                    value: format!("127.0.0.1:{}", r.host_port),
                    ttl: 300,
                    target_component_id: comp.id.clone(),
                    target_port: r.target_port,
                    host_port: r.host_port,
                });
            }
        }
    } else if comp.runtime_mode == "docker" {
        return Err("Docker daemon is not available. Please ensure Docker is running and /var/run/docker.sock is accessible.".to_string());
    } else if comp.runtime_mode == "qemu" {
        return Err("QEMU VM runtime is not available on this host.".to_string());
    } else {
        // Simulated mode
        state.simulator.init_component(&comp.id, &comp.component_type);
        comp.status = "running".to_string();
        comp.ip_address = Some("10.99.0.2".to_string());
        if comp.host_port.is_none() {
            comp.host_port = Some(18081);
        }
    }

    let mut updated_lab = lab;
    if let Some(pos) = updated_lab.components.iter().position(|c| c.id == comp.id) {
        updated_lab.components[pos] = comp.clone();
    }
    updated_lab.status = "Running".to_string();
    state.db.save_lab(&updated_lab).map_err(|e| e.to_string())?;

    Ok(comp)
}

#[tauri::command]
pub async fn stop_component(
    state: State<'_, AppState>,
    lab_id: String,
    component_id: String,
) -> Result<LabComponent, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    let lab = labs.into_iter().find(|l| l.id == lab_id).ok_or("Lab not found")?;
    let mut comp = lab
        .components
        .iter()
        .find(|c| c.id == component_id)
        .cloned()
        .ok_or("Component not found")?;

    if comp.runtime_mode == "qemu" {
        state.qemu.stop_vm(&comp.id)?;
    } else if let Some(cid) = &comp.container_id {
        let _ = state.docker.stop_container(cid).await;
    }

    comp.status = "stopped".to_string();

    let mut updated_lab = lab;
    if let Some(pos) = updated_lab.components.iter().position(|c| c.id == comp.id) {
        updated_lab.components[pos] = comp.clone();
    }
    state.db.save_lab(&updated_lab).map_err(|e| e.to_string())?;

    Ok(comp)
}

#[tauri::command]
pub async fn add_component(
    state: State<'_, AppState>,
    lab_id: String,
    name: String,
    component_type: String,
    image: String,
    host_port: Option<u16>,
    container_port: Option<u16>,
    runtime_mode: Option<String>,
) -> Result<LabComponent, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    let mut lab = labs.into_iter().find(|l| l.id == lab_id).ok_or("Lab not found")?;

    let is_docker = state.docker.is_available();
    let comp_id = format!("{}-{}", component_type, &Uuid::new_v4().to_string()[..6]);
    let now = chrono::Utc::now().to_rfc3339();

    let allocated_host_port = match host_port {
        Some(p) => Some(find_available_port(p)),
        None => match component_type.as_str() {
            "vps" => Some(find_available_port(18022)),
            "web" => Some(find_available_port(18081)),
            "database" => Some(find_available_port(15432)),
            _ => None,
        },
    };

    let actual_runtime_mode = if let Some(mode) = runtime_mode {
        mode
    } else if is_docker {
        "docker".to_string()
    } else if state.qemu.is_available() && image.contains("ubuntu") {
        "qemu".to_string()
    } else {
        "docker".to_string()
    };

    let mut status = "stopped".to_string();
    let mut container_id = None;
    let mut ip_address = None;

    if actual_runtime_mode == "docker" && is_docker {
        let container_name = format!("netlab_{}_{}", lab_id, comp_id);
        let actual_image = if image.contains("ubuntu") || component_type == "vps" {
            "ubuntu:24.04".to_string()
        } else {
            image.clone()
        };
        if let Ok((cid, ip)) = state
            .docker
            .start_container(
                &container_name,
                &actual_image,
                allocated_host_port,
                container_port.or(Some(22)),
                vec!["NETLAB=true".to_string()],
                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                Some("bridge".to_string()),
            )
            .await
        {
            container_id = Some(cid);
            ip_address = ip;
            status = "running".to_string();
            if let Some(hp) = allocated_host_port {
                state.gateway.register_component(&comp_id, hp);
            }
        }
    }

    let comp = LabComponent {
        id: comp_id,
        lab_id: lab_id.clone(),
        name,
        component_type,
        runtime_mode: actual_runtime_mode,
        image,
        status,
        container_id,
        ip_address,
        host_port: allocated_host_port,
        container_port,
        created_at: now,
    };

    lab.components.push(comp.clone());
    state.db.save_lab(&lab).map_err(|e| e.to_string())?;

    Ok(comp)
}


#[tauri::command]
pub async fn exec_command(
    state: State<'_, AppState>,
    component_id: String,
    command: String,
    runtime_mode: String,
    cwd: Option<String>,
) -> Result<ExecResult, String> {
    let initial_cwd = cwd.unwrap_or_else(|| "/root".to_string());

    // 1. Resolve component from database
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    let mut resolved: Option<(Lab, usize)> = None;

    for lab in labs {
        if let Some(pos) = lab
            .components
            .iter()
            .position(|c| c.id == component_id || c.container_id.as_deref() == Some(&component_id))
        {
            resolved = Some((lab, pos));
            break;
        }
    }

    let (mut lab, pos) = match resolved {
        Some(val) => val,
        None => {
            return Err(format!(
                "VPS record '{}' not found in database. Please select an active VPS.",
                component_id
            ));
        }
    };

    let comp = lab.components[pos].clone();
    let actual_mode = if comp.runtime_mode.is_empty() {
        runtime_mode
    } else {
        comp.runtime_mode.clone()
    };

    // Mode B: QEMU VM
    if actual_mode == "qemu" {
        return state
            .qemu
            .exec_command(
                &comp.id,
                comp.host_port.ok_or("VM SSH port missing")?,
                &command,
                &initial_cwd,
            )
            .await;
    }

    // Mode A: Docker Container
    if actual_mode == "docker" {
        if !state.docker.is_available() {
            return Err("Linux runtime unavailable — configure a supported container engine to create a real Linux environment.".to_string());
        }

        let container_name = format!("netlab_{}_{}", lab.id, comp.id);
        let actual_image = if comp.image.contains("ubuntu") || comp.component_type == "vps" {
            "ubuntu:24.04".to_string()
        } else {
            comp.image.clone()
        };

        // Ensure container is running and resolve actual runtime ID
        let cid = if let Some(ref existing_cid) = comp.container_id {
            match state.docker.ensure_active_container(existing_cid).await {
                Ok(id) => id,
                Err(_) => match state.docker.ensure_active_container(&container_name).await {
                    Ok(id) => id,
                    Err(_) => {
                        let host_port_opt = comp.host_port.map(find_available_port);
                        let (new_cid, new_ip) = state
                            .docker
                            .start_container(
                                &container_name,
                                &actual_image,
                                host_port_opt,
                                comp.container_port,
                                vec!["NETLAB=true".to_string()],
                                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                                Some("bridge".to_string()),
                            )
                            .await?;
                        lab.components[pos].ip_address = new_ip;
                        new_cid
                    }
                },
            }
        } else {
            let host_port_opt = comp.host_port.map(find_available_port);
            let (new_cid, new_ip) = state
                .docker
                .start_container(
                    &container_name,
                    &actual_image,
                    host_port_opt,
                    comp.container_port,
                    vec!["NETLAB=true".to_string()],
                    Some(vec!["sleep".to_string(), "infinity".to_string()]),
                    Some("bridge".to_string()),
                )
                .await?;
            lab.components[pos].ip_address = new_ip;
            new_cid
        };

        if lab.components[pos].container_id.as_deref() != Some(&cid)
            || lab.components[pos].status != "running"
        {
            lab.components[pos].container_id = Some(cid.clone());
            lab.components[pos].status = "running".to_string();
            let _ = state.db.save_lab(&lab);
        }

        let is_ubuntu = actual_image.contains("ubuntu");
        let shell = if is_ubuntu { "bash" } else { "sh" };

        let normalized_command = command.replace("\r\n", "\n").replace('\r', "\n");
        let script = format!(
            r#"cd "{}" 2>/dev/null || cd /root || cd /; export TERM=xterm-256color; export COLUMNS=80; export PS1=1; [ -f /etc/profile ] && . /etc/profile 2>/dev/null; [ -f /root/.bashrc ] && . /root/.bashrc 2>/dev/null; export NVM_DIR="/root/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" 2>/dev/null; alias ls='ls --color=always -C'; alias ll='ls -alF --color=always'; alias la='ls -A --color=always'; alias l='ls -CF --color=always'; shopt -s expand_aliases 2>/dev/null || true;
{}
__NETLAB_EXIT_CODE=$?
echo ""
echo "__NETLAB_CWD__:$(pwd)"
exit $__NETLAB_EXIT_CODE"#,
            initial_cwd, normalized_command
        );

        let mut res = state
            .docker
            .exec_command(&cid, vec![shell, "-c", &script])
            .await?;

        if let Some(pos) = res.stdout.find("__NETLAB_CWD__:") {
            let (out, marker) = res.stdout.split_at(pos);
            let marker_line = marker.lines().next().unwrap_or("");
            let new_cwd = marker_line.trim_start_matches("__NETLAB_CWD__:").trim();
            res.cwd = Some(new_cwd.to_string());
            res.stdout = out.trim_end().to_string();
        } else {
            res.cwd = Some(initial_cwd);
        }

        return Ok(res);
    }

    // Explicitly disallow simulated execution for Ubuntu VPS
    if comp.component_type == "vps" || comp.image.contains("ubuntu") {
        return Err("Linux runtime unavailable — configure a supported container engine to create a real Linux environment.".to_string());
    }

    Ok(state.simulator.exec_command_with_cwd(&comp.id, &command, &initial_cwd))
}

#[tauri::command]
pub async fn get_component_logs(
    state: State<'_, AppState>,
    component_id: String,
) -> Result<String, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    for lab in labs {
        for comp in lab.components {
            if comp.id == component_id {
                if let Some(cid) = comp.container_id {
                    return state.docker.get_logs(&cid).await;
                }
            }
        }
    }
    Ok("Component is not running or has no logs yet.".to_string())
}

#[tauri::command]
pub async fn apply_nginx_config(
    state: State<'_, AppState>,
    component_id: String,
    config: String,
) -> Result<String, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    for lab in labs {
        for comp in lab.components {
            if comp.id == component_id {
                if let Some(cid) = comp.container_id {
                    return state.docker.validate_and_reload_nginx(&cid, &config).await;
                }
            }
        }
    }
    Err("Active web server container not found. Please start the Nginx component first.".to_string())
}

#[tauri::command]
pub async fn execute_database_query(
    state: State<'_, AppState>,
    component_id: String,
    query: String,
) -> Result<SqlExecuteResult, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    for lab in labs {
        for comp in lab.components {
            if comp.id == component_id {
                if let Some(cid) = comp.container_id {
                    return state
                        .docker
                        .exec_sql_query(&cid, "netlab", "netlab", &query)
                        .await;
                }
            }
        }
    }
    Err("Active database container not found. Please start PostgreSQL first.".to_string())
}

#[tauri::command]
pub async fn probe_network_target(
    state: State<'_, AppState>,
    target: String,
) -> Result<NetworkProbeResult, String> {
    Ok(state.dns.probe(&target).await)
}

#[tauri::command]
pub async fn list_dns_records(
    state: State<'_, AppState>,
    lab_id: String,
) -> Result<Vec<DnsRecord>, String> {
    Ok(state.dns.list_records(&lab_id))
}

#[tauri::command]
pub async fn add_dns_record(
    state: State<'_, AppState>,
    lab_id: String,
    domain: String,
    record_type: String,
    value: String,
    ttl: u32,
    target_component_id: String,
    target_port: u16,
    host_port: u16,
) -> Result<DnsRecord, String> {
    let rec = DnsRecord {
        id: Uuid::new_v4().to_string(),
        lab_id,
        domain: domain.clone(),
        record_type,
        value,
        ttl,
        target_component_id,
        target_port,
        host_port,
    };

    state.dns.add_record(rec.clone());
    state.gateway.register_route(&domain, host_port);

    Ok(rec)
}

#[tauri::command]
pub async fn delete_component(
    state: State<'_, AppState>,
    lab_id: String,
    component_id: String,
) -> Result<Lab, String> {
    let labs = state.db.list_labs().map_err(|e| e.to_string())?;
    let mut lab = labs.into_iter().find(|l| l.id == lab_id).ok_or("Lab not found")?;

    if let Some(pos) = lab.components.iter().position(|c| c.id == component_id) {
        let comp = &lab.components[pos];
        let container_name = format!("netlab_{}_{}", lab.id, comp.id);

        if state.docker.is_available() {
            if let Some(cid) = &comp.container_id {
                let _ = state.docker.remove_container(cid).await;
            }
            let _ = state.docker.remove_container(&container_name).await;
        }

        state.dns.remove_record(&format!("dns-{}", comp.id));
        lab.components.remove(pos);
        state.db.save_lab(&lab).map_err(|e| e.to_string())?;
    }

    Ok(lab)
}

#[tauri::command]
pub async fn list_docker_images(
    state: State<'_, AppState>,
) -> Result<Vec<DockerImageInfo>, String> {
    state.docker.list_images().await
}

#[tauri::command]
pub async fn delete_docker_image(
    state: State<'_, AppState>,
    image_tag: String,
) -> Result<String, String> {
    state.docker.remove_image(&image_tag).await?;
    Ok(format!("Successfully deleted image '{}'", image_tag))
}

#[tauri::command]
pub async fn prune_stopped_containers(
    state: State<'_, AppState>,
) -> Result<usize, String> {
    state.docker.prune_stopped_containers().await
}
