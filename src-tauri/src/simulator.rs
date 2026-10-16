use crate::models::ExecResult;
use std::collections::HashMap;
use std::sync::Mutex;

pub struct Simulator {
    filesystems: Mutex<HashMap<String, HashMap<String, String>>>, // component_id -> (filepath -> content)
    cwds: Mutex<HashMap<String, String>>,                        // component_id -> current_dir
}

impl Simulator {
    pub fn new() -> Self {
        Simulator {
            filesystems: Mutex::new(HashMap::new()),
            cwds: Mutex::new(HashMap::new()),
        }
    }

    pub fn init_component(&self, component_id: &str, comp_type: &str) {
        let mut fs_map = self.filesystems.lock().unwrap();
        let mut files = HashMap::new();

        files.insert("/etc/hostname".to_string(), format!("netlab-{}", component_id));
        files.insert("/etc/os-release".to_string(), "NAME=\"Alpine Linux\"\nID=alpine\nVERSION_ID=3.20.0\nPRETTY_NAME=\"Alpine Linux v3.20 (Simulated)\"".to_string());
        files.insert("/etc/resolv.conf".to_string(), "nameserver 10.99.0.1\nsearch netlab.local".to_string());

        if comp_type == "web" {
            files.insert(
                "/var/www/html/index.html".to_string(),
                "<!DOCTYPE html><html><body><h1>Welcome to NetLab Web Server!</h1><p>Running on simulated port 80</p></body></html>".to_string(),
            );
            files.insert(
                "/etc/nginx/nginx.conf".to_string(),
                "server {\n    listen 80;\n    server_name localhost;\n    root /var/www/html;\n}".to_string(),
            );
        }

        fs_map.insert(component_id.to_string(), files);
        self.cwds.lock().unwrap().insert(component_id.to_string(), "/root".to_string());
    }

    pub fn exec_command(&self, component_id: &str, cmd: &[&str]) -> ExecResult {
        let cmd_str = cmd.join(" ");
        self.exec_command_with_cwd(component_id, &cmd_str, "/root")
    }

    pub fn exec_command_with_cwd(&self, component_id: &str, command: &str, initial_cwd: &str) -> ExecResult {
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            return ExecResult {
                exit_code: 0,
                stdout: String::new(),
                stderr: String::new(),
                cwd: Some(initial_cwd.to_string()),
            };
        }

        let main_cmd = parts[0];
        let mut cwds = self.cwds.lock().unwrap();
        let current_dir = cwds.entry(component_id.to_string()).or_insert_with(|| initial_cwd.to_string());
        let mut fs_map = self.filesystems.lock().unwrap();
        let files = fs_map.entry(component_id.to_string()).or_default();

