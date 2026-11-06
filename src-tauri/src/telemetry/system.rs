use serde::Serialize;
use std::{env, fs, process::Command};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub kernel_release: String,
    pub architecture: String,
    pub hostname: String,
    pub desktop_environment: String,
    pub display_server: String,
    pub uptime_seconds: f64,
    pub boot_timestamp: u64,
    pub kernel_modules_count: usize,
    pub cpu_flags_sample: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemdService {
    pub name: String,
    pub description: String,
    pub load_state: String,
    pub active_state: String,
    pub sub_state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServicesReport {
    pub is_systemd_available: bool,
    pub status_message: String,
    pub services: Vec<SystemdService>,
}

pub fn read_system_info() -> SystemInfo {
    let mut os_name = "Linux".to_string();
    let mut os_version = "".to_string();

    let os_release_files = ["/etc/os-release", "/usr/lib/os-release"];
    for file_path in &os_release_files {
        if let Ok(contents) = fs::read_to_string(file_path) {
            for line in contents.lines() {
                let trimmed = line.trim();
                if let Some(val) = trimmed.strip_prefix("PRETTY_NAME=") {
                    let cleaned = val.trim_matches('"').trim_matches('\'').trim();
                    if !cleaned.is_empty() {
                        os_name = cleaned.to_string();
                    }
                } else if os_name == "Linux" && trimmed.starts_with("NAME=") {
                    if let Some(val) = trimmed.strip_prefix("NAME=") {
                        let cleaned = val.trim_matches('"').trim_matches('\'').trim();
                        if !cleaned.is_empty() {
                            os_name = cleaned.to_string();
                        }
                    }
                } else if let Some(val) = trimmed.strip_prefix("VERSION_ID=") {
                    os_version = val.trim_matches('"').trim_matches('\'').trim().to_string();
                }
            }
            if os_name != "Linux" {
                break;
            }
        }
    }

    let kernel_release = Command::new("uname")
        .arg("-r")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    let architecture = Command::new("uname")
        .arg("-m")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    let hostname = fs::read_to_string("/proc/sys/kernel/hostname")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "localhost".to_string());

    let desktop_env = env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| env::var("XDG_SESSION_DESKTOP"))
        .or_else(|_| env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "Desktop Session".to_string());

    let display_server = if env::var("WAYLAND_DISPLAY").is_ok() {
        "Wayland".to_string()
    } else if env::var("DISPLAY").is_ok() {
        "X11".to_string()
    } else {
        "Desktop Session".to_string()
    };

    let uptime_seconds = fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|s| s.split_whitespace().next().and_then(|v| v.parse::<f64>().ok()))
        .unwrap_or(0.0);

    let boot_timestamp = fs::read_to_string("/proc/stat")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("btime "))
                .and_then(|l| l.split_whitespace().nth(1))
                .and_then(|v| v.parse::<u64>().ok())
        })
        .unwrap_or(0);

    let kernel_modules_count = fs::read_to_string("/proc/modules")
        .map(|s| s.lines().count())
        .unwrap_or(0);

    let mut cpu_flags_sample = Vec::new();
    if let Ok(cpuinfo) = fs::read_to_string("/proc/cpuinfo") {
        for line in cpuinfo.lines() {
            if line.starts_with("flags") || line.starts_with("Features") {
                if let Some((_, flags)) = line.split_once(':') {
                    cpu_flags_sample = flags
                        .split_whitespace()
                        .take(24)
                        .map(|s| s.to_string())
                        .collect();
                    break;
                }
            }
        }
    }

    SystemInfo {
        os_name,
        os_version,
        kernel_release,
        architecture,
        hostname,
        desktop_environment: desktop_env,
        display_server,
        uptime_seconds,
        boot_timestamp,
        kernel_modules_count,
        cpu_flags_sample,
    }
}

pub fn list_systemd_services() -> ServicesReport {
    let output = Command::new("systemctl")
        .args(["list-units", "--type=service", "--all", "--no-pager", "--no-legend"])
        .output();

    let Ok(output) = output else {
        return ServicesReport {
            is_systemd_available: false,
            status_message: "systemctl command not found on host".to_string(),
            services: Vec::new(),
        };
    };

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let msg = if err.contains("not been booted with systemd") {
            "System is running in an environment without systemd as PID 1".to_string()
        } else {
            format!("systemctl error: {}", err.trim())
        };
        return ServicesReport {
            is_systemd_available: false,
            status_message: msg,
            services: Vec::new(),
        };
    }

    let mut services = Vec::new();
    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let name = parts[0].to_string();
        let load_state = parts[1].to_string();
        let active_state = parts[2].to_string();
        let sub_state = parts[3].to_string();
        let description = parts[4..].join(" ");

        services.push(SystemdService {
            name,
            description,
            load_state,
            active_state,
            sub_state,
        });
    }

    ServicesReport {
        is_systemd_available: true,
        status_message: format!("Loaded {} services", services.len()),
        services,
    }
}

pub fn control_systemd_service(service_name: &str, action: &str) -> Result<String, String> {
    // Validate action
    if action != "start" && action != "stop" && action != "restart" {
        return Err(format!("Invalid service action '{action}'. Allowed: start, stop, restart"));
    }

    // Validate service name: only allow alphanumeric, dots, dashes, underscores, @
    if !service_name.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-' || c == '_' || c == '@') {
        return Err("Invalid characters in service name".to_string());
    }

    let output = Command::new("systemctl")
        .args([action, service_name])
        .output()
        .map_err(|e| format!("Failed to invoke systemctl: {e}"))?;

    if output.status.success() {
        Ok(format!("Service '{service_name}' {action} command executed successfully"))
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("systemctl failed: {}", err.trim()))
    }
}

pub fn execute_power_action(action: &str) -> Result<String, String> {
    let subcmd = match action {
        "reboot" => "reboot",
        "shutdown" | "poweroff" => "poweroff",
        "suspend" => "suspend",
        _ => return Err(format!("Unsupported power action '{action}'. Allowed: reboot, shutdown, suspend")),
    };

    let output = Command::new("systemctl")
        .arg(subcmd)
        .output()
        .map_err(|e| format!("Failed to invoke systemctl {subcmd}: {e}"))?;

    if output.status.success() {
        Ok(format!("Power command '{subcmd}' issued successfully"))
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("systemctl {subcmd} failed: {}", err.trim()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_control_service_validates_action() {
        assert!(control_systemd_service("nginx", "invalid").is_err());
    }

    #[test]
    fn test_control_service_validates_service_name() {
        assert!(control_systemd_service("nginx; rm -rf /", "start").is_err());
    }

    #[test]
    fn test_execute_power_action_rejects_unsupported() {
        assert!(execute_power_action("destroy").is_err());
    }

    #[test]
    fn test_read_system_info_fields() {
        let info = read_system_info();
        assert!(!info.os_name.is_empty());
        assert!(!info.architecture.is_empty());
    }
}
