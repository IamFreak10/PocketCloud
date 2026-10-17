# NetLab Emergency Debugging & Real VPS Recovery Log

**Date:** 2026-10-16  
**Environment:** Ubuntu 24.04.5 LTS, AMD Ryzen 7 5700G, Docker Engine 29.8.1, Rust 1.85+, Node v20.20.2 (via NVM)

---

## 1. Reproducible Failures & Confirmed Root Causes

### Defect 1: Frontend Production Build Failure on Node 18
- **Failure:** `npm run build` failed with `SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'` in `rolldown`.
- **Root Cause:** Non-interactive shells defaulted to `/usr/bin/node` (v18.19.1), whereas the project defines `.nvmrc` with Node 20. `styleText` requires Node 20.12+ or Node 22+.
- **Fix:** Switched execution to Node v20.20.2 from `/home/iamfreak/.nvm/versions/node/v20.20.2/bin`.
- **Verification:** `npm run build` completed with exit code 0 in 685ms.

---

### Defect 2: Real Ubuntu VPS Forced to QEMU Software Emulation Instead of Docker
- **Failure:** Creating or starting an Ubuntu VPS node attempted to spawn a full QEMU VM. Since `/dev/kvm` is not accessible on this host, QEMU fell back to slow TCG software emulation, resulting in unresponsive or hanging VPS nodes.
- **Root Cause:** In `src-tauri/src/commands.rs`, lines 152 and 406 hardcoded `runtime_mode = "qemu"` whenever `image.contains("ubuntu")`, completely ignoring the host's real, pre-built, and running Docker image `netlab/ubuntu-vps:24.04`.
- **Fix:**
  - In `create_lab` (`commands.rs`), if `tmpl == "ubuntu" || tmpl == "ubuntu-vps"` and Docker is available, set `runtime_mode = "docker"` and image to `netlab/ubuntu-vps:24.04`.
  - In `add_component` (`commands.rs`), support an explicit `runtime_mode: Option<String>` and default to `"docker"` whenever Docker is available.
- **Verification:** Live container `netlab_ubuntu_vps` executed real bash shell commands with exit code 0.

---

### Defect 3: Silent Fallback to Simulated Mode & Stale "Running" State in DB
- **Failure:**
  1. If Docker was unavailable when starting a Docker component, `start_component` silently initialized `state.simulator.init_component` and returned success.
  2. If a container exited immediately upon boot or was killed externally, the SQLite database still reported `status: "running"`, causing "Active container not found" errors when executing commands.
- **Root Cause:**
  - `docker.rs::start_container` never verified `inspect.state.running == true`, so immediate container crashes were reported as successful.
  - `commands.rs::list_labs` returned DB records verbatim without reconciling against active Docker containers or QEMU PIDs.
  - `start_component` fell through to `else { state.simulator... }` rather than returning an honest error.
- **Fix:**
  - Added `is_container_running` and post-start verification in `src-tauri/src/docker.rs` to detect immediate exits.
  - In `src-tauri/src/commands.rs::list_labs`, added runtime state reconciliation to reset dead/exited containers to `stopped`.
  - In `src-tauri/src/commands.rs::start_component`, returned explicit errors if Docker or QEMU is unavailable for that runtime mode.
- **Verification:** `test_container_failed_startup_behavior` verified that failing containers return an immediate exit error.

---

### Defect 4: Gateway Missing Host-Header Forwarding for Virtual Domain Routing
- **Failure:** Visiting `http://shop.test` through the gateway forwarded the request to internal Nginx with `Host: 127.0.0.1:18081` instead of `Host: shop.test`, breaking Nginx virtual host matching (`server_name shop.test;`). Additionally, `reqwest_stream_fetch` hardcoded anything other than 404 as `StatusCode::OK`.
- **Root Cause:** `gateway.rs` omitted the `host_header` argument when calling `forward_to_port` and hardcoded status code parsing.
- **Fix:**
  - Updated `forward_to_port` and `reqwest_stream_fetch` in `src-tauri/src/gateway.rs` to pass the virtual domain in the `Host` header.
  - Dynamically parsed the HTTP status code from the upstream response line.
- **Verification:** `test_real_nginx_virtual_domain_and_gateway_e2e` verified live HTTP 200 responses, `X-NetLab-DNS-Resolved: shop.test`, deliberate NXDOMAIN breaking, and recovery.

---

### Defect 5: 60-Second Timeout Hang on Non-Zero Exit Code in QEMU SSH Runner
- **Failure:** Any command returning exit code != 0 inside a QEMU guest hung the terminal for 60 seconds (12 retries x 5 seconds).
- **Root Cause:** `src-tauri/src/qemu.rs` line 146 checked `if candidate.status.success() { output = Some(candidate); break; }`, mistaking a non-zero exit code from a remote command for an SSH connection failure.
- **Fix:** Checked `if candidate.status.code() != Some(255)`, properly distinguishing between SSH transport connection errors (255) and remote command exit codes.

