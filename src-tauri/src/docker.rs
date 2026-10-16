use crate::models::ExecResult;
use bollard::container::{
    Config, CreateContainerOptions, InspectContainerOptions, LogsOptions, RemoveContainerOptions,
    StartContainerOptions,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::models::{HostConfig, PortBinding, PortMap};
use bollard::Docker;
use futures_util::stream::StreamExt;
use std::collections::HashMap;

pub struct DockerManager {
    client: Option<Docker>,
}

impl DockerManager {
    pub fn new() -> Self {
        let client = Docker::connect_with_local_defaults().ok();
        DockerManager { client }
    }

    pub fn is_available(&self) -> bool {
        self.client.is_some()
    }

    pub async fn ensure_image(&self, image: &str) -> Result<(), String> {
        let docker = self.client.as_ref().ok_or("Docker not available")?;

        // Try inspecting image first
        if docker.inspect_image(image).await.is_ok() {
            return Ok(());
        }

        // Pull image
        let mut pull_stream = docker.create_image(
            Some(CreateImageOptions {
                from_image: image,
                ..Default::default()
            }),
            None,
            None,
        );

        while let Some(pull_result) = pull_stream.next().await {
            if let Err(e) = pull_result {
                return Err(format!("Failed to pull {}: {}", image, e));
            }
        }

        Ok(())
    }

    pub async fn start_container(
        &self,
        name: &str,
        image: &str,
        host_port: Option<u16>,
        container_port: Option<u16>,
        env: Vec<String>,
        cmd: Option<Vec<String>>,
    ) -> Result<(String, Option<String>), String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;

        // 1. Ensure image exists
        self.ensure_image(image).await?;

        // 2. Prepare port bindings on loopback only (127.0.0.1) for safety
        let mut port_bindings: PortMap = HashMap::new();
        let mut exposed_ports = HashMap::new();

        if let (Some(h_port), Some(c_port)) = (host_port, container_port) {
            let port_key = format!("{}/tcp", c_port);
            exposed_ports.insert(port_key.clone(), HashMap::new());
            port_bindings.insert(
                port_key,
                Some(vec![PortBinding {
                    host_ip: Some("127.0.0.1".to_string()),
                    host_port: Some(h_port.to_string()),
                }]),
            );
        }

        // 3. Configure Resource Limits (Default: 512MB RAM, 1 CPU quota)
        let host_config = HostConfig {
            port_bindings: Some(port_bindings),
            memory: Some(512 * 1024 * 1024), // 512 MB
            nano_cpus: Some(1_000_000_000),   // 1 CPU
            network_mode: Some("bridge".to_string()),
            ..Default::default()
        };

        let container_config = Config {
            image: Some(image.to_string()),
            cmd: cmd.clone(),
            env: Some(env),
            exposed_ports: Some(exposed_ports),
            host_config: Some(host_config),
            tty: Some(true),
            open_stdin: Some(true),
            ..Default::default()
        };

        // Remove old container if exists with same name
        let _ = docker
            .remove_container(
                name,
                Some(RemoveContainerOptions {
                    force: true,
                    ..Default::default()
                }),
            )
            .await;

        // Create container
        let create_opts = CreateContainerOptions {
            name: name.to_string(),
            platform: None,
        };

        let container_res = docker
            .create_container(Some(create_opts), container_config)
            .await
            .map_err(|e| format!("Failed to create container: {}", e))?;

        let container_id = container_res.id;

        // Start container
        docker
            .start_container(&container_id, None::<StartContainerOptions<String>>)
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        // Inspect to get IP
        let inspect = docker
            .inspect_container(&container_id, None::<InspectContainerOptions>)
            .await
            .map_err(|e| format!("Failed to inspect container: {}", e))?;

        let ip_address = inspect
            .network_settings
            .and_then(|ns| ns.networks)
            .and_then(|nets| nets.values().next().cloned())
            .and_then(|net| net.ip_address)
            .filter(|ip| !ip.is_empty());

        Ok((container_id, ip_address))
    }

    pub async fn stop_container(&self, container_id: &str) -> Result<(), String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        docker
            .stop_container(container_id, None)
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))
    }

    pub async fn remove_container(&self, container_id: &str) -> Result<(), String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        docker
            .remove_container(
                container_id,
                Some(RemoveContainerOptions {
                    force: true,
                    ..Default::default()
                }),
            )
            .await
            .map_err(|e| format!("Failed to remove container: {}", e))
    }

    pub async fn exec_command(&self, container_id: &str, cmd: Vec<&str>) -> Result<ExecResult, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;

        let exec_create_opts = CreateExecOptions {
            cmd: Some(cmd.iter().map(|s| s.to_string()).collect()),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        };

        let exec_res = docker
            .create_exec(container_id, exec_create_opts)
            .await
            .map_err(|e| format!("Failed to create exec: {}", e))?;

        let exec_id = exec_res.id;

        let start_res = docker
            .start_exec(&exec_id, None)
            .await
            .map_err(|e| format!("Failed to start exec: {}", e))?;

        let mut stdout = String::new();
        let mut stderr = String::new();

        if let StartExecResults::Attached { mut output, .. } = start_res {
            while let Some(msg) = output.next().await {
                if let Ok(log_output) = msg {
                    match log_output {
                        bollard::container::LogOutput::StdOut { message } => {
                            stdout.push_str(&String::from_utf8_lossy(&message));
                        }
                        bollard::container::LogOutput::StdErr { message } => {
                            stderr.push_str(&String::from_utf8_lossy(&message));
                        }
                        _ => {}
                    }
                }
            }
        }

        let inspect_res = docker
            .inspect_exec(&exec_id)
            .await
            .map_err(|e| format!("Failed to inspect exec: {}", e))?;

        let exit_code = inspect_res.exit_code.unwrap_or(0);

        Ok(ExecResult {
            exit_code,
            stdout,
            stderr,
            cwd: None,
        })
    }

    pub async fn get_logs(&self, container_id: &str) -> Result<String, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        let mut log_stream = docker.logs(
            container_id,
            Some(LogsOptions {
                stdout: true,
                stderr: true,
                tail: "100",
                ..Default::default()
            }),
        );

        let mut logs = String::new();
        while let Some(msg) = log_stream.next().await {
            if let Ok(log_output) = msg {
                logs.push_str(&log_output.to_string());
            }
        }

        Ok(logs)
    }

    pub async fn exec_sql_query(
        &self,
        container_id: &str,
        user: &str,
        db: &str,
        query: &str,
    ) -> Result<crate::models::SqlExecuteResult, String> {
        let start = std::time::Instant::now();
        // Use psql with tab-separated output for deterministic parsing
        let cmd = vec![
            "psql",
            "-U",
            user,
            "-d",
            db,
            "-A",
            "-F",
            "\t",
            "-c",
            query,
        ];

        let res = self.exec_command(container_id, cmd).await?;
        let execution_time_ms = start.elapsed().as_millis() as u64;

        if res.exit_code != 0 {
            return Ok(crate::models::SqlExecuteResult {
                columns: Vec::new(),
                rows: Vec::new(),
                execution_time_ms,
                row_count: 0,
                error: Some(if !res.stderr.is_empty() {
                    res.stderr
                } else {
                    res.stdout
                }),
            });
        }

        let lines: Vec<&str> = res.stdout.lines().collect();
        if lines.is_empty() {
            return Ok(crate::models::SqlExecuteResult {
                columns: Vec::new(),
                rows: Vec::new(),
                execution_time_ms,
                row_count: 0,
                error: None,
            });
        }

        // First line is column headers
        let columns: Vec<String> = lines[0].split('\t').map(|s| s.to_string()).collect();
        let mut rows = Vec::new();

        for &line in &lines[1..] {
            // Ignore trailing footer line like "(2 rows)"
            if line.starts_with('(') && line.ends_with(')') {
                continue;
            }
            if line.is_empty() {
                continue;
            }
            let row: Vec<String> = line.split('\t').map(|s| s.to_string()).collect();
            rows.push(row);
        }

        let row_count = rows.len();
        Ok(crate::models::SqlExecuteResult {
            columns,
            rows,
            execution_time_ms,
            row_count,
            error: None,
        })
    }

    pub async fn validate_and_reload_nginx(
        &self,
        container_id: &str,
        config: &str,
    ) -> Result<String, String> {
        // Determine target file: full nginx.conf if top-level directives present, otherwise conf.d/default.conf
        let target_file = if config.contains("worker_processes") || config.contains("events {") {
            "/etc/nginx/nginx.conf"
        } else {
            "/etc/nginx/conf.d/default.conf"
        };

        let write_cmd = format!(
            "cat << 'NETLAB_EOF' > {}\n{}\nNETLAB_EOF",
            target_file, config
        );
        let write_res = self
            .exec_command(container_id, vec!["sh", "-c", &write_cmd])
            .await?;
        if write_res.exit_code != 0 {
            return Err(format!("Failed to write nginx config: {}", write_res.stderr));
        }

        // 2. Validate configuration using nginx -t
        let test_res = self
            .exec_command(container_id, vec!["nginx", "-t"])
            .await?;
        if test_res.exit_code != 0 {
            return Err(format!(
                "Nginx Syntax Verification Failed (exit code {}):\n{}{}",
                test_res.exit_code, test_res.stderr, test_res.stdout
            ));
        }

        // 3. Reload nginx
        let reload_res = self
            .exec_command(container_id, vec!["nginx", "-s", "reload"])
            .await?;
        if reload_res.exit_code != 0 {
            return Err(format!("Nginx reload failed: {}", reload_res.stderr));
        }

        Ok(format!(
            "Nginx configuration syntax is valid!\n{}",
            test_res.stderr
        ))
    }
}
