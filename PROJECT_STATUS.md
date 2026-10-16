# NetLab Project Status

**Current Version:** 0.1.0-alpha  
**Date:** 2026-10-16  
**Platform Target:** Ubuntu/Debian Linux & Windows 10/11  
**Current Host:** Ubuntu 24.04.5 LTS (Noble Numbat), AMD Ryzen 7 5700G (16 vCPUs), 16GB RAM, ~208GB NVMe  
**Docker Runtime State:** Docker Engine Community 29.8.1 is fully operational. User `iamfreak` is a member of the `docker` group (`gid 127`), `/var/run/docker.sock` is accessible (`srw-rw---- 1 root docker`), and real Linux containers (`netlab/ubuntu-vps:24.04`, `nginx:alpine`, `postgres:alpine`) boot and execute natively with real shells.  
**QEMU VM State:** QEMU tools (`qemu-system-x86_64`, `qemu-img`, `cloud-localds`) are installed and the Ubuntu cloud image is downloaded. Since `/dev/kvm` is not accessible on this host, QEMU runs in TCG software emulation mode (slower). The primary recommended VPS runtime is the high-performance native Docker Ubuntu 24.04 container.

---

## Non-Negotiable Principle: Accurate Verification Status

Every feature in NetLab is rigorously classified into one of four states based on observable evidence:
1. **Real and implemented (Verified by automated tests & live container execution)**
2. **Implemented but not fully tested**
3. **Simulated (Clearly labeled in-memory fallback for offline/no-docker mode)**
4. **Planned or not implemented**

---

## Feature Matrix & Evidence

| Module | Feature | Status | Execution Environment | Verifiable Evidence |
|--------|---------|--------|-----------------------|---------------------|
| **C: VPS Control Suite** | Real Ubuntu 24.04 LTS VPS Container | **Real & Implemented** | Docker `netlab/ubuntu-vps:24.04` | Full Ubuntu 24.04 container with live OpenSSH server (`127.0.0.1:18022`), `/var/www/html` document root; automated test verified `cat /etc/os-release`, `whoami`, `pwd`, `command -v apt`, `curl --version`, file write/read `/tmp/netlab-debug/result.txt`, and genuine SSH key generation via `ssh-keygen` |
| **C: VPS & Terminal** | In-Memory Virtual Shell Fallback | **Simulated** | Rust In-Memory VFS | Automated test `test_simulator_execution` verifies virtual command parsing and directory tracking for non-Docker hosts |
| **E: Web Servers** | Nginx Web Server & VirtualHosts | **Real & Implemented** | Docker `nginx:alpine` | Automated test `test_real_nginx_virtual_domain_and_gateway_e2e` verified live boot on port 18093, `nginx -t` validation, live reload, and HTML serving |
| **I: Virtual DNS** | Authoritative Virtual DNS Engine | **Real & Implemented** | Rust `DnsEngine` + Axum | Resolves A and CNAME records (`shop.test -> 127.0.0.1:18093`), returns authoritative answers, handles TTL and NXDOMAIN diagnostics |
| **J: Built-in Browser & Gateway** | Loopback Reverse Proxy & Host Header Routing | **Real & Implemented** | Rust `HostGateway` + React | Live loopback bridge forwards requested domain `Host: shop.test` to internal container, returns genuine HTTP status (200, 404, 502), and injects `X-NetLab-DNS-Resolved` headers |
| **L: Network Tester** | Network Diagnostics & Probes | **Real & Implemented** | Rust Probe + React | Probes target URL, resolves virtual DNS, checks TCP socket reachability, measures latency, inspects HTTP status & headers |
| **H: Databases** | PostgreSQL 16 Instance & SQL Runner | **Real & Implemented** | Docker `postgres:alpine` | Verified table creation, inserts, and queries via containerized `psql` CLI in `execute_database_query` |
| **A: Persistence** | SQLite Lab & State Synchronization | **Real & Implemented** | `rusqlite` SQLite DB | `list_labs` synchronizes active container/VM states; dead or stopped containers are reconciled to `stopped` |
| **6.2: Full VMs** | QEMU Ubuntu 24.04 Virtual Machine | **Implemented, software emulation** | QEMU + cloud-init | Per-VM QCOW2 overlay disk. Uses TCG software virtualization on hosts without `/dev/kvm`. SSH exit codes distinguished from transport errors. |

