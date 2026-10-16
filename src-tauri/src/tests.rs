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
        db.delete_lab("test-lab-unit-1").expect("Failed to delete lab");
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
        assert!(ping_res.is_ok(), "Docker ping should succeed: {:?}", ping_res);
    }

    #[tokio::test]
    async fn test_real_ubuntu_vps_mandatory_commands() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker not available, skipping live Ubuntu VPS test");
            return;
        }

        // Test with pre-built netlab/ubuntu-vps:24.04 or fallback to ubuntu:24.04
        let image = "netlab/ubuntu-vps:24.04";
        let (cid, ip) = docker
            .start_container(
                "netlab_test_ubuntu_mandatory_e2e",
                image,
                Some(18029),
                Some(18029),
                vec!["NETLAB_TEST=1".to_string()],
                Some(vec!["/usr/sbin/sshd".to_string(), "-D".to_string(), "-p".to_string(), "18029".to_string()]),
                Some("host".to_string()),
            )
            .await
            .expect("Failed to start Ubuntu 24.04 VPS container");

        assert!(docker.is_container_running(&cid).await, "Container must be confirmed running");
        assert!(ip.is_some(), "Container must have an internal IP address");

        // 1. cat /etc/os-release
        let res_os = docker
            .exec_command(&cid, vec!["bash", "-c", "cat /etc/os-release"])
            .await
            .expect("exec cat /etc/os-release failed");
        assert_eq!(res_os.exit_code, 0);
        assert!(res_os.stdout.contains("Ubuntu"), "Output must contain Ubuntu");
        assert!(res_os.stdout.contains("24.04"), "Output must contain 24.04");

        // 2. whoami
        let res_whoami = docker
            .exec_command(&cid, vec!["bash", "-c", "whoami"])
            .await
            .expect("exec whoami failed");
        assert_eq!(res_whoami.exit_code, 0);
        assert_eq!(res_whoami.stdout.trim(), "root");

        // 3. pwd
        let res_pwd = docker
            .exec_command(&cid, vec!["bash", "-c", "pwd"])
            .await
            .expect("exec pwd failed");
        assert_eq!(res_pwd.exit_code, 0);
        assert_eq!(res_pwd.stdout.trim(), "/root");

        // 4. command -v apt
        let res_apt = docker
            .exec_command(&cid, vec!["bash", "-c", "command -v apt"])
            .await
            .expect("exec command -v apt failed");
        assert_eq!(res_apt.exit_code, 0);
        assert!(res_apt.stdout.contains("apt"));

        // 5. curl --version
        let res_curl = docker
            .exec_command(&cid, vec!["bash", "-c", "curl --version"])
            .await
            .expect("exec curl --version failed");
        assert_eq!(res_curl.exit_code, 0);
        assert!(res_curl.stdout.contains("curl"));

        // 6. File creation & read back: /tmp/netlab-debug/result.txt
        let res_file = docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "mkdir -p /tmp/netlab-debug && echo 'real-runtime-ok' > /tmp/netlab-debug/result.txt && cat /tmp/netlab-debug/result.txt",
                ],
            )
            .await
            .expect("exec file creation failed");
        assert_eq!(res_file.exit_code, 0);
        assert_eq!(res_file.stdout.trim(), "real-runtime-ok");

        // 7. Verify outbound DNS and HTTP reachability from VPS
        let res_net = docker
            .exec_command(
                &cid,
                vec![
                    "bash",
                    "-c",
                    "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 https://raw.githubusercontent.com || echo 'FAILED'",
                ],
            )
            .await
            .expect("exec outbound curl check failed");
        assert_ne!(res_net.stdout.trim(), "FAILED", "VPS must have working outbound internet and DNS");

        // Stop container and verify is_container_running reflects reality
        let _ = docker.stop_container(&cid).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        assert!(!docker.is_container_running(&cid).await, "Container must be confirmed stopped");
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
        async fn fetch_gateway(url: &str) -> (u16, std::collections::HashMap<String, String>, String) {
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            use tokio::net::TcpStream;
            let stripped = url.trim_start_matches("http://");
            let mut parts = stripped.splitn(2, '/');
            let host_port = parts.next().unwrap_or("127.0.0.1:18094");
            let path = format!("/{}", parts.next().unwrap_or(""));

            let mut stream = TcpStream::connect(host_port).await.expect("Failed to connect to gateway");
            let req = format!("GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", path, host_port);
            stream.write_all(req.as_bytes()).await.expect("Failed to write to gateway");

            let mut response_bytes = Vec::new();
            stream.read_to_end(&mut response_bytes).await.expect("Failed to read from gateway");
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
        let browse_url = format!("http://127.0.0.1:{}/browse?url=http://shop.test", gateway_port);
        let (status, headers, body) = fetch_gateway(&browse_url).await;
        assert_eq!(status, 200, "Should return HTTP 200 OK");
        assert_eq!(
            headers.get("x-netlab-dns-resolved").map(|s| s.as_str()),
            Some("shop.test")
        );
        assert!(body.contains("Welcome to Shop.test!"), "Body must contain live shop.test HTML");

        // 5. Deliberately break domain mapping and verify genuine NXDOMAIN / 404 response
        dns.remove_record("rec-shop-test");
        // Clear route in gateway
        {
            let mut routes = gateway.state.routes.write().unwrap();
            routes.remove("shop.test");
        }

        let (broken_status, _, broken_body) = fetch_gateway(&browse_url).await;
        assert_eq!(broken_status, 404, "Unmapped domain must return 404");
        assert!(broken_body.contains("DNS NXDOMAIN") || broken_body.contains("cannot be resolved"), "Must show NXDOMAIN error page");

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
        assert!(recovered_body.contains("Welcome to Shop.test!"), "Recovered body must contain shop content");

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
                Some(vec!["sh".to_string(), "-c".to_string(), "exit 42".to_string()]),
                None,
            )
            .await;

        assert!(fail_res.is_err(), "Container with immediate exit must fail readiness check");
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
        assert!(fail_res_bin.is_err(), "Non-existent binary must fail container start");
    }
}
