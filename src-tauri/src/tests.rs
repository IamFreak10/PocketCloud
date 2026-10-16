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
    async fn test_real_docker_vps_and_nginx_e2e() {
        use crate::docker::DockerManager;
        let docker = DockerManager::new();
        if !docker.is_available() {
            println!("Docker not available, skipping live container test");
            return;
        }

        // 1. Test Real VPS Shell & File Operations in Alpine
        let (vps_id, _) = docker
            .start_container(
                "netlab_test_vps_e2e",
                "alpine:latest",
                None,
                None,
                vec![],
                Some(vec!["sh".to_string()]),
            )
            .await
            .expect("Failed to start Alpine VPS container");

        let os_res = docker
            .exec_command(&vps_id, vec!["sh", "-c", "cat /etc/os-release"])
            .await
            .expect("exec failed");
        assert_eq!(os_res.exit_code, 0);
        assert!(os_res.stdout.contains("Alpine Linux"));

        let whoami_res = docker
            .exec_command(&vps_id, vec!["sh", "-c", "whoami"])
            .await
            .expect("exec failed");
        assert_eq!(whoami_res.exit_code, 0);
        assert_eq!(whoami_res.stdout.trim(), "root");

        let write_res = docker
            .exec_command(
                &vps_id,
                vec![
                    "sh",
                    "-c",
                    "mkdir -p /tmp/netlab-test && echo 'NetLab real terminal' > /tmp/netlab-test/test.txt && cat /tmp/netlab-test/test.txt",
                ],
            )
            .await
            .expect("exec failed");
        assert_eq!(write_res.exit_code, 0);
        assert!(write_res.stdout.contains("NetLab real terminal"));

        // Clean up VPS
        let _ = docker.stop_container(&vps_id).await;

        // 2. Test Real Nginx Web Server & Config Validation
        let (nginx_id, _) = docker
            .start_container(
                "netlab_test_nginx_e2e",
                "nginx:alpine",
                Some(18092),
                Some(80),
                vec![],
                None,
            )
            .await
            .expect("Failed to start Nginx container");

        // Wait a moment for Nginx to bind
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // Validate syntax with nginx -t
        let valid_config = "worker_processes 1;\nevents { worker_connections 1024; }\nhttp {\n    server {\n        listen 80;\n        location / {\n            return 200 'NetLab Nginx Live E2E OK\\n';\n        }\n    }\n}\n";
        let reload_res = docker
            .validate_and_reload_nginx(&nginx_id, valid_config)
            .await
            .expect("nginx reload failed");
        assert!(reload_res.contains("test is successful"));

        // Clean up Nginx
        let _ = docker.stop_container(&nginx_id).await;

        // 3. Test Real Ubuntu 24.04 LTS Execution
        let (ubuntu_id, _) = docker
            .start_container(
                "netlab_test_ubuntu_e2e",
                "ubuntu:24.04",
                None,
                None,
                vec![],
                Some(vec!["bash".to_string()]),
            )
            .await
            .expect("Failed to start Ubuntu 24.04 container");

        let ub_os = docker
            .exec_command(&ubuntu_id, vec!["bash", "-c", "cat /etc/os-release"])
            .await
            .expect("exec failed on ubuntu");
        assert_eq!(ub_os.exit_code, 0);
        assert!(ub_os.stdout.contains("Ubuntu"));
        assert!(ub_os.stdout.contains("24.04"));

        let _ = docker.stop_container(&ubuntu_id).await;
    }
}
