#[cfg(test)]
mod tests {
    use crate::capabilities::detect_capabilities;
    use crate::db::Database;
    use crate::dns::DnsEngine;
    use crate::gateway::HostGateway;
    use crate::models::{DnsRecord, GatewayRoute, Lab, LabComponent};
    use crate::simulator::Simulator;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_capability_detection() {
        let caps = detect_capabilities(18080).await;
        assert!(caps.cpu_cores > 0);
        assert!(caps.total_memory_mb > 0);
        assert_eq!(caps.gateway_port, 18080);
    }

    #[test]
    fn test_simulator_execution() {
        let sim = Simulator::new();
        sim.init_component("comp-1", "web");

        let res_uname = sim.exec_command("comp-1", &["uname"]);
        assert_eq!(res_uname.exit_code, 0);
        assert!(res_uname.stdout.contains("Linux"));

        let res_whoami = sim.exec_command("comp-1", &["whoami"]);
        assert_eq!(res_whoami.stdout.trim(), "root");

        let res_os = sim.exec_command("comp-1", &["cat", "/etc/os-release"]);
        assert!(res_os.stdout.contains("Alpine Linux"));
    }

    #[test]
    fn test_sqlite_persistence() {
        let db = Database::new().expect("Failed to open DB");
        let test_lab = Lab {
            id: "test-lab-unit-1".to_string(),
            name: "Unit Test Lab".to_string(),
            description: "Testing DB persistence".to_string(),
            status: "Draft".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            components: vec![LabComponent {
                id: "comp-u1".to_string(),
                lab_id: "test-lab-unit-1".to_string(),
                name: "Unit Test VPS".to_string(),
                component_type: "vps".to_string(),
                runtime_mode: "simulated".to_string(),
                image: "alpine:latest".to_string(),
                status: "stopped".to_string(),
                container_id: None,
                ip_address: None,
                host_port: Some(18081),
                container_port: Some(80),
                created_at: chrono::Utc::now().to_rfc3339(),
            }],
            routes: vec![GatewayRoute {
                id: "route-u1".to_string(),
                lab_id: "test-lab-unit-1".to_string(),
                domain: "app.localhost".to_string(),
                target_component_id: "comp-u1".to_string(),
                target_port: 80,
                host_port: 18081,
            }],
        };

        db.save_lab(&test_lab).expect("Failed to save lab");
        let labs = db.list_labs().expect("Failed to list labs");
        let found = labs.iter().find(|l| l.id == "test-lab-unit-1");
        assert!(found.is_some());
        let loaded = found.unwrap();
        assert_eq!(loaded.name, "Unit Test Lab");
        assert_eq!(loaded.components.len(), 1);
        assert_eq!(loaded.routes.len(), 1);

        // cleanup
        db.delete_lab("test-lab-unit-1")
            .expect("Failed to delete lab");
    }

    #[tokio::test]
    async fn test_dns_resolution_and_probe() {
        let dns = DnsEngine::new();
        dns.add_record(DnsRecord {
            id: "rec-1".to_string(),
            lab_id: "lab-1".to_string(),
            domain: "shop.test".to_string(),
            record_type: "A".to_string(),
            value: "127.0.0.1:18081".to_string(),
            ttl: 300,
            target_component_id: "comp-web".to_string(),
            target_port: 80,
            host_port: 18081,
        });

        // Test resolution
        let resolved = dns.resolve("shop.test");
        assert!(resolved.is_some());
        assert_eq!(resolved.unwrap().host_port, 18081);

        // Test NXDOMAIN
        let nxdomain = dns.resolve("unknown.test");
        assert!(nxdomain.is_none());

        // Test probe for non-existent domain gives NXDOMAIN diagnostics
        let probe_nx = dns.probe("unknown.test").await;
        assert_eq!(probe_nx.http_status, Some(404));
        assert!(probe_nx.diagnostics.contains("NXDOMAIN"));
    }

    #[tokio::test]
    async fn test_gateway_route_registration() {
        let dns = Arc::new(DnsEngine::new());
        let gateway = HostGateway::new(18089, dns);
        gateway.register_route("shop.localhost", 18081);
        gateway.register_component("comp-1", 18081);
        assert!(gateway.start().await.is_ok());
    }

