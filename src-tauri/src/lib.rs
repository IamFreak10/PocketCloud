pub mod capabilities;
pub mod commands;
pub mod db;
pub mod dns;
pub mod docker;
pub mod gateway;
pub mod models;
pub mod qemu;
pub mod simulator;

#[cfg(test)]
mod tests;

use commands::AppState;
use db::Database;
use dns::DnsEngine;
use docker::DockerManager;
use gateway::HostGateway;
use simulator::Simulator;
use qemu::QemuManager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(Database::new().expect("Failed to initialize SQLite database"));
    let docker = Arc::new(DockerManager::new());
    let simulator = Arc::new(Simulator::new());
    let qemu = Arc::new(QemuManager::new());
    let dns = Arc::new(DnsEngine::new());
    let gateway_port = 18080;
    let gateway = Arc::new(HostGateway::new(gateway_port, dns.clone()));

    // Start Host-Browser Gateway bridge on local loopback
    let gateway_clone = gateway.clone();
    tauri::async_runtime::spawn(async move {
        let _ = gateway_clone.start().await;
    });

    let app_state = AppState {
        db,
        docker,
        simulator,
        qemu,
        gateway,
        dns,
        gateway_port,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_capabilities,
            commands::list_labs,
            commands::create_lab,
            commands::add_component,
            commands::start_component,
            commands::stop_component,
            commands::exec_command,
            commands::get_component_logs,
            commands::apply_nginx_config,
            commands::execute_database_query,
            commands::probe_network_target,
            commands::list_dns_records,
            commands::add_dns_record,
            commands::delete_component,
            commands::list_docker_images,
            commands::delete_docker_image,
            commands::prune_stopped_containers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NetLab desktop application");
}
