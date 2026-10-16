use crate::capabilities::detect_capabilities;
use crate::db::Database;
use crate::dns::DnsEngine;
use crate::docker::DockerManager;
use crate::gateway::HostGateway;
use crate::models::{
    DnsRecord, ExecResult, GatewayRoute, Lab, LabComponent, NetworkProbeResult, SqlExecuteResult,
    SystemCapabilities,
};
use crate::simulator::Simulator;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

pub struct AppState {
    pub db: Arc<Database>,
    pub docker: Arc<DockerManager>,
    pub simulator: Arc<Simulator>,
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
    state.db.list_labs().map_err(|e| e.to_string())
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

    if comp.runtime_mode == "docker" && state.docker.is_available() {
        let container_name = format!("netlab_{}_{}", lab_id, comp.id);
        let host_port = comp.host_port.unwrap_or(if comp.component_type == "database" { 15432 } else { 18081 });
        let container_port = comp.container_port.or(Some(if comp.component_type == "database" { 5432 } else { 80 }));

        let mut env = vec!["NETLAB=true".to_string()];
        let cmd = if comp.component_type == "database" {
            env.push("POSTGRES_PASSWORD=netlab123".to_string());
            env.push("POSTGRES_USER=netlab".to_string());
            env.push("POSTGRES_DB=netlab".to_string());
            None
        } else if comp.component_type == "web" {
            None // Nginx runs its default CMD
        } else {
            Some(vec!["sh".to_string()])
        };

        let (container_id, ip) = state
            .docker
            .start_container(
                &container_name,
                &comp.image,
                Some(host_port),
                container_port,
                env,
                cmd,
            )
            .await?;

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
        comp.host_port = Some(host_port);

        state.gateway.register_component(&comp.id, host_port);

        // Register any domain routes for this component in Gateway and DNS
        for r in &lab.routes {
            if r.target_component_id == comp.id {
                state.gateway.register_route(&r.domain, host_port);
                state.dns.add_record(DnsRecord {
                    id: r.id.clone(),
                    lab_id: lab_id.clone(),
                    domain: r.domain.clone(),
                    record_type: "A".to_string(),
                    value: format!("127.0.0.1:{}", host_port),
                    ttl: 300,
                    target_component_id: comp.id.clone(),
                    target_port: r.target_port,
                    host_port,
                });
            }
        }
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

    if let Some(cid) = &comp.container_id {
        let _ = state.docker.stop_container(cid).await;
    }

    comp.status = "stopped".to_string();
    comp.container_id = None;

    let mut updated_lab = lab;
    if let Some(pos) = updated_lab.components.iter().position(|c| c.id == comp.id) {
        updated_lab.components[pos] = comp.clone();
    }
    state.db.save_lab(&updated_lab).map_err(|e| e.to_string())?;

    Ok(comp)
}

#[tauri::command]
pub async fn exec_command(
    state: State<'_, AppState>,
    component_id: String,
    command: String,
    runtime_mode: String,
) -> Result<ExecResult, String> {
    if runtime_mode == "docker" {
        let labs = state.db.list_labs().map_err(|e| e.to_string())?;
        for lab in labs {
            for comp in lab.components {
                if comp.id == component_id {
                    if let Some(cid) = comp.container_id {
                        return state
                            .docker
                            .exec_command(&cid, vec!["sh", "-c", &command])
                            .await;
                    }
                }
            }
        }
        Err("Active container not found for component".to_string())
    } else {
        let parts: Vec<&str> = command.split_whitespace().collect();
        Ok(state.simulator.exec_command(&component_id, &parts))
    }
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
