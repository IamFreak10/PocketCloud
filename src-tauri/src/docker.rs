use crate::models::ExecResult;
use bollard::Docker;
use bollard::container::{
    Config, CreateContainerOptions, InspectContainerOptions, LogsOptions, RemoveContainerOptions,
    StartContainerOptions,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::models::{HostConfig, PortBinding, PortMap};
use futures_util::stream::StreamExt;
use std::collections::HashMap;

pub struct DockerManager {
    client: Option<Docker>,
}

impl DockerManager {
    pub fn new() -> Self {
        if let Ok(client) = Docker::connect_with_local_defaults() {
            return DockerManager {
                client: Some(client),
            };
        }

        #[cfg(unix)]
        {
            let mut candidates: Vec<std::path::PathBuf> = Vec::new();
            if let Ok(xdg) = std::env::var("XDG_RUNTIME_DIR") {
                candidates.push(std::path::PathBuf::from(xdg).join("docker.sock"));
            }
            if let Ok(home) = std::env::var("HOME") {
                let h = std::path::PathBuf::from(home);
                candidates.push(h.join(".docker/desktop/docker.sock"));
                candidates.push(h.join(".docker/run/docker.sock"));
            }
            candidates.push(std::path::PathBuf::from("/var/run/docker.sock"));

            for path in candidates {
                if path.exists() {
                    if let Ok(client) = Docker::connect_with_unix(
                        path.to_string_lossy().as_ref(),
                        120,
                        bollard::API_DEFAULT_VERSION,
                    ) {
                        return DockerManager {
                            client: Some(client),
                        };
                    }
                }
            }
        }

        DockerManager { client: None }
    }

    pub fn is_available(&self) -> bool {
        self.client.is_some()
    }

    pub async fn ensure_image(&self, image: &str) -> Result<(), String> {
        let docker = self.client.as_ref().ok_or("Docker not available")?;

        // 1. Try inspecting requested image first
        if docker.inspect_image(image).await.is_ok() {
            return Ok(());
        }

        // 2. If it's the custom ubuntu-vps and not present locally, auto-pull official ubuntu:24.04 base
        let pull_target = if image.contains("ubuntu-vps") {
            "ubuntu:24.04"
        } else {
            image
        };

        // Try inspecting fallback base image
        if docker.inspect_image(pull_target).await.is_err() {
            let mut pull_stream = docker.create_image(
                Some(CreateImageOptions {
                    from_image: pull_target,
                    ..Default::default()
                }),
                None,
                None,
            );

            while let Some(pull_result) = pull_stream.next().await {
                if let Err(e) = pull_result {
                    return Err(format!("Failed to pull {}: {}", pull_target, e));
                }
            }
        }

        // If pulling for ubuntu-vps, tag the pulled ubuntu:24.04 as netlab/ubuntu-vps:24.04
        if image.contains("ubuntu-vps") {
            let _ = docker
                .tag_image(
                    pull_target,
                    Some(bollard::image::TagImageOptions {
                        repo: "netlab/ubuntu-vps",
                        tag: "24.04",
                    }),
                )
                .await;
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
        network_mode: Option<String>,
    ) -> Result<(String, Option<String>), String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;

        // 1. Ensure image exists
        self.ensure_image(image).await?;

        let net_mode = network_mode.unwrap_or_else(|| "bridge".to_string());
        let is_host_net = net_mode == "host";

        // 2. Prepare port bindings on loopback only (127.0.0.1) for safety (bridge mode only)
        let mut port_bindings: PortMap = HashMap::new();
        let mut exposed_ports = HashMap::new();

        if !is_host_net {
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
        }

        // 3. Configure Resource Limits (Default: 512MB RAM, 1 CPU quota)
        let host_config = HostConfig {
            port_bindings: if is_host_net {
                None
            } else {
                Some(port_bindings)
            },
            memory: Some(512 * 1024 * 1024), // 512 MB
            nano_cpus: Some(1_000_000_000),  // 1 CPU
            network_mode: Some(net_mode.clone()),
            extra_hosts: Some(vec!["ubuntu-24:127.0.0.1".to_string()]),
            ..Default::default()
        };

        let container_config = Config {
            image: Some(image.to_string()),
            hostname: Some("ubuntu-24".to_string()),
            cmd: cmd.clone(),
            working_dir: Some("/root".to_string()),
            env: Some(env),
            exposed_ports: if is_host_net {
                None
            } else {
                Some(exposed_ports)
            },
            host_config: Some(host_config),
            tty: Some(true),
            open_stdin: Some(true),
            ..Default::default()
        };

        // If container already exists with the same name, reuse and start it to preserve user files and software
        let container_id = if let Ok(inspect) = docker
            .inspect_container(name, None::<InspectContainerOptions>)
            .await
        {
            let id = inspect.id.unwrap_or_else(|| name.to_string());
            let is_running = inspect.state.and_then(|s| s.running).unwrap_or(false);
            if !is_running {
                let _ = docker
                    .start_container(&id, None::<StartContainerOptions<String>>)
                    .await;
            }
            id
        } else {
            // Create container
            let create_opts = CreateContainerOptions {
                name: name.to_string(),
                platform: None,
            };

            let container_res = docker
                .create_container(Some(create_opts), container_config)
                .await
                .map_err(|e| format!("Failed to create container: {}", e))?;

            let id = container_res.id;
            docker
                .start_container(&id, None::<StartContainerOptions<String>>)
                .await
                .map_err(|e| format!("Failed to start container: {}", e))?;
            id
        };

        // Give container a brief moment to initialize or fail immediately
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        // Inspect to verify container is genuinely running and get IP
        let inspect = docker
            .inspect_container(&container_id, None::<InspectContainerOptions>)
            .await
            .map_err(|e| format!("Failed to inspect container: {}", e))?;

        let is_running = inspect
            .state
            .as_ref()
            .and_then(|s| s.running)
            .unwrap_or(false);

        if !is_running {
            let exit_code = inspect
                .state
                .as_ref()
                .and_then(|s| s.exit_code)
                .unwrap_or(-1);
            let error_msg = inspect
                .state
                .as_ref()
                .and_then(|s| s.error.clone())
                .unwrap_or_default();
            return Err(format!(
                "Container {} exited immediately after start (exit code {}): {}",
                name, exit_code, error_msg
            ));
        }

        let ip_address = if is_host_net {
            Some("127.0.0.1".to_string())
        } else {
            inspect
                .network_settings
                .and_then(|ns| ns.networks)
                .and_then(|nets| nets.values().next().cloned())
                .and_then(|net| net.ip_address)
                .filter(|ip| !ip.is_empty())
        };

        Ok((container_id, ip_address))
    }

    pub async fn is_container_running(&self, container_id: &str) -> bool {
        let Some(docker) = self.client.as_ref() else {
            return false;
        };
        match docker
            .inspect_container(container_id, None::<InspectContainerOptions>)
            .await
        {
            Ok(inspect) => inspect.state.and_then(|s| s.running).unwrap_or(false),
            Err(_) => false,
        }
    }

    pub async fn inspect_container(
        &self,
        container_id: &str,
    ) -> Result<bollard::models::ContainerInspectResponse, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        docker
            .inspect_container(container_id, None::<InspectContainerOptions>)
            .await
            .map_err(|e| format!("Failed to inspect container: {}", e))
    }

    pub async fn ensure_active_container(
        &self,
        container_name_or_id: &str,
    ) -> Result<String, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        let inspect = docker
            .inspect_container(container_name_or_id, None::<InspectContainerOptions>)
            .await
            .map_err(|e| format!("Container '{}' not found: {}", container_name_or_id, e))?;

        let id = inspect
            .id
            .unwrap_or_else(|| container_name_or_id.to_string());
        let is_running = inspect.state.and_then(|s| s.running).unwrap_or(false);

        if !is_running {
            let _ = docker
                .start_container(&id, None::<StartContainerOptions<String>>)
                .await;
            tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        }

        Ok(id)
    }

    pub async fn ping(&self) -> Result<(), String> {
        let docker = self
            .client
            .as_ref()
            .ok_or("Docker client not initialized")?;
        docker
            .ping()
            .await
            .map(|_| ())
            .map_err(|e| format!("Docker ping failed: {}", e))
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

    pub async fn exec_command(
        &self,
        container_id: &str,
        cmd: Vec<&str>,
    ) -> Result<ExecResult, String> {
        self.exec_command_with_timeout(
            container_id,
            cmd,
            Some(std::time::Duration::from_secs(60)),
            Some(5 * 1024 * 1024),
        )
        .await
    }

    pub async fn exec_command_with_timeout(
        &self,
        container_id: &str,
        cmd: Vec<&str>,
        timeout: Option<std::time::Duration>,
        max_output_bytes: Option<usize>,
    ) -> Result<ExecResult, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;

        let exec_create_opts = CreateExecOptions {
            cmd: Some(cmd.iter().map(|s| s.to_string()).collect()),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            working_dir: Some("/root".to_string()),
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
            let max_bytes = max_output_bytes.unwrap_or(5 * 1024 * 1024);
            let mut truncated = false;

            let read_stream = async {
                while let Some(msg) = output.next().await {
                    if let Ok(log_output) = msg {
                        match log_output {
                            bollard::container::LogOutput::StdOut { message } => {
                                if stdout.len() + stderr.len() < max_bytes {
                                    stdout.push_str(&String::from_utf8_lossy(&message));
                                } else if !truncated {
                                    truncated = true;
                                    stdout.push_str(
                                        "\n[Output truncated: maximum buffer limit exceeded]",
                                    );
                                    break;
                                }
                            }
                            bollard::container::LogOutput::StdErr { message } => {
                                if stdout.len() + stderr.len() < max_bytes {
                                    stderr.push_str(&String::from_utf8_lossy(&message));
                                } else if !truncated {
                                    truncated = true;
                                    stderr.push_str(
                                        "\n[Output truncated: maximum buffer limit exceeded]",
                                    );
                                    break;
                                }
                            }
                            _ => {}
                        }
                    }
                }
            };

            if let Some(dur) = timeout {
                match tokio::time::timeout(dur, read_stream).await {
                    Ok(()) => {}
                    Err(_) => {
                        let _ = docker.inspect_exec(&exec_id).await;
                        return Err(format!(
                            "Command execution timed out after {}s",
                            dur.as_secs()
                        ));
                    }
                }
            } else {
                read_stream.await;
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
        let cmd = vec!["psql", "-U", user, "-d", db, "-A", "-F", "\t", "-c", query];

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
            return Err(format!(
                "Failed to write nginx config: {}",
                write_res.stderr
            ));
        }

        // 2. Validate configuration using nginx -t
        let test_res = self.exec_command(container_id, vec!["nginx", "-t"]).await?;
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

    pub async fn list_images(&self) -> Result<Vec<crate::models::DockerImageInfo>, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        let images = docker
            .list_images(None::<bollard::image::ListImagesOptions<String>>)
            .await
            .map_err(|e| format!("Failed to list images: {}", e))?;

        let mut result = Vec::new();
        for img in images {
            let id = img
                .id
                .trim_start_matches("sha256:")
                .chars()
                .take(12)
                .collect::<String>();
            let size_mb = (img.size as f64) / (1024.0 * 1024.0);
            let created = img.created.to_string();

            for tag in img.repo_tags {
                if tag != "<none>:<none>" {
                    result.push(crate::models::DockerImageInfo {
                        id: id.clone(),
                        tag,
                        size_mb: (size_mb * 10.0).round() / 10.0,
                        created: created.clone(),
                    });
                }
            }
        }
        Ok(result)
    }

    pub async fn remove_image(&self, image_tag: &str) -> Result<(), String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        docker
            .remove_image(
                image_tag,
                Some(bollard::image::RemoveImageOptions {
                    force: true,
                    ..Default::default()
                }),
                None,
            )
            .await
            .map(|_| ())
            .map_err(|e| format!("Failed to remove image '{}': {}", image_tag, e))
    }

    pub async fn prune_stopped_containers(&self) -> Result<usize, String> {
        let docker = self.client.as_ref().ok_or("Docker daemon not available")?;
        let mut filters = HashMap::new();
        filters.insert("name".to_string(), vec!["netlab_".to_string()]);
        let res = docker
            .prune_containers(Some(bollard::container::PruneContainersOptions { filters }))
            .await
            .map_err(|e| format!("Failed to prune containers: {}", e))?;
        Ok(res.containers_deleted.unwrap_or_default().len())
    }
}