---

## Debugging & Fixes Implemented

1. **Frontend Toolchain:** Resolved `rolldown` build failure by using Node v20.20.2 from NVM (supporting `node:util::styleText`).
2. **VPS Runtime Mode:** Corrected hardcoded `runtime_mode = "qemu"` in `commands.rs` when creating and adding components; now defaults to high-performance real Docker container mode with `netlab/ubuntu-vps:24.04`.
3. **State Synchronization:** Added `is_container_running` in `DockerManager` and container readiness check in `start_container`. Reconciled active states in `list_labs` so dead containers are not reported as `running`.
4. **Honest Error Handling:** Eliminated silent fallback to simulation mode in `start_component`. If Docker or QEMU is unavailable for a requested mode, an explicit actionable error is returned.
5. **Gateway Host-Header Forwarding:** Added `host_header` propagation in `gateway.rs::forward_to_port` and `reqwest_stream_fetch` so Nginx receives `Host: shop.test` rather than `Host: 127.0.0.1:port`. Added dynamic HTTP status code extraction.
6. **QEMU SSH Exit Code Handling:** Fixed retry loop in `qemu.rs::exec_command` to check for transport error (`exit_code == 255`) rather than `status.success()`, eliminating 60s hangs on commands returning non-zero exit codes.
7. **UI Real Operations:** Replaced `Math.random()` fake SSH key generation in `VpsManagerView.tsx` with genuine in-container `ssh-keygen` execution. Removed hardcoded mock processes.

---

## Test Verification Summary

### Cargo Backend Test Suite (Rust)
- **Command:** `cargo test -- --nocapture`
- **Result:** `9 passed; 0 failed; 0 ignored; finished in 1.53s`
  - `test_capability_detection ... ok`
  - `test_docker_availability_and_ping ... ok`
  - `test_sqlite_persistence ... ok`
  - `test_simulator_execution ... ok`
  - `test_dns_resolution_and_probe ... ok`
  - `test_gateway_route_registration ... ok`
  - `test_container_failed_startup_behavior ... ok`
  - `test_real_ubuntu_vps_mandatory_commands ... ok`
  - `test_real_nginx_virtual_domain_and_gateway_e2e ... ok`

### Frontend Production Build
- **Command:** `npm run build` (`tsc && vite build`)
- **Result:** Exit code 0, 0 TypeScript errors, bundle generated in 685ms (`dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`).

### Real Container Verification
- Live command execution in `netlab/ubuntu-vps:24.04`:
  - `cat /etc/os-release`: Ubuntu 24.04.5 LTS (Noble Numbat)
  - `whoami`: `root`
  - `pwd`: `/root`
  - `command -v apt`: `/usr/bin/apt`
  - `curl --version`: `curl 8.5.0`
  - `/tmp/netlab-debug/result.txt`: verified `real-runtime-ok`
  - Outbound DNS & Internet: `curl https://raw.githubusercontent.com` and `nvm install` verified working in host network mode (resolved via host resolver, bypassing bridge drop rules).
  - Node.js & npm: Node LTS (`v24.22.0`), npm (`v11.19.1`), and NVM (`v0.40.8`) installed and pre-baked into `netlab/ubuntu-vps:24.04` base image with global system links in `/usr/local/bin`.
  - GitHub SSH: Verified live authentication via `ssh -T git@github.com` returning `Hi IamFreak10! You've successfully authenticated`.
  - Remote Public Access: Live SSH forwarding through Serveo (`serveousercontent.com`) tested and confirmed working from external client (MacBook Air).
  - Terminal Multi-line Paste: Bracketed paste codes sanitized, carriage returns normalized, and multi-line commands executed without buffer accumulation or overwrite.
  - Container Persistence: Existing stopped containers reused on start rather than destroyed, preserving files, keys, and installations.
  - Domain mapping test: `http://shop.test` through gateway returned 200 OK with live HTML; breaking mapping returned 404 NXDOMAIN; restoring returned 200 OK.

---

## Next Concrete Tasks
1. Multi-tenant shared hosting provider lab (Phase 5): PHP-FPM socket separation and per-account document root isolation.
2. Expand guided learning missions (Phase 7) with step-by-step automated backend verification.