    #[tokio::test]
    async fn test_docker_availability_and_ping() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker daemon not running, skipping live ping test");
            return;
        }
        let ping_res = docker.ping().await;
        assert!(
            ping_res.is_ok(),
            "Docker ping should succeed: {:?}",
            ping_res
        );
    }

    #[tokio::test]
    async fn test_real_ubuntu_vps_mandatory_commands() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker not available, skipping live Ubuntu VPS acceptance tests");
            return;
        }

        let container_name = "netlab_test_ubuntu_acceptance_full";
        // Clean up any stale container from earlier runs
        let _ = docker.remove_container(container_name).await;

        let image = "ubuntu:24.04";
        let (cid, ip) = docker
            .start_container(
                container_name,
                image,
                Some(18029),
                Some(22),
                vec!["POCKETCLOUD_TEST=1".to_string()],
                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                Some("host".to_string()),
            )
            .await
            .expect("Failed to start Ubuntu 24.04 VPS container");

        assert!(
            docker.is_container_running(&cid).await,
            "Container must be confirmed running"
        );
        assert!(ip.is_some(), "Container must have an internal IP address");

        // Test A: Operating system
        let res_a = docker
            .exec_command(&cid, vec!["bash", "-c", "cat /etc/os-release"])
            .await
            .expect("Test A exec failed");
        assert_eq!(res_a.exit_code, 0, "Test A exit code must be 0");
        assert!(
            res_a.stdout.contains("Ubuntu"),
            "Test A must contain Ubuntu"
        );
        assert!(res_a.stdout.contains("24.04"), "Test A must contain 24.04");
        println!(
            "[Acceptance Test A PASSED] cat /etc/os-release:\n{}",
            res_a.stdout.lines().take(3).collect::<Vec<_>>().join("\n")
        );

        // Test B: Identity
        let res_b1 = docker
            .exec_command(&cid, vec!["bash", "-c", "whoami"])
            .await
            .expect("whoami failed");
        assert_eq!(res_b1.exit_code, 0);
        assert_eq!(res_b1.stdout.trim(), "root");

        let res_b2 = docker
            .exec_command(&cid, vec!["bash", "-c", "id"])
            .await
            .expect("id failed");
        assert_eq!(res_b2.exit_code, 0);
        assert!(res_b2.stdout.contains("uid=0(root)"));

        let res_b3 = docker
            .exec_command(&cid, vec!["bash", "-c", "pwd"])
            .await
            .expect("pwd failed");
        assert_eq!(res_b3.exit_code, 0);
        assert_eq!(res_b3.stdout.trim(), "/root");
        println!(
            "[Acceptance Test B PASSED] whoami: {}, id: {}, pwd: {}",
            res_b1.stdout.trim(),
            res_b2.stdout.trim(),
            res_b3.stdout.trim()
        );

        // Test C: Kernel (shared with host)
        let res_c = docker
            .exec_command(&cid, vec!["bash", "-c", "uname -a"])
            .await
            .expect("uname -a failed");
        assert_eq!(res_c.exit_code, 0);
        assert!(res_c.stdout.contains("Linux"));
        println!(
            "[Acceptance Test C PASSED] uname -a: {}",
            res_c.stdout.trim()
        );

        // Test D: Filesystem
        let res_d = docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "mkdir -p /tmp/pocketcloud-test && printf 'runtime-ok\\n' > /tmp/pocketcloud-test/result.txt && cat /tmp/pocketcloud-test/result.txt",
                ],
            )
            .await
            .expect("Test D exec failed");
        assert_eq!(res_d.exit_code, 0);
        assert_eq!(res_d.stdout.trim(), "runtime-ok");
        println!(
            "[Acceptance Test D PASSED] /tmp/pocketcloud-test/result.txt: {}",
            res_d.stdout.trim()
        );

        // Test E: Package manager
        let res_e1 = docker
            .exec_command(&cid, vec!["bash", "-c", "command -v apt-get"])
            .await
            .expect("apt-get check failed");
        assert_eq!(res_e1.exit_code, 0);
        assert!(res_e1.stdout.contains("apt-get"));

        let res_e2 = docker
            .exec_command(&cid, vec!["bash", "-c", "apt-get update"])
            .await
            .expect("apt-get update failed");
        assert_eq!(res_e2.exit_code, 0);
        println!(
            "[Acceptance Test E PASSED] apt-get update completed successfully with exit code 0"
        );

        // Test F: Networking utilities (ip addr)
        let res_f = docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "if ! command -v ip >/dev/null 2>&1; then apt-get install -y --no-install-recommends iproute2 >/dev/null 2>&1; fi && ip addr",
                ],
            )
            .await
            .expect("ip addr exec failed");
        assert_eq!(res_f.exit_code, 0);
        assert!(
            res_f.stdout.contains("eth0")
                || res_f.stdout.contains("lo")
                || res_f.stdout.contains("inet")
        );
        println!("[Acceptance Test F PASSED] ip addr executed inside container with exit code 0");

        // Test G: Container restart & persistence
        let res_g1 = docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "mkdir -p /opt/pocketcloud-test && printf 'persistent-data\\n' > /opt/pocketcloud-test/state.txt",
                ],
            )
            .await
            .expect("write persistence file failed");
        assert_eq!(res_g1.exit_code, 0);

        // Stop the container
        docker
            .stop_container(&cid)
            .await
            .expect("stop container failed");
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        assert!(
            !docker.is_container_running(&cid).await,
            "Container must be confirmed stopped"
        );

        // Resume the SAME container
        let resumed_cid = docker
            .ensure_active_container(&cid)
            .await
            .expect("ensure_active_container failed");
        assert_eq!(
            resumed_cid, cid,
            "Must resume exact same container instance"
        );

        // Read the file after restart
        let res_g2 = docker
            .exec_command(
                &cid,
                vec!["bash", "-c", "cat /opt/pocketcloud-test/state.txt"],
            )
            .await
            .expect("read persistence file failed");
        assert_eq!(res_g2.exit_code, 0);
        assert_eq!(
            res_g2.stdout.trim(),
            "persistent-data",
            "File contents must survive container restart"
        );
        println!(
            "[Acceptance Test G PASSED] File /opt/pocketcloud-test/state.txt persisted across container stop and restart: {}",
            res_g2.stdout.trim()
        );

        // Test H: Runtime identity
        let inspect_res = docker
            .inspect_container(&cid)
            .await
            .expect("inspect container failed");
        let actual_docker_id = inspect_res.id.expect("container must have ID");
        assert_eq!(
            actual_docker_id, cid,
            "Runtime ID returned by Docker must match terminal execution target ID"
        );
        println!(
            "[Acceptance Test H PASSED] Runtime ID matched: {}",
            actual_docker_id
        );

        // Test I: Failure handling
        // Stop the container externally
        docker
            .stop_container(&cid)
            .await
            .expect("stop container failed");
        assert!(!docker.is_container_running(&cid).await);

        // ensure_active_container recovers cleanly and restarts container
        let recovered_cid = docker
            .ensure_active_container(&cid)
            .await
            .expect("recovering container failed");
        assert_eq!(recovered_cid, cid);
        assert!(
            docker.is_container_running(&cid).await,
            "Recovered container must be running"
        );
        println!(
            "[Acceptance Test I PASSED] Container recovered from stopped state without data loss"
        );

        // Clean up test container
        let _ = docker.stop_container(&cid).await;
        let _ = docker.remove_container(&cid).await;
    }

    #[tokio::test]
    async fn test_real_nginx_virtual_domain_and_gateway_e2e() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker not available, skipping live Nginx gateway test");
            return;
        }

        let nginx_host_port = 18093;
        let gateway_port = 18094;

        // 1. Start real Nginx container
        let (nginx_id, _) = docker
            .start_container(
                "netlab_test_nginx_shop_e2e",
                "nginx:alpine",
                Some(nginx_host_port),
                Some(80),
                vec![],
                None,
                None,
            )
            .await
            .expect("Failed to start Nginx container");

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // 2. Configure real virtual host serving shop.test HTML page
        let shop_config = format!(
            "server {{\n    listen 80;\n    server_name shop.test;\n    location / {{\n        default_type text/html;\n        return 200 '<!DOCTYPE html><html><head><title>Shop Test Store</title></head><body><h1>Welcome to Shop.test!</h1><p>NetLab Live Container Gateway</p></body></html>';\n    }}\n}}\n"
        );
        let reload_res = docker
            .validate_and_reload_nginx(&nginx_id, &shop_config)
            .await
            .expect("Nginx reload failed");
        assert!(reload_res.contains("test is successful"));

        // 3. Initialize Gateway & DNS Engine
        let dns = Arc::new(DnsEngine::new());
        let gateway = HostGateway::new(gateway_port, dns.clone());
        gateway.register_route("shop.test", nginx_host_port);
        gateway.register_component("web-shop", nginx_host_port);

        dns.add_record(DnsRecord {
            id: "rec-shop-test".to_string(),
            lab_id: "lab-shop-e2e".to_string(),
            domain: "shop.test".to_string(),
            record_type: "A".to_string(),
            value: format!("127.0.0.1:{}", nginx_host_port),
            ttl: 300,
            target_component_id: "web-shop".to_string(),
            target_port: 80,
            host_port: nginx_host_port,
        });

        // Start gateway on local loopback
        let _ = gateway.start().await;
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

        // Helper for raw HTTP fetch against gateway on loopback
        async fn fetch_gateway(
            url: &str,
        ) -> (u16, std::collections::HashMap<String, String>, String) {
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            use tokio::net::TcpStream;
            let stripped = url.trim_start_matches("http://");
            let mut parts = stripped.splitn(2, '/');
            let host_port = parts.next().unwrap_or("127.0.0.1:18094");
            let path = format!("/{}", parts.next().unwrap_or(""));

            let mut stream = TcpStream::connect(host_port)
                .await
                .expect("Failed to connect to gateway");
            let req = format!(
                "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
                path, host_port
            );
            stream
                .write_all(req.as_bytes())
                .await
                .expect("Failed to write to gateway");

            let mut response_bytes = Vec::new();
            stream
                .read_to_end(&mut response_bytes)
                .await
                .expect("Failed to read from gateway");
            let res_str = String::from_utf8_lossy(&response_bytes).to_string();

            let mut split = res_str.split("\r\n\r\n");
            let header_str = split.next().unwrap_or("");
            let body_str = split.collect::<Vec<&str>>().join("\r\n\r\n");

            let status = header_str
                .lines()
                .next()
                .and_then(|l| l.split_whitespace().nth(1))
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(500);

            let mut headers = std::collections::HashMap::new();
            for line in header_str.lines().skip(1) {
                if let Some((k, v)) = line.split_once(':') {
                    headers.insert(k.trim().to_lowercase(), v.trim().to_string());
                }
            }

            (status, headers, body_str)
        }

        // 4. Test accessing shop.test through built-in gateway browser endpoint
        let browse_url = format!(
            "http://127.0.0.1:{}/browse?url=http://shop.test",
            gateway_port
        );
        let (status, headers, body) = fetch_gateway(&browse_url).await;
        assert_eq!(status, 200, "Should return HTTP 200 OK");
        assert_eq!(
            headers.get("x-netlab-dns-resolved").map(|s| s.as_str()),
            Some("shop.test")
        );
        assert!(
            body.contains("Welcome to Shop.test!"),
            "Body must contain live shop.test HTML"
        );

        // 5. Deliberately break domain mapping and verify genuine NXDOMAIN / 404 response
        dns.remove_record("rec-shop-test");
        // Clear route in gateway
        {
            let mut routes = gateway.state.routes.write().unwrap();
            routes.remove("shop.test");
        }

        let (broken_status, _, broken_body) = fetch_gateway(&browse_url).await;
        assert_eq!(broken_status, 404, "Unmapped domain must return 404");
        assert!(
            broken_body.contains("DNS NXDOMAIN") || broken_body.contains("cannot be resolved"),
            "Must show NXDOMAIN error page"
        );

        // 6. Restore mapping and verify recovery
        dns.add_record(DnsRecord {
            id: "rec-shop-test".to_string(),
            lab_id: "lab-shop-e2e".to_string(),
            domain: "shop.test".to_string(),
            record_type: "A".to_string(),
            value: format!("127.0.0.1:{}", nginx_host_port),
            ttl: 300,
            target_component_id: "web-shop".to_string(),
            target_port: 80,
            host_port: nginx_host_port,
        });
        gateway.register_route("shop.test", nginx_host_port);

        let (recovered_status, _, recovered_body) = fetch_gateway(&browse_url).await;
        assert_eq!(recovered_status, 200, "Recovered domain must return 200 OK");
        assert!(
            recovered_body.contains("Welcome to Shop.test!"),
            "Recovered body must contain shop content"
        );

        // Cleanup
        let _ = docker.stop_container(&nginx_id).await;
        let _ = docker.remove_container(&nginx_id).await;
    }

    #[tokio::test]
    async fn test_container_failed_startup_behavior() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker not available, skipping container failed startup test");
            return;
        }

        // 1. Attempt to start a container with a command that immediately exits
        let fail_res = docker
            .start_container(
                "netlab_test_failing_container_1",
                "alpine:latest",
                None,
                None,
                vec![],
                Some(vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    "exit 42".to_string(),
                ]),
                None,
            )
            .await;

        assert!(
            fail_res.is_err(),
            "Container with immediate exit must fail readiness check"
        );
        let err_msg = fail_res.err().unwrap();
        assert!(
            err_msg.contains("exited immediately") || err_msg.contains("Failed to start container"),
            "Error must report immediate exit: {}",
            err_msg
        );

        // 2. Attempt to start a container with an invalid binary
        let fail_res_bin = docker
            .start_container(
                "netlab_test_failing_container_2",
                "alpine:latest",
                None,
                None,
                vec![],
                Some(vec!["non_existent_binary_xyz123".to_string()]),
                None,
            )
            .await;
        assert!(
            fail_res_bin.is_err(),
            "Non-existent binary must fail container start"
        );
    }

    fn create_test_app_state() -> crate::commands::AppState {
        let db = Arc::new(Database::new().expect("Failed to initialize SQLite database"));
        let docker = Arc::new(crate::docker::DockerManager::new());
        let simulator = Arc::new(Simulator::new());
        let qemu = Arc::new(crate::qemu::QemuManager::new());
        let dns = Arc::new(DnsEngine::new());
        let gateway_port = 18099;
        let gateway = Arc::new(HostGateway::new(gateway_port, dns.clone()));

        crate::commands::AppState {
            db,
            docker,
            simulator,
            qemu,
            gateway,
            dns,
            gateway_port,
        }
    }

    #[tokio::test]
    async fn test_phase7_a_runtime_persistence_and_reconnection() {
        let app_state = create_test_app_state();
        if !app_state.docker.is_available() {
            println!("Docker daemon not available, skipping Phase 7 Test A");
            return;
        }

        let container_name = "netlab_phase7_a_vps";
        let _ = app_state.docker.stop_container(container_name).await;
        let _ = app_state.docker.remove_container(container_name).await;

        // 1 & 2: Start real container using pinned Ubuntu image
        let (cid, ip) = app_state
            .docker
            .start_container(
                container_name,
                "ubuntu:24.04",
                Some(18031),
                Some(22),
                vec!["TEST_PHASE=7A".to_string()],
                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                Some("host".to_string()),
            )
            .await
            .expect("Failed to start Ubuntu 24.04 container for Test A");

        let vps_id = "vps-phase7-a-stable";
        let lab_id = "lab-phase7-a";

        // 3: Persist runtime ID against stable application VPS ID
        let test_lab = Lab {
            id: lab_id.to_string(),
            name: "Phase 7A Lab".to_string(),
            description: "Test runtime persistence".to_string(),
            status: "Running".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            components: vec![LabComponent {
                id: vps_id.to_string(),
                lab_id: lab_id.to_string(),
                name: "Phase 7A Ubuntu VPS".to_string(),
                component_type: "vps".to_string(),
                runtime_mode: "docker".to_string(),
                image: "ubuntu:24.04".to_string(),
                status: "running".to_string(),
                container_id: Some(cid.clone()),
                ip_address: ip,
                host_port: Some(18031),
                container_port: Some(22),
                created_at: chrono::Utc::now().to_rfc3339(),
            }],
            routes: vec![],
        };

        app_state
            .db
            .save_lab(&test_lab)
            .expect("Failed to save lab");

        // 4: Execute real command and assert stdout and exit code
        let res1 = crate::commands::exec_command_internal(
            &app_state,
            vps_id.to_string(),
            "whoami".to_string(),
            "docker".to_string(),
            None,
        )
        .await
        .expect("Test A command 1 failed");
        assert_eq!(res1.exit_code, 0);
        assert_eq!(res1.stdout.trim(), "root");

        // 5 & 6: Close and reopen terminal execution session: resolve same application VPS ID again
        let labs = app_state.db.list_labs().expect("Failed to list labs");
        let reloaded_lab = labs.iter().find(|l| l.id == lab_id).expect("Lab not found");
        let reloaded_comp = reloaded_lab
            .components
            .iter()
            .find(|c| c.id == vps_id)
            .expect("Component not found");

        // 7: Assert that the same runtime ID is used
        assert_eq!(
            reloaded_comp.container_id.as_deref(),
            Some(cid.as_str()),
            "Runtime ID must match exact persisted container ID"
        );

        // 8: Execute second command and verify real output
        let res2 = crate::commands::exec_command_internal(
            &app_state,
            vps_id.to_string(),
            "printf 'pocketcloud-runtime-test\\n'".to_string(),
            "docker".to_string(),
            None,
        )
        .await
        .expect("Test A command 2 failed");
        assert_eq!(res2.exit_code, 0);
        assert_eq!(res2.stdout.trim(), "pocketcloud-runtime-test");

        // 9: Cleanup test resources safely
        let _ = app_state.docker.stop_container(&cid).await;
        let _ = app_state.docker.remove_container(&cid).await;
        let _ = app_state.db.delete_lab(lab_id);
    }

    #[tokio::test]
    async fn test_phase7_b_missing_and_stopped_runtime() {
        let app_state = create_test_app_state();
        if !app_state.docker.is_available() {
            println!("Docker daemon not available, skipping Phase 7 Test B");
            return;
        }

        let container_name = "netlab_phase7_b_vps";
        let _ = app_state.docker.stop_container(container_name).await;
        let _ = app_state.docker.remove_container(container_name).await;

        // 1: Create real test container
        let (cid, ip) = app_state
            .docker
            .start_container(
                container_name,
                "ubuntu:24.04",
                Some(18032),
                Some(22),
                vec![],
                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                Some("host".to_string()),
            )
            .await
            .expect("Failed to start container for Test B");

        let vps_id = "vps-phase7-b-stable";
        let lab_id = "lab-phase7-b";

        // 2: Persist its mapping
        let test_lab = Lab {
            id: lab_id.to_string(),
            name: "Phase 7B Lab".to_string(),
            description: "Test stopped and missing container reporting".to_string(),
            status: "Running".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            components: vec![LabComponent {
                id: vps_id.to_string(),
                lab_id: lab_id.to_string(),
                name: "Phase 7B Ubuntu VPS".to_string(),
                component_type: "vps".to_string(),
                runtime_mode: "docker".to_string(),
                image: "ubuntu:24.04".to_string(),
                status: "running".to_string(),
                container_id: Some(cid.clone()),
                ip_address: ip,
                host_port: Some(18032),
                container_port: Some(22),
                created_at: chrono::Utc::now().to_rfc3339(),
            }],
            routes: vec![],
        };
        app_state
            .db
            .save_lab(&test_lab)
            .expect("Failed to save lab");

        // 3: Stop the container through Docker
        app_state
            .docker
            .stop_container(&cid)
            .await
            .expect("Stop container failed");
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

        // 4 & 5: Execute command through application service and assert stopped container is reported
        let err_stopped = crate::commands::exec_command_internal(
            &app_state,
            vps_id.to_string(),
            "whoami".to_string(),
            "docker".to_string(),
            None,
        )
        .await;

        assert!(
            err_stopped.is_err(),
            "Executing against stopped container must fail"
        );
        let err_msg = err_stopped.err().unwrap();
        assert!(
            err_msg.contains("is stopped"),
            "Error must report stopped status, got: {}",
            err_msg
        );

        // Remove container through Docker
        app_state
            .docker
            .remove_container(&cid)
            .await
            .expect("Remove container failed");

        // 4 & 5: Execute command again and assert missing container is reported
        let err_missing = crate::commands::exec_command_internal(
            &app_state,
            vps_id.to_string(),
            "whoami".to_string(),
            "docker".to_string(),
            None,
        )
        .await;

        assert!(
            err_missing.is_err(),
            "Executing against removed container must fail"
        );
        let err_msg_missing = err_missing.err().unwrap();
        assert!(
            err_msg_missing.contains("not found in Docker Engine")
                || err_msg_missing.contains("No such container"),
            "Error must report container not found, got: {}",
            err_msg_missing
        );

        // 6: Assert that no simulated output or unrelated-container output is returned
        assert!(
            !err_msg_missing.contains("root"),
            "Must not return simulated output"
        );

        // Cleanup DB
        let _ = app_state.db.delete_lab(lab_id);
    }

    #[tokio::test]
    async fn test_phase7_c_restart_recovery() {
        let app_state_initial = create_test_app_state();
        if !app_state_initial.docker.is_available() {
            println!("Docker daemon not available, skipping Phase 7 Test C");
            return;
        }

        let container_name = "netlab_phase7_c_vps";
        let _ = app_state_initial
            .docker
            .stop_container(container_name)
            .await;
        let _ = app_state_initial
            .docker
            .remove_container(container_name)
            .await;

        let (cid, ip) = app_state_initial
            .docker
            .start_container(
                container_name,
                "ubuntu:24.04",
                Some(18033),
                Some(22),
                vec![],
                Some(vec!["sleep".to_string(), "infinity".to_string()]),
                Some("host".to_string()),
            )
            .await
            .expect("Failed to start container for Test C");

        let vps_id = "vps-phase7-c-stable";
        let lab_id = "lab-phase7-c";

        let test_lab = Lab {
            id: lab_id.to_string(),
            name: "Phase 7C Lab".to_string(),
            description: "Test restart recovery".to_string(),
            status: "Running".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            components: vec![LabComponent {
                id: vps_id.to_string(),
                lab_id: lab_id.to_string(),
                name: "Phase 7C Ubuntu VPS".to_string(),
                component_type: "vps".to_string(),
                runtime_mode: "docker".to_string(),
                image: "ubuntu:24.04".to_string(),
                status: "running".to_string(),
                container_id: Some(cid.clone()),
                ip_address: ip,
                host_port: Some(18033),
                container_port: Some(22),
                created_at: chrono::Utc::now().to_rfc3339(),
            }],
            routes: vec![],
        };
        app_state_initial
            .db
            .save_lab(&test_lab)
            .expect("Failed to save lab");

        // Write marker file to verify state inside the container
        let write_res = app_state_initial
            .docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "printf 'restart-recovery-token\\n' > /root/recovery_marker.txt",
                ],
            )
            .await
            .expect("Failed to write marker file");
        assert_eq!(write_res.exit_code, 0);

        // Simulate application restart: Drop app_state_initial and construct completely new AppState
        drop(app_state_initial);

        let app_state_restarted = create_test_app_state();

        // Retrieve persisted lab and component through the new AppState
        let reloaded_labs = app_state_restarted
            .db
            .list_labs()
            .expect("Failed to list labs");
        let reloaded_lab = reloaded_labs
            .iter()
            .find(|l| l.id == lab_id)
            .expect("Lab must persist across restart");
        let reloaded_comp = reloaded_lab
            .components
            .iter()
            .find(|c| c.id == vps_id)
            .expect("Component must persist across restart");

        // Verify that the persisted mapping resolves to the exact same original container ID
        assert_eq!(reloaded_comp.container_id.as_deref(), Some(cid.as_str()));

        // Execute command through restarted application service
        let exec_res = crate::commands::exec_command_internal(
            &app_state_restarted,
            vps_id.to_string(),
            "cat /root/recovery_marker.txt".to_string(),
            "docker".to_string(),
            None,
        )
        .await
        .expect("Command execution after restart failed");

        assert_eq!(exec_res.exit_code, 0);
        assert_eq!(exec_res.stdout.trim(), "restart-recovery-token");

        // Cleanup
        let _ = app_state_restarted.docker.stop_container(&cid).await;
        let _ = app_state_restarted.docker.remove_container(&cid).await;
        let _ = app_state_restarted.db.delete_lab(lab_id);
    }
}
