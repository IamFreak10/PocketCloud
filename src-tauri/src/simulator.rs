use crate::models::ExecResult;
use std::collections::HashMap;
use std::sync::Mutex;

pub struct Simulator {
    filesystems: Mutex<HashMap<String, HashMap<String, String>>>, // component_id -> (filepath -> content)
}

impl Simulator {
    pub fn new() -> Self {
        Simulator {
            filesystems: Mutex::new(HashMap::new()),
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
                "<!DOCTYPE html><html><body><h1>Welcome to NetLab Simulated Web Server!</h1><p>Running on simulated port 80</p></body></html>".to_string(),
            );
            files.insert(
                "/etc/nginx/nginx.conf".to_string(),
                "server {\n    listen 80;\n    server_name localhost;\n    root /var/www/html;\n}".to_string(),
            );
        }

        fs_map.insert(component_id.to_string(), files);
    }

    pub fn exec_command(&self, component_id: &str, cmd: &[&str]) -> ExecResult {
        if cmd.is_empty() {
            return ExecResult {
                exit_code: 0,
                stdout: String::new(),
                stderr: String::new(),
            };
        }

        let main_cmd = cmd[0];
        let mut fs_map = self.filesystems.lock().unwrap();
        let files = fs_map.entry(component_id.to_string()).or_default();

        match main_cmd {
            "pwd" => ExecResult {
                exit_code: 0,
                stdout: "/root\n".to_string(),
                stderr: String::new(),
            },
            "whoami" => ExecResult {
                exit_code: 0,
                stdout: "root\n".to_string(),
                stderr: String::new(),
            },
            "hostname" => ExecResult {
                exit_code: 0,
                stdout: format!("netlab-{}\n", component_id),
                stderr: String::new(),
            },
            "uname" => ExecResult {
                exit_code: 0,
                stdout: "Linux netlab-vps 6.8.0-simulated #1 SMP x86_64 Linux\n".to_string(),
                stderr: String::new(),
            },
            "uptime" => ExecResult {
                exit_code: 0,
                stdout: " 19:30:00 up 2:15, 1 user, load average: 0.05, 0.08, 0.05\n".to_string(),
                stderr: String::new(),
            },
            "df" => ExecResult {
                exit_code: 0,
                stdout: "Filesystem     1K-blocks      Used Available Use% Mounted on\noverlay         20971520   1048576  19922944   5% /\n/dev/sda1       20971520   1048576  19922944   5% /root\n".to_string(),
                stderr: String::new(),
            },
            "free" => ExecResult {
                exit_code: 0,
                stdout: "              total        used        free      shared  buff/cache   available\nMem:         524288       84210      440078        1024       64120      440078\nSwap:             0           0           0\n".to_string(),
                stderr: String::new(),
            },
            "ls" => {
                let stdout = files.keys().cloned().collect::<Vec<_>>().join("\n") + "\n";
                ExecResult {
                    exit_code: 0,
                    stdout,
                    stderr: String::new(),
                }
            }
            "cat" => {
                if cmd.len() > 1 {
                    let path = cmd[1];
                    if let Some(content) = files.get(path) {
                        ExecResult {
                            exit_code: 0,
                            stdout: format!("{}\n", content),
                            stderr: String::new(),
                        }
                    } else {
                        ExecResult {
                            exit_code: 1,
                            stdout: String::new(),
                            stderr: format!("cat: {}: No such file or directory\n", path),
                        }
                    }
                } else {
                    ExecResult {
                        exit_code: 0,
                        stdout: String::new(),
                        stderr: String::new(),
                    }
                }
            }
            _ => ExecResult {
                exit_code: 0,
                stdout: format!("NetLab [Simulated]: Executed '{}' successfully.\n", cmd.join(" ")),
                stderr: String::new(),
            },
        }
    }
}