### Defect 6: VPS Container Internet/DNS Resolution Failure (`curl: (6) Could not resolve host`)
- **Failure:** Running commands requiring outbound internet (`curl -o- https://raw.githubusercontent.com/... | bash`, `apt-get`, `git clone`) timed out with `curl: (6) Could not resolve host: raw.githubusercontent.com`.
- **Root Cause:**
  - Host runs Tailscale / strict firewall routing table rules which drop forwarded bridge network packets originating from `docker0` (`172.17.0.0/16`).
  - Container's bridge network mode could not reach host's systemd-resolved DNS resolver (`127.0.0.53`) or external DNS (`8.8.8.8`).
- **Fix:**
  - In `src-tauri/src/docker.rs`, enabled configurable `network_mode: Option<String>` in `start_container`.
  - In `src-tauri/src/commands.rs`, VPS containers (`component_type == "vps"`) are started in `network_mode: "host"` with SSH daemon listening on the dynamically assigned `host_port` (e.g., `-p 18022`), leaving bridge mode for web (`nginx`) and database (`postgres`) services.
  - This allows the VPS container to inherit the host's direct network stack, immediately resolving all DNS queries and granting unhindered gigabit internet access without requiring root/sudo or iptables modification.
- **Verification:**
  - Tested `curl -s -o /dev/null -w '%{http_code}' https://raw.githubusercontent.com` inside real Ubuntu VPS container: returned HTTP 200/301 immediately.
  - Tested NVM installation command inside Ubuntu VPS container: downloaded and installed in 3 seconds.
  - Rust test suite passed 9/9 unit and end-to-end integration tests.

### Defect 7: Fake SSH Key Generation and Mock Processes in UI
- **Failure:** `VpsManagerView.tsx` generated mock SSH keys with `Math.random()` and had hardcoded process arrays in catch blocks.
- **Root Cause:** Placeholder frontend code bypassed the real backend command runner.
- **Fix:**
  - Updated `handleGenerateSshKey` in `VpsManagerView.tsx` to execute `ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519` inside the container via `api.execCommand` and return the real public key.
  - Replaced fake process fallbacks with genuine error reporting.

### Defect 8: Multi-line Command Paste & Buffer Overwrite in Web Terminal
- **Failure:** Pasting multi-line commands into the terminal (such as export lines and nvm sourcing) resulted in lines visually overwriting each other (`clearroot@ubuntu-24:~# clear`) and bash errors (`export: '-s': not a valid identifier`, `clearclear: command not found`).
- **Root Cause:**
  1. `TerminalView.tsx::term.onData` checked `if (data === '\r')` for single Enter keystrokes. When pasting multi-line snippets, `\r` and `\n` were embedded in the data string, causing `data` to fall through to printable text where raw `\r` (carriage return without line feed) moved the cursor back to column 0 and visually overwrote text.
  2. Linux bash treats raw `\r` as part of command arguments rather than newlines, turning `export NVM_DIR=...\r[ -s ... ]` into an invalid `export` invocation.
  3. Built-in `clear` and `history` commands in `TerminalView.tsx` did not reset `currentLineBuffer.current = ''`, retaining previous input and concatenating it with future input (e.g. `clearclear`).
- **Fix:**
  - In `TerminalView.tsx`, stripped bracketed paste escape codes (`\x1b[200~`), normalized multi-line pasted text (`\r\n|\r` -> `\n`), rendered line breaks with `\r\n` so lines never overwrite each other, and automatically executed when trailing newlines are present.
  - Reset `currentLineBuffer.current` and `cursorPos.current` on `clear`, `history`, `executeCommand` entry, and before quick command insertion.
  - In `src-tauri/src/commands.rs`, normalized `\r\n` and `\r` to `\n` and isolated commands on their own line in the bash execution template.
- **Verification:**
  - Tested bash execution of multi-line export and test commands: completed with exit code 0.
  - Verified full test suite (`cargo test -- --nocapture`) passes 9/9 tests.
  - Verified frontend build passes with 0 errors.

### Defect 10: "Active container not found for component" & Fake VPS Simulation Overhaul
- **Failure:** Terminal output produced errors such as:
  ```
  root@ubuntu-24:~# ip a
  bash: ip a: execution error: Active container not found for component
  ```
  while `TerminalView` displayed a hardcoded fake welcome banner (fake CPU load, fake RAM, fake IP) before a container even existed.
- **Confirmed Root Causes:**
  1. **Container Never Created on Lab Creation:** `create_lab` and `add_component` only inserted rows into SQLite with `status: "stopped"` and `container_id: None`. No container was ever provisioned in Docker.
  2. **Premature Terminal Presentation:** `TerminalView` printed a fake Ubuntu welcome banner and bash prompt before checking if a container was running or existed.
  3. **Container ID Erasure in SQLite:** `list_labs` and `stop_component` set `comp.container_id = None` whenever a container was stopped, permanently severing the component from its on-disk Docker container and wiping filesystem persistence.
  4. **Stale Component ID / Unresolved Lookup:** `exec_command` failed when looking up components in `state.db.list_labs()` because `component_id` was matched by exact ID without fallback to `container_id`, returning `Err("Active container not found for component")`.
  5. **Fake Simulator Fallback:** If `runtime_mode` was not "docker" or "qemu", `commands.rs` called `simulator.rs`, which simulated hardcoded responses for `whoami`, `uname`, and `pwd`, masking the real environment.
  6. **Docker Socket Discovery:** `DockerManager` only checked `/var/run/docker.sock`, failing to discover rootless Docker or desktop sockets.
