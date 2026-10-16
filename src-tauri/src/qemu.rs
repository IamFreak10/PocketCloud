use crate::models::ExecResult;
use std::fs;
use std::fs::OpenOptions;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

/// A real, hardware-isolated Ubuntu VM runtime.  KVM is used when the host
/// grants access to /dev/kvm; QEMU's software accelerator remains a truthful
/// (but slower) fallback when it is not available.
pub struct QemuManager {
    root: PathBuf,
}

impl QemuManager {
    pub fn new() -> Self {
        let root = std::env::var("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(".local/share/netlab/vms");
        Self { root }
    }

    pub fn is_available(&self) -> bool {
        command_exists("qemu-system-x86_64")
            && command_exists("qemu-img")
            && command_exists("cloud-localds")
            && command_exists("ssh")
            && command_exists("ssh-keygen")
            && command_exists("curl")
    }

    pub fn kvm_available(&self) -> bool {
        Path::new("/dev/kvm").exists() && fs::OpenOptions::new().read(true).write(true).open("/dev/kvm").is_ok()
    }

    fn base_image(&self) -> PathBuf { self.root.join("noble-server-cloudimg-amd64.img") }
    fn vm_dir(&self, id: &str) -> PathBuf { self.root.join(id) }

    fn pid_path(&self, id: &str) -> PathBuf { self.vm_dir(id).join("pid") }
    fn identity_path(&self, id: &str) -> PathBuf { self.vm_dir(id).join("netlab_vm_ed25519") }

    fn live_pid(&self, id: &str) -> Option<String> {
        let pid = fs::read_to_string(self.pid_path(id)).ok()?;
        let pid = pid.trim();
        if pid.is_empty() { return None; }
        let alive = Command::new("kill").args(["-0", pid]).status().map(|s| s.success()).unwrap_or(false);
        alive.then(|| pid.to_string())
    }

    pub fn is_running(&self, id: &str) -> bool {
        self.live_pid(id).is_some()
    }

    fn ensure_base_image(&self) -> Result<(), String> {
        fs::create_dir_all(&self.root).map_err(|e| format!("Cannot create VM storage: {e}"))?;
        let image = self.base_image();
        if image.exists() && Command::new("qemu-img").args(["check", image.to_str().unwrap_or_default()]).status().map(|s| s.success()).unwrap_or(false) { return Ok(()); }
        let partial = self.root.join("noble-server-cloudimg-amd64.img.part");
        let _ = fs::remove_file(&partial);
        let status = Command::new("curl")
            .args(["--fail", "--location", "--progress-bar", "--output"])
            .arg(&partial)
            .arg("https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img")
            .status()
            .map_err(|e| format!("Could not start image download: {e}"))?;
        if status.success() && Command::new("qemu-img").args(["check", partial.to_str().unwrap_or_default()]).status().map(|s| s.success()).unwrap_or(false) {
            fs::rename(&partial, &image).map_err(|e| format!("Could not finalize Ubuntu image: {e}"))
        } else {
            let _ = fs::remove_file(&partial);
            Err("Official Ubuntu 24.04 cloud image download failed".to_string())
        }
    }

    pub fn start_vm(&self, id: &str, ssh_port: u16) -> Result<String, String> {
        if !self.is_available() { return Err("QEMU, qemu-img, cloud-localds, and ssh must be installed to run a real VM".to_string()); }
        if let Some(pid) = self.live_pid(id) {
            return Ok(pid);
        }
        // A VM can be stopped externally. Its recorded PID is then stale, but
        // its persistent QCOW2 disk must be kept for the next boot.
        let _ = fs::remove_file(self.pid_path(id));
        self.ensure_base_image()?;
        let dir = self.vm_dir(id);
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let identity = self.identity_path(id);
        if !identity.exists() {
            let status = Command::new("ssh-keygen")
                .args(["-q", "-t", "ed25519", "-N", "", "-f"])
                .arg(&identity)
                .status().map_err(|e| format!("Could not generate VM SSH key: {e}"))?;
            if !status.success() { return Err("Could not generate VM SSH identity".to_string()); }
        }
        let public_key = fs::read_to_string(identity.with_extension("pub"))
            .map_err(|e| format!("Could not read VM SSH public key: {e}"))?;
        let disk = dir.join("disk.qcow2");
        if !disk.exists() {
            let status = Command::new("qemu-img")
                .args(["create", "-f", "qcow2", "-F", "qcow2", "-b"])
                .arg(self.base_image()).arg(&disk).arg("20G")
                .status().map_err(|e| format!("qemu-img failed: {e}"))?;
            if !status.success() { return Err("Could not create VM overlay disk".to_string()); }
        }
        let user_data = dir.join("user-data");
        let meta_data = dir.join("meta-data");
        let seed = dir.join("seed.iso");
        fs::write(&user_data, format!("#cloud-config\nusers:\n  - default\n  - name: netlab\n    groups: [sudo]\n    sudo: ALL=(ALL) NOPASSWD:ALL\n    shell: /bin/bash\n    lock_passwd: false\n    ssh_authorized_keys:\n      - {}\nssh_pwauth: true\npassword_authentication: true\nchpasswd:\n  list: |\n    netlab:netlab123\n  expire: false\npackages: [openssh-server, curl, git, nano, htop]\nruncmd:\n  - systemctl enable --now ssh\n", public_key.trim()))
            .map_err(|e| e.to_string())?;
        fs::write(&meta_data, format!("instance-id: {id}\nlocal-hostname: netlab-ubuntu\n")).map_err(|e| e.to_string())?;
        let status = Command::new("cloud-localds").arg(&seed).arg(&user_data).arg(&meta_data).status().map_err(|e| format!("cloud-localds failed: {e}"))?;
        if !status.success() { return Err("Could not create cloud-init seed disk".to_string()); }

        let log = OpenOptions::new().create(true).append(true).open(dir.join("qemu.log")).map_err(|e| e.to_string())?;
        let mut args = vec!["-name".to_string(), format!("netlab-{id}"), "-m".to_string(), "1024".to_string(), "-smp".to_string(), "2".to_string(), "-drive".to_string(), format!("file={},if=virtio,format=qcow2", disk.display()), "-drive".to_string(), format!("file={},media=cdrom,readonly=on", seed.display()), "-netdev".to_string(), format!("user,id=net0,hostfwd=tcp:127.0.0.1:{ssh_port}-:22"), "-device".to_string(), "virtio-net-pci,netdev=net0".to_string(), "-nographic".to_string(), "-display".to_string(), "none".to_string(), "-serial".to_string(), "none".to_string()];
        if self.kvm_available() { args.push("-enable-kvm".to_string()); }
        let child = Command::new("qemu-system-x86_64").args(args).stdin(Stdio::null()).stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?)).stderr(Stdio::from(log)).spawn().map_err(|e| format!("Could not launch QEMU: {e}"))?;
        fs::write(self.pid_path(id), child.id().to_string()).map_err(|e| e.to_string())?;
        Ok(child.id().to_string())
    }

    pub fn stop_vm(&self, id: &str) -> Result<(), String> {
        let Some(pid) = self.live_pid(id) else {
            let _ = fs::remove_file(self.pid_path(id));
            return Ok(());
        };
        let status = Command::new("kill").arg(&pid).status().map_err(|e| e.to_string())?;
        if !status.success() { return Err("Could not stop VM process".to_string()); }
        for _ in 0..30 {
            if self.live_pid(id).is_none() {
                let _ = fs::remove_file(self.pid_path(id));
                return Ok(());
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        Err("VM is still shutting down; wait a few seconds before starting it again".to_string())
    }

    pub async fn exec_command(&self, id: &str, port: u16, command: &str, cwd: &str) -> Result<ExecResult, String> {
        let script = format!("cd '{}' 2>/dev/null || cd /home/netlab; {}; code=$?; echo; echo __NETLAB_CWD__:$(pwd); exit $code", shell_quote(cwd), command);
        let identity = self.identity_path(id);
        let mut output = None;
        for _ in 0..12 {
            let candidate = tokio::process::Command::new("ssh")
                .arg("-i").arg(&identity)
                .args(["-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-o", "ConnectTimeout=5", "-p", &port.to_string(), "netlab@127.0.0.1", "bash", "-lc", &script])
                .output().await.map_err(|e| format!("SSH failed: {e}"))?;
            // Exit code 255 indicates SSH transport error / connection refused while VM is booting
            if candidate.status.code() != Some(255) {
                output = Some(candidate);
                break;
            }
            output = Some(candidate);
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
        }
        let output = output.ok_or("VM did not produce an SSH result")?;
        let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let mut result_cwd = cwd.to_string();
        if let Some(pos) = stdout.find("__NETLAB_CWD__:") { let marker = stdout[pos..].lines().next().unwrap_or(""); result_cwd = marker.trim_start_matches("__NETLAB_CWD__:").trim().to_string(); stdout.truncate(pos); }
        Ok(ExecResult { exit_code: output.status.code().unwrap_or(1) as i64, stdout: stdout.trim_end().to_string(), stderr: String::from_utf8_lossy(&output.stderr).to_string(), cwd: Some(result_cwd) })
    }
}

fn command_exists(command: &str) -> bool { Command::new("sh").arg("-c").arg(format!("command -v {command} >/dev/null 2>&1")).status().map(|s| s.success()).unwrap_or(false) }
fn shell_quote(value: &str) -> String { value.replace('\'', "'\\''") }
