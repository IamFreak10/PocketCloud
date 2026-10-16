# NetLab Architecture & Technical Specification

> **"Your Own Cloud. Your Own Internet. Right on Your PC."**

NetLab is a local, offline-first developer platform combining interactive network simulation, Linux VPS management, multi-tenant shared hosting simulation, DNS infrastructure, and containerized runtime orchestration.

---

## 1. System Architecture Overview

```
+--------------------------------------------------------------------------+
|                           NETLAB DESKTOP UI                              |
|   (React 19, TypeScript, Vite, React Flow, xterm.js, Lucide, Tailwind)   |
+--------------------------------------------------------------------------+
                                     |  Tauri IPC (Commands & Channels)
                                     v
+--------------------------------------------------------------------------+
|                          NETLAB CORE BACKEND                             |
|                        (Rust 2024 / Tauri 2)                             |
|                                                                          |
|  +-----------------------+  +-------------------+  +------------------+  |
|  | Capability Detector   |  | Lab State Manager |  | SQLite Storage   |  |
|  | (Docker, KVM, Mem)    |  | (Lifecycle/CRUD)  |  | (Labs, Settings) |  |
|  +-----------------------+  +-------------------+  +------------------+  |
|                                                                          |
|  +-----------------------+  +-------------------+  +------------------+  |
|  | Host Gateway Bridge   |  | DNS Resolver      |  | Terminal PTY     |  |
|  | (HTTP Reverse Proxy)  |  | (DNS Cache/Zones) |  | (Interactive PTY)|  |
|  +-----------------------+  +-------------------+  +------------------+  |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |                 Runtime Orchestration Layer                        |  |
|  |   - Docker Engine Adapter (bollard / Unix Socket API)             |  |
|  |   - Simulated Runtime Adapter (Deterministic In-Memory Sandbox)    |  |
|  |   - QEMU / KVM Adapter (Hardware Virtualization, Opt-in)           |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
+-----------------------------+             +------------------------------+
|   DOCKER RUNTIME ENGINE     |             |      SIMULATED RUNTIME       |
|  - Isolated Bridge Networks |             |  - Mock FS & Shell           |
|  - Real Linux Containers    |             |  - Mock Virtual Network      |
|  - Nginx, Apache, PHP-FPM   |             |  - Mock Web/DNS/DB Responses |
|  - MySQL, Postgres, Mongo   |             |  - Safe, Zero-Dependency     |
|  - Real Ports & Volumes     |             +------------------------------+
+-----------------------------+
```

---

## 2. Core Subsystems

### 2.1 Capability Detector
Discovers host machine capabilities at startup without blocking:
- **Container Engine**: Detects `/var/run/docker.sock` or Podman socket, verifies ping & version.
- **Virtualization**: Inspects `/dev/kvm`, CPU SVM/VMX flags, QEMU binary path.
- **Host Networking**: Checks available unprivileged ports (`8080`, `8443`, etc.) for the Host Gateway Bridge.
- **Resource Limits**: Reads total and available RAM, CPU count, disk space.

### 2.2 Lab Configuration & Persistence
- Storage: Embedded SQLite (`~/.local/share/netlab/netlab.db`) for app metadata, recent labs, user preferences, and mission achievements.
- Lab Definitions: Versioned JSON files (`lab-definition.v1.json`) for portability and export/import.
- Large artifacts (Docker images, container volumes, VM disks) are kept outside the database in dedicated workspace directories (`~/.local/share/netlab/workspaces/<lab_id>/`).

### 2.3 Runtime Orchestration Layer
- **Container Adapter**: Uses the Docker Engine API directly over the Unix socket (`/var/run/docker.sock`) or named pipe on Windows.
  - Automatically provisions an isolated bridge network per lab (e.g., `netlab_br_<lab_id>` with subnet `10.99.x.0/24`).
  - Restricts container capabilities (`cap_drop: ALL`, adding only `NET_BIND_SERVICE`, `CHOWN`, `SETUID`), enforces memory and CPU limits.
- **Simulated Adapter**: Provides instant zero-overhead simulation when Docker is unavailable or when the user desires lightweight exploration.
- **QEMU/KVM Adapter**: Detects KVM acceleration for full OS virtualization.

### 2.4 Host-Browser Gateway Bridge
Enables host PC browsers to access virtual domains (e.g. `http://shop.netlab.localhost:8080` or via `.localhost` loopback):
- Binds a lightweight local HTTP/HTTPS reverse proxy on `127.0.0.1:<port>`.
- Inspects the incoming `Host` header (e.g., `shop.test`, `api.shop.test`) and maps it to the target container's private IP and port.
- Includes a built-in PAC (Proxy Auto-Configuration) script or direct port forward so the host OS is never modified silently.

### 2.5 Terminal & PTY Streaming
- Real-time bidirectional streaming between `xterm.js` and running containers using Tauri IPC streaming / async event channels.
- Handles ANSI escapes, terminal resize events (`SIGWINCH`), and graceful process termination.

### 2.6 Security & Resource Governance
- Resource Quotas: Default cap of 1GB RAM and 1 CPU per container; maximum lab resource budget configured per user settings.
- Port Safety: Prevents containers from binding directly to `0.0.0.0` on host; all external routing flows through the controlled Host Gateway on loopback.
- Path Traversal Protection: Volume mounts and import/export paths are strictly validated against workspace boundaries.
