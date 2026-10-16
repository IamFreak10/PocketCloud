# 🗺️ PocketCloud — Roadmap, Known Challenges & Community Issues

This document outlines the real, architectural challenges and planned enhancements for **PocketCloud**. If you're a developer or open-source contributor interested in systems programming, networking, Rust, or React, these issues are ready for you to pick up!

---

## 📌 Curated Issues Ready for Contribution

### Issue #1: Implement True PTY (Pseudo-Terminal) for Interactive Web Terminal
- **Category:** `Terminal`, `Rust`, `Docker`, `xterm.js`
- **Labels:** `enhancement`, `help wanted`, `priority: high`
- **Problem Statement:**
  Currently, container shell execution in [docker.rs](src-tauri/src/docker.rs) runs non-interactively via `bash -c <command>`. Full-screen, curses-based interactive programs such as `nano`, `vim`, `htop`, and interactive `ssh` prompts fail with:
  ```text
  Standard input is not a terminal
  ```
- **Proposed Architecture:**
  1. Allocate a real interactive PTY session via Docker Engine (`AttachStdin: true`, `AttachStdout: true`, `Tty: true`).
  2. Implement a streaming bi-directional WebSocket or Tauri event channel bridging raw bytes between `xterm.js` on the React frontend ([TerminalView.tsx](src/components/TerminalView.tsx)) and the PTY stream in Rust.
  3. Support window resizing (`SIGWINCH` terminal resize events).
- **Files Involved:**
  - `src-tauri/src/docker.rs` (exec stream handling)
  - `src-tauri/src/commands.rs` (terminal stream IPC command)
  - `src/components/TerminalView.tsx` (xterm.js integration)

---

### Issue #2: Host Port Collision Detection & Dynamic Bridge Fallback
- **Category:** `Networking`, `Docker`
- **Labels:** `bug`, `networking`, `good first issue`
- **Problem Statement:**
  PocketCloud's Full VPS currently runs in Docker Host Network Mode (`--net=host`) for maximum performance. However, if the user's host workstation already has Apache or another web service running on port `80` (or PostgreSQL on `5432`), Nginx inside the container fails to bind:
  ```text
  [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
  ```
- **Proposed Architecture:**
  1. Implement a pre-flight port collision probe in [docker.rs](src-tauri/src/docker.rs) before starting services.
  2. If port 80 is occupied on the host, provide an automatic fallback toggle (e.g. automatically bind Nginx to port 8080 or launch the container in bridge mode with custom port mapping).
  3. Expose a notification in the UI alerting the user to host port conflicts.
- **Files Involved:**
  - `src-tauri/src/docker.rs`
  - `src/components/VpsManagerView.tsx`

---

### Issue #3: Ignore Self-Signed SSL Certificates in Built-in Browser
- **Category:** `Gateway`, `Browser`, `Rust`
- **Labels:** `bug`, `good first issue`, `gateway`
- **Problem Statement:**
  When testing microservices or local web applications with self-signed SSL certificates (`https://`), the Built-in Dev Browser's proxy gateway ([gateway.rs](src-tauri/src/gateway.rs)) rejects connections with TLS validation errors.
- **Proposed Architecture:**
  Configure the internal Reqwest HTTP client in `gateway.rs` to allow self-signed certificates in local lab environments:
  ```rust
  reqwest::Client::builder()
      .danger_accept_invalid_certs(true)
      .build()?;
  ```
  Add a visual indicator in the browser toolbar showing "Local Self-Signed SSL".
- **Files Involved:**
  - `src-tauri/src/gateway.rs`
  - `src/components/BuiltinBrowserView.tsx`

---

### Issue #4: Adaptive Cross-Platform Docker Socket Discovery (macOS & Windows WSL2)
- **Category:** `Cross-Platform`, `Docker`, `Rust`
- **Labels:** `enhancement`, `cross-platform`, `good first issue`
- **Problem Statement:**
  PocketCloud currently defaults to the standard Linux Docker socket at `/var/run/docker.sock`. On macOS with Docker Desktop or Colima (`~/.docker/run/docker.sock`), and on Windows (`//./pipe/docker_engine`), Docker initialization may fail if the socket path differs.
- **Proposed Architecture:**
  Implement adaptive socket path resolution in [docker.rs](src-tauri/src/docker.rs):
  - Check `DOCKER_HOST` environment variable first.
  - Probe standard OS-specific paths sequentially:
    - Linux: `/var/run/docker.sock`
    - macOS: `~/.docker/run/docker.sock` / `/var/run/docker.sock`
    - Windows: `//./pipe/docker_engine`
- **Files Involved:**
  - `src-tauri/src/docker.rs`

---

### Issue #5: Isolated Multi-Node Lab Bridge Networks
- **Category:** `Networking`, `Docker`, `Architecture`
- **Labels:** `enhancement`, `architecture`, `help wanted`
- **Problem Statement:**
  When deploying multi-node topologies (e.g., VPS node + isolated PostgreSQL container + Redis cache), nodes communicate over host loopback rather than a private, isolated Docker bridge network.
- **Proposed Architecture:**
  1. Dynamically create a dedicated bridge network per lab (e.g. `pocketcloud_net_<lab_id>` with subnet `10.99.x.0/24`).
  2. Connect all lab containers to this private network so they can resolve each other by container name / hostname.
- **Files Involved:**
  - `src-tauri/src/docker.rs`
  - `src-tauri/src/commands.rs`
  - `src/types.ts`

---

### Issue #6: Terminal Log Buffer Memory Ring Cap
- **Category:** `Performance`, `Frontend`, `React`
- **Labels:** `performance`, `frontend`, `good first issue`
- **Problem Statement:**
  When streaming verbose long-running logs (e.g. `npm install`, `tail -f /var/log/syslog`, or `pm2 logs`), lines accumulate indefinitely in React state, increasing DOM nodes and causing browser UI lag.
- **Proposed Architecture:**
  1. Implement a ring buffer or maximum line cap (e.g., retaining the latest 2,500 lines) in [TerminalView.tsx](src/components/TerminalView.tsx).
  2. Add an optional "Clear Screen" or "Download Full Log" action.
- **Files Involved:**
  - `src/components/TerminalView.tsx`

---

### Issue #7: 1-Click Lab Topology Export & Share (.pocketcloud archive)
- **Category:** `Feature`, `Database`, `DX`
- **Labels:** `feature`, `persistence`
- **Problem Statement:**
  Developers cannot currently bundle and share their configured lab environments with colleagues as an exportable package.
- **Proposed Architecture:**
  1. Create an export command that dumps the lab's SQLite metadata, Nginx virtual host configurations, and container startup recipes into a `.pocketcloud` JSON/tarball file.
  2. Provide an "Import Lab" button in the Dashboard to instantly recreate the entire multi-service environment on another machine.
- **Files Involved:**
  - `src-tauri/src/commands.rs`
  - `src-tauri/src/db.rs`
  - `src/components/DashboardView.tsx`

---

## 💡 How to Submit a Solution
Found an issue you'd like to tackle?
1. Open an issue on GitHub referencing the issue number above.
2. Fork the repository and follow our [CONTRIBUTING.md](CONTRIBUTING.md) guide.
3. Submit a Pull Request! We review and merge active contributions promptly.
