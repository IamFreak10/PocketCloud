# NetLab Architecture Decision Records (ADR)

## ADR 001: Desktop Framework Selection - Tauri 2 with React 19 & TypeScript
- **Status**: Accepted
- **Context**: Need a cross-platform desktop application that is resource-efficient, has low memory footprint on a 16GB RAM machine, and provides native OS integration (Rust) alongside a rich interactive web UI.
- **Decision**: Tauri 2 is chosen over Electron. Tauri 2 uses the system webview (WebKitGTK on Linux, WebView2 on Windows) consuming ~30-50MB RAM compared to Electron's ~150-250MB baseline. The backend is written in Rust for high-performance orchestration and async runtime operations.

## ADR 002: Dual-Mode Runtime Strategy (Real Containers + Deterministic Simulator)
- **Status**: Accepted
- **Context**: Users have diverse machines: some have Docker running smoothly, while others might lack rootless Docker or have virtualization disabled in BIOS.
- **Decision**: Implement a decoupled runtime adapter interface:
  1. `DockerRuntime`: Leverages Docker Engine API for real isolated Linux environments (Alpine, Ubuntu, Nginx, Apache, Node, PHP-FPM, Postgres, MySQL, Mongo).
  2. `SimulatedRuntime`: Zero-overhead deterministic in-memory simulator that models filesystem, bash commands, networking, and DNS responses for learning missions without Docker dependency.
- **Consequence**: The UI explicitly flags whether each component is running in Real Container Mode or Simulated Mode.

## ADR 003: Safe Host-Browser Gateway Bridge
- **Status**: Accepted
- **Context**: The user's host browser must access virtual domains (e.g. `shop.test`, `app.netlab.localhost`) without modifying system `/etc/hosts` silently or requiring root privileges.
- **Decision**: Implement a loopback HTTP reverse proxy on `127.0.0.1:<gateway_port>` (default `18080`). RFC 6761 guarantees that `*.localhost` resolves to `127.0.0.1` on modern browsers and OSes without `/etc/hosts` changes. NetLab routes `http://<domain>.localhost:18080` or matches `Host` headers to virtual container IPs.

## ADR 004: State Storage and Lab Definitions
- **Status**: Accepted
- **Context**: Labs must be saveable, exportable, duplicable, and recoverable across NetLab restarts.
- **Decision**: Use SQLite for metadata and persistent app state (recent labs, telemetry, mission progress), and self-contained versioned JSON (`.netlab` archive or `.json`) for lab configuration and topology schemas. Container volumes and disk images reside in dedicated filesystem directories.

## ADR 005: Built-in Browser Architecture & Host Gateway Integration
- **Status**: Accepted
- **Context**: Users require an in-app browser to visit fake domains (e.g. `shop.test`, `api.shop.test`) hosted on NetLab containers without editing `/etc/hosts` or changing system DNS.
- **Decision**: An embedded browser viewport backed by the loopback reverse proxy on `127.0.0.1:18080/browse?url=<target>`. The gateway resolves the host via the internal `DnsEngine`, sets appropriate CORS headers, injects diagnostic metadata (`X-NetLab-DNS-Resolved`, `X-NetLab-Target-Port`), and streams live container HTML. The bottom Network Inspector displays HTTP status, latency, response headers, and root-cause failure guidance (NXDOMAIN, 502).

## ADR 006: Containerized Nginx Syntax Validation (`nginx -t`) & Live Reloading
- **Status**: Accepted
- **Context**: Users need to write, test, and troubleshoot real Nginx configurations with honest feedback rather than fake mock responses.
- **Decision**: NetLab detects whether user configuration represents a full `nginx.conf` or a virtual host block (`server { ... }`), writes it directly into the running container, executes `nginx -t`, and reloads the service via `nginx -s reload`. Any syntax errors, missing semicolons, or invalid directives return actual container stderr directly to the UI.