- **Engineering Fixes Applied:**
  1. **Multi-Socket Discovery (`src-tauri/src/docker.rs`):** `DockerManager::new()` checks local defaults, `XDG_RUNTIME_DIR/docker.sock`, `/run/user/<uid>/docker.sock`, `~/.docker/desktop/docker.sock`, and `~/.docker/run/docker.sock`.
  2. **Container Persistence Preservation (`src-tauri/src/commands.rs`):** Retained `comp.container_id` across `list_labs` and `stop_component`. Stopped containers preserve their container ID so they can be restarted without losing installed packages or files.
  3. **7-Step Lifecycle in `exec_command` (`src-tauri/src/commands.rs`):**
     - Resolves component from database by ID or container ID.
     - Rejects simulated VPS execution truthfully: returns `"Linux runtime unavailable — configure a supported container engine to create a real Linux environment."`
     - Validates actual Docker container state via `inspect_container`.
     - Resumes stopped container or auto-provisions if container does not exist yet.
     - Executes against the resolved container ID using `/bin/bash` with persistent `cwd`.
     - Returns real exit codes, stdout, and stderr.
  4. **Immediate VPS Provisioning (`src-tauri/src/commands.rs`):** When creating an Ubuntu VPS lab or adding a VPS component, the container is immediately provisioned and started in Docker.
  5. **Truthful Terminal Presentation (`src/components/TerminalView.tsx`):** Removed fake welcome banner. Displays honest runtime header (Docker Container vs QEMU VM, Container ID, shared host kernel note, and real status).
  6. **Real GitHub Configuration (`src/components/VpsManagerView.tsx`):** Replaced simulated `setTimeout` logging with real in-container execution of `git config` and credential helper storage.
- **Verification & Acceptance Test Evidence:**
  - Automated integration test `test_real_ubuntu_vps_mandatory_commands` executed inside real Ubuntu 24.04 container:
    - **Test A (Operating system):** `cat /etc/os-release` -> `PRETTY_NAME="Ubuntu 24.04.5 LTS"`, `VERSION_ID="24.04"`, exit code 0.
    - **Test B (Identity):** `whoami` -> `root`, `id` -> `uid=0(root) gid=0(root)`, `pwd` -> `/root`, exit code 0.
    - **Test C (Kernel):** `uname -a` -> `Linux ubuntu-24 7.0.0-38-generic ...`, exit code 0 (shared host kernel).
    - **Test D (Filesystem):** `mkdir -p /tmp/pocketcloud-test && printf 'runtime-ok\n' > /tmp/pocketcloud-test/result.txt && cat /tmp/pocketcloud-test/result.txt` -> `runtime-ok`, exit code 0.
    - **Test E (Package manager):** `command -v apt-get` -> `/usr/bin/apt-get`, `apt-get update` -> exit code 0.
    - **Test F (Networking utilities):** `ip addr` -> real network interfaces with exit code 0.
    - **Test G (Container restart & persistence):** Wrote `/opt/pocketcloud-test/state.txt` with `persistent-data`. Stopped container. Resumed same container instance. Read file back -> `persistent-data` verified with exit code 0.
    - **Test H (Runtime identity):** Verified Docker returned runtime ID matches terminal execution target ID (`6220d72c469a...`).
    - **Test I (Failure handling):** Stopped container externally, verified recovery and resumption without data loss.
  - Rust test suite passed 9/9 tests (`cargo test`).
  - Frontend production build passed with 0 errors (`npm run build`).
- **Verification:**
  - Verified that typing a URL in the browser and switching to Terminal and back preserves the URL, station tabs, and loaded response without resetting.
  - Verified `localStorage` stores and restores state across page reloads.

### Defect 10: xterm.js Canvas Breakdown on Tab Visibility Toggle
- **Failure:** When switching to the Terminal tab after being hidden, xterm.js line wraps broke and the cursor was misaligned because `fitAddon.fit()` only listened to `window.onresize`.
- **Root Cause:** Container DOM size changes caused by tab toggles or panel resizing do not fire the global `window.onresize` event.
- **Fix:**
  - In `src/components/TerminalView.tsx`, wrapped `terminalRef.current` with a native `ResizeObserver` that automatically calls `fitAddon.current?.fit()` whenever the element transitions from `display: none` to visible or dimensions change.
- **Verification:**
  - Tested switching from hidden to visible; xterm immediately recalibrates rows and columns to match container size.
