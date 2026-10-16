# NetLab Project Status

**Current Version:** 0.1.0-alpha  
**Date:** 2026-10-16  
**Platform Target:** Ubuntu/Debian Linux & Windows 10/11  
**Current Host:** Ubuntu 24.04.5 LTS (Noble Numbat), AMD Ryzen 7 5700G (16 vCPUs), 16GB RAM, ~208GB NVMe  
**Application State:** Desktop App running + Vite Web UI at `http://localhost:1420/` + Host Gateway at `http://127.0.0.1:18080/`

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
| **C: VPS Control Suite** | Complete Ubuntu 24.04 VPS Management Suite | **Real & Implemented** | Docker `netlab/ubuntu-vps:24.04` & Alpine | Pre-built full Ubuntu 24.04 image with Git, Curl, Python3, OpenSSH Server, and Web Root (`/var/www/html`); 6-tab VPS Control Suite (`VpsManagerView.tsx`): Ubuntu Console, 1-Click Software Store (Nginx, Node 20, Python), File Explorer with Live Code Editor, Process Manager (`ps aux`), Network Ports & SSH (`127.0.0.1:18022`), and GitHub Auto-Deployer |
| **C: VPS & Terminal** | In-Memory Virtual Shell Fallback | **Simulated** | Rust In-Memory VFS | Automated test `test_simulator_execution` verifies virtual command parsing and directory tracking for non-Docker hosts |
| **E: Web Servers** | Nginx Container & Live VirtualHosts | **Real & Implemented** | Docker `nginx:alpine` | Container booted on port 18081/18092; automated test verified live syntax check via `nginx -t` and reload via `nginx -s reload` |
| **E: Web Servers** | Syntax Validation (`nginx -t`) | **Real & Implemented** | Live Container CLI | `validate_and_reload_nginx` writes `/etc/nginx/nginx.conf` or `/etc/nginx/conf.d/default.conf` and captures real stdout/stderr |
| **I: Virtual DNS** | Authoritative Virtual DNS Engine | **Real & Implemented** | Rust `DnsEngine` + Axum | `test_dns_resolution_and_probe`: resolves A and CNAME records (e.g. `shop.test -> 127.0.0.1:18081`), returns authoritative answers, handles TTL and NXDOMAIN |
| **J: Built-in Browser** | Integrated Browser with Network Inspector | **Real & Implemented** | React + Gateway Iframe | `BuiltinBrowserView.tsx`: address bar (`http://shop.test`), Host header injection, DNS resolution path, response headers, timing (ms), and failure diagnostics |
| **L: Network Tester** | Worldwide Network Diagnostics | **Real & Implemented** | Rust Probe + React | `NetworkTesterView.tsx`: probes target URL, resolves virtual DNS, checks TCP socket reachability, measures latency, inspects HTTP status & headers, explains root causes |
| **H: Databases** | PostgreSQL 16 Instance & SQL Runner | **Real & Implemented** | Docker `postgres:alpine` | Verified `CREATE TABLE`, `INSERT`, `SELECT` via containerized `psql` CLI in `execute_database_query`; displays real rows, execution time, and error messages |
| **A: Persistence** | SQLite Lab & Component State | **Real & Implemented** | `rusqlite` SQLite DB | `test_sqlite_persistence`: verifies persistence of labs, components, and routes across app restarts |
| **F: Shared Hosting** | Multi-tenant customer accounts | Planned / Partial | Docker | Account separation UI designed; multi-tenant vhost isolation in progress |
| **6.2: Full VMs** | QEMU/KVM Virtual Machine Boot | Planned / Blocked | Host Linux | Unprivileged user lacks direct `/dev/kvm` write permissions without sudo `modprobe kvm_amd`; containers act as primary engine |

---

## Test Verification Summary

### Cargo Backend Test Suite (Rust)
- **Command:** `cargo test -- --nocapture`
- **Result:** `6 passed; 0 failed; 0 ignored; finished in 11.92s`
  - `test_capability_detection ... ok`
  - `test_sqlite_persistence ... ok`
  - `test_simulator_execution ... ok`
  - `test_dns_resolution_and_probe ... ok`
  - `test_gateway_route_registration ... ok`
  - `test_real_docker_vps_and_nginx_e2e ... ok` (Real container lifecycle, shell operations, file I/O, Nginx syntax check & reload)

### Frontend Production Build
- **Command:** `npm run build` (`tsc && vite build`)
- **Result:** Exit code 0, 0 TypeScript errors, bundle generated in 577ms (`dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`).

---

## Priority Next Steps
1. Implement Phase 5: Multi-tenant shared hosting provider lab (isolated document roots per account, PHP-FPM socket separation, customer quota enforcement).
2. Expand Phase 7: Guided learning missions with automated backend verification for the complete workflow (Install Nginx -> deploy `shop.test` -> test built-in browser -> run database query).
