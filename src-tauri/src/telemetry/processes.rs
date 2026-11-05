use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub user: String,
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub memory_rss_mb: f64,
    pub state: String,
    pub threads: u32,
    pub elapsed: String,
    pub name: String,
    pub cmdline: String,
}

pub fn list_processes(limit: Option<usize>) -> Vec<ProcessInfo> {
    let mut list = Vec::new();

    let output = Command::new("ps")
        .args([
            "-eo",
            "pid,user,%cpu,%mem,rss,stat,nlwp,etime,comm,args",
            "--sort=-%cpu",
        ])
        .output();

    let Ok(output) = output else {
        return list;
    };

    if !output.status.success() {
        return list;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines().skip(1) {
        let trimmed = line.trim_start();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 10 {
            continue;
        }

        let pid = match parts[0].parse::<u32>() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let user = parts[1].to_string();
        let cpu_percent = parts[2].parse::<f64>().unwrap_or(0.0);
        let memory_percent = parts[3].parse::<f64>().unwrap_or(0.0);
        let rss_kb = parts[4].parse::<f64>().unwrap_or(0.0);
        let memory_rss_mb = rss_kb / 1024.0;
        let state = parts[5].to_string();
        let threads = parts[6].parse::<u32>().unwrap_or(1);
        let elapsed = parts[7].to_string();
        let name = parts[8].to_string();

        // The remaining parts are the full args/cmdline
        let cmdline = parts[9..].join(" ");

        list.push(ProcessInfo {
            pid,
            user,
            cpu_percent,
            memory_percent,
            memory_rss_mb,
            state,
            threads,
            elapsed,
            name,
            cmdline,
        });

        if let Some(max) = limit {
            if list.len() >= max {
                break;
            }
        }
    }

    list
}

pub fn kill_process_by_pid(pid: u32, signal: &str) -> Result<String, String> {
    if pid <= 1 {
        return Err("Cannot terminate init or kernel process (PID <= 1)".to_string());
    }

    let sig_flag = match signal {
        "SIGTERM" | "15" => "-15",
        "SIGKILL" | "9" => "-9",
        "SIGHUP" | "1" => "-1",
        _ => return Err(format!("Unsupported signal: {signal}. Allowed: SIGTERM, SIGKILL")),
    };

    let output = Command::new("kill")
        .args([sig_flag, &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to execute kill command: {e}"))?;

    if output.status.success() {
        Ok(format!("Signal {signal} successfully delivered to process {pid}"))
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to kill process {pid}: {}", err_msg.trim()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kill_process_rejects_pid_0_and_1() {
        assert!(kill_process_by_pid(0, "SIGTERM").is_err());
        assert!(kill_process_by_pid(1, "SIGKILL").is_err());
    }

    #[test]
    fn test_kill_process_rejects_invalid_signal() {
        assert!(kill_process_by_pid(9999, "INVALID_SIGNAL").is_err());
    }

    #[test]
    fn test_list_processes_runs_without_panic() {
        let procs = list_processes(Some(5));
        assert!(procs.len() <= 5);
    }
}