        match main_cmd {
            "cd" => {
                let target = if parts.len() > 1 { parts[1] } else { "/root" };
                let new_dir = if target == "~" || target.is_empty() {
                    "/root".to_string()
                } else if target == "/" {
                    "/".to_string()
                } else if target == ".." {
                    if current_dir == "/" {
                        "/".to_string()
                    } else {
                        let mut segments: Vec<&str> = current_dir.split('/').filter(|s| !s.is_empty()).collect();
                        segments.pop();
                        if segments.is_empty() {
                            "/".to_string()
                        } else {
                            format!("/{}", segments.join("/"))
                        }
                    }
                } else if target.starts_with('/') {
                    target.to_string()
                } else {
                    if current_dir == "/" {
                        format!("/{}", target)
                    } else {
                        format!("{}/{}", current_dir, target)
                    }
                };

                *current_dir = new_dir.clone();
                ExecResult {
                    exit_code: 0,
                    stdout: String::new(),
                    stderr: String::new(),
                    cwd: Some(new_dir),
                }
            }
            "pwd" => ExecResult {
                exit_code: 0,
                stdout: format!("{}\n", current_dir),
                stderr: String::new(),
                cwd: Some(current_dir.clone()),
            },
            "whoami" => ExecResult {
                exit_code: 0,
                stdout: "root\n".to_string(),
                stderr: String::new(),
                cwd: Some(current_dir.clone()),
            },
            "hostname" => ExecResult {
                exit_code: 0,
                stdout: format!("netlab-{}\n", component_id),
                stderr: String::new(),
                cwd: Some(current_dir.clone()),
            },
            "uname" => ExecResult {
                exit_code: 0,
                stdout: "Linux ubuntu-24 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 Linux\n".to_string(),
                stderr: String::new(),
                cwd: Some(current_dir.clone()),
            },
            "ls" | "ll" | "la" => {
                let stdout = if current_dir == "/" {
                    "\x1b[01;34mbin\x1b[0m   \x1b[01;34mdev\x1b[0m  \x1b[01;34mhome\x1b[0m  \x1b[01;34mlib64\x1b[0m  \x1b[01;34mmnt\x1b[0m  \x1b[01;34mproc\x1b[0m  \x1b[01;34mrun\x1b[0m   \x1b[01;34msrv\x1b[0m  \x1b[01;34mtmp\x1b[0m  \x1b[01;34mvar\x1b[0m\n\x1b[01;34mboot\x1b[0m  \x1b[01;34metc\x1b[0m  \x1b[01;34mlib\x1b[0m   \x1b[01;34mmedia\x1b[0m  \x1b[01;34mopt\x1b[0m  \x1b[01;34mroot\x1b[0m  \x1b[01;34msbin\x1b[0m  \x1b[01;34msys\x1b[0m  \x1b[01;34musr\x1b[0m\n".to_string()
                } else if current_dir == "/home" {
                    "\x1b[01;34mubuntu\x1b[0m\n".to_string()
                } else if current_dir == "/etc" {
                    "hostname  \x1b[01;34mnginx\x1b[0m  os-release  resolv.conf\n".to_string()
                } else {
                    let prefix = if current_dir.ends_with('/') { current_dir.clone() } else { format!("{}/", current_dir) };
                    let matching: Vec<String> = files
                        .keys()
                        .filter(|k| k.starts_with(&prefix))
                        .map(|k| k.trim_start_matches(&prefix).to_string())
                        .collect();
                    if matching.is_empty() {
                        String::new()
                    } else {
                        matching.join("  ") + "\n"
                    }
                };

                ExecResult {
                    exit_code: 0,
                    stdout,
                    stderr: String::new(),
                    cwd: Some(current_dir.clone()),
                }
            }
            "cat" => {
                if parts.len() > 1 {
                    let mut path = parts[1].to_string();
                    if !path.starts_with('/') {
                        path = if current_dir == "/" {
                            format!("/{}", path)
                        } else {
                            format!("{}/{}", current_dir, path)
                        };
                    }
                    if let Some(content) = files.get(&path) {
                        ExecResult {
                            exit_code: 0,
                            stdout: format!("{}\n", content),
                            stderr: String::new(),
                            cwd: Some(current_dir.clone()),
                        }
                    } else {
                        ExecResult {
                            exit_code: 1,
                            stdout: String::new(),
                            stderr: format!("cat: {}: No such file or directory\n", path),
                            cwd: Some(current_dir.clone()),
                        }
                    }
                } else {
                    ExecResult {
                        exit_code: 0,
                        stdout: String::new(),
                        stderr: String::new(),
                        cwd: Some(current_dir.clone()),
                    }
                }
            }
            "touch" => {
                if parts.len() > 1 {
                    let filename = parts[1];
                    let full_path = if filename.starts_with('/') {
                        filename.to_string()
                    } else if current_dir == "/" {
                        format!("/{}", filename)
                    } else {
                        format!("{}/{}", current_dir, filename)
                    };
                    files.insert(full_path, String::new());
                }
                ExecResult {
                    exit_code: 0,
                    stdout: String::new(),
                    stderr: String::new(),
                    cwd: Some(current_dir.clone()),
                }
            }
            "mkdir" => {
                ExecResult {
                    exit_code: 0,
                    stdout: String::new(),
                    stderr: String::new(),
                    cwd: Some(current_dir.clone()),
                }
            }
            _ => ExecResult {
                exit_code: 0,
                stdout: format!("NetLab [Shell]: Executed '{}' successfully.\n", command),
                stderr: String::new(),
                cwd: Some(current_dir.clone()),
            },
        }
    }
}
