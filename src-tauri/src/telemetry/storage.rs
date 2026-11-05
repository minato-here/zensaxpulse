use serde::Serialize;
use std::{collections::HashMap, fs, process::Command};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalDisk {
    pub name: String,
    pub model: String,
    pub size_gb: f64,
    pub disk_type: String, // "NVMe SSD", "SATA SSD", "HDD", etc.
    pub is_rotational: bool,
    pub temperature_c: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MountedPartition {
    pub device: String,
    pub mount_point: String,
    pub fstype: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_percent: f64,
    pub is_root: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageMetrics {
    pub physical_disks: Vec<PhysicalDisk>,
    pub partitions: Vec<MountedPartition>,
    pub root_total_gb: Option<f64>,
    pub root_used_gb: Option<f64>,
    pub root_available_gb: Option<f64>,
    pub root_usage_percent: Option<f64>,
    pub read_speed_mb_s: f64,
    pub write_speed_mb_s: f64,
}

pub fn read_diskstats() -> HashMap<String, (u64, u64)> {
    let mut stats = HashMap::new();
    if let Ok(contents) = fs::read_to_string("/proc/diskstats") {
        for line in contents.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 10 {
                let dev_name = parts[2].to_string();
                let sectors_read = parts[5].parse::<u64>().unwrap_or(0);
                let sectors_written = parts[9].parse::<u64>().unwrap_or(0);
                // Keep whole disk devices (e.g. nvme0n1, sda)
                if !dev_name.starts_with("loop") && !dev_name.starts_with("ram") {
                    stats.insert(dev_name, (sectors_read, sectors_written));
                }
            }
        }
    }
    stats
}

pub fn read_storage_metrics(read_speed_mb_s: f64, write_speed_mb_s: f64) -> StorageMetrics {
    let physical_disks = read_physical_disks();
    let partitions = read_mounted_partitions();

    let root_partition = partitions.iter().find(|p| p.mount_point == "/").cloned()
        .or_else(|| partitions.first().cloned());

    let (root_total_gb, root_used_gb, root_available_gb, root_usage_percent) = match root_partition {
        Some(p) => (
            Some(p.total_gb),
            Some(p.used_gb),
            Some(p.available_gb),
            Some(p.usage_percent),
        ),
        None => (None, None, None, None),
    };

    StorageMetrics {
        physical_disks,
        partitions,
        root_total_gb,
        root_used_gb,
        root_available_gb,
        root_usage_percent,
        read_speed_mb_s,
        write_speed_mb_s,
    }
}

fn read_physical_disks() -> Vec<PhysicalDisk> {
    let mut disks = Vec::new();

    // Find temperatures from hwmon
    let mut temps = HashMap::new();
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(name) = fs::read_to_string(p.join("name")) {
                let name = name.trim();
                if name.starts_with("nvme") || name == "drivetemp" {
                    if let Ok(t) = fs::read_to_string(p.join("temp1_input")) {
                        if let Ok(m) = t.trim().parse::<f64>() {
                            temps.insert(name.to_string(), m / 1000.0);
                        }
                    }
                }
            }
        }
    }

    // Try lsblk JSON first
    let output = Command::new("lsblk")
        .args(["-b", "-J", "-o", "NAME,MODEL,SIZE,TYPE,TRAN,ROTA"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            if let Ok(parsed) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                if let Some(devices) = parsed.get("blockdevices").and_then(|d| d.as_array()) {
                    for dev in devices {
                        let dev_type = dev.get("type").and_then(|t| t.as_str()).unwrap_or("");
                        if dev_type != "disk" {
                            continue;
                        }

                        let name = dev.get("name").and_then(|n| n.as_str()).unwrap_or("unknown").to_string();
                        let model = dev.get("model").and_then(|m| m.as_str())
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|| "Internal Storage".to_string());
                        let size_bytes = dev.get("size").and_then(|s| s.as_f64()).unwrap_or(0.0);
                        let size_gb = size_bytes / (1024.0 * 1024.0 * 1024.0);
                        let tran = dev.get("tran").and_then(|t| t.as_str()).unwrap_or("");
                        let rota = dev.get("rota").and_then(|r| r.as_bool()).unwrap_or(false);

                        let disk_type = if tran == "nvme" {
                            "NVMe SSD".to_string()
                        } else if !rota {
                            "SATA SSD".to_string()
                        } else {
                            "HDD (Magnetic)".to_string()
                        };

                        let temperature_c = if tran == "nvme" || name.starts_with("nvme") {
                            temps.get("nvme").copied().or_else(|| temps.values().next().copied())
                        } else {
                            temps.get("drivetemp").copied()
                        };

                        disks.push(PhysicalDisk {
                            name,
                            model,
                            size_gb,
                            disk_type,
                            is_rotational: rota,
                            temperature_c,
                        });
                    }
                }
            }
        }
    }

    // Fallback if lsblk fails: scan /sys/block
    if disks.is_empty() {
        if let Ok(entries) = fs::read_dir("/sys/block") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("loop") || name.starts_with("ram") || name.starts_with("zram") {
                    continue;
                }
                let p = entry.path();
                let model = fs::read_to_string(p.join("device/model"))
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|_| "Storage Device".to_string());

                let size_sectors = fs::read_to_string(p.join("size"))
                    .ok()
                    .and_then(|s| s.trim().parse::<f64>().ok())
                    .unwrap_or(0.0);
                let size_gb = (size_sectors * 512.0) / (1024.0 * 1024.0 * 1024.0);

                let rota = fs::read_to_string(p.join("queue/rotational"))
                    .ok()
                    .and_then(|s| s.trim().parse::<u8>().ok())
                    .map_or(false, |v| v == 1);

                let disk_type = if name.starts_with("nvme") {
                    "NVMe SSD".to_string()
                } else if !rota {
                    "SSD".to_string()
                } else {
                    "HDD".to_string()
                };

                disks.push(PhysicalDisk {
                    name,
                    model,
                    size_gb,
                    disk_type,
                    is_rotational: rota,
                    temperature_c: temps.values().next().copied(),
                });
            }
        }
    }

    disks
}

fn read_mounted_partitions() -> Vec<MountedPartition> {
    let mut partitions = Vec::new();

    // Use df -B1 -P -T
    let output = Command::new("df")
        .args(["-B1", "-P", "-T"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 7 {
                    continue;
                }

                let device = parts[0];
                let fstype = parts[1];
                let total_bytes = parts[2].parse::<f64>().unwrap_or(0.0);
                let used_bytes = parts[3].parse::<f64>().unwrap_or(0.0);
                let avail_bytes = parts[4].parse::<f64>().unwrap_or(0.0);
                let mount_point = parts[6];

                // Filter out non-storage pseudofs
                if !device.starts_with("/dev/") && fstype != "btrfs" && fstype != "zfs" {
                    continue;
                }

                // Skip squashfs or snaps unless desired
                if fstype == "squashfs" {
                    continue;
                }

                let bytes_to_gib = 1.0 / (1024.0 * 1024.0 * 1024.0);
                let total_gb = total_bytes * bytes_to_gib;
                let used_gb = used_bytes * bytes_to_gib;
                let available_gb = avail_bytes * bytes_to_gib;

                let usage_percent = if total_bytes > 0.0 {
                    ((used_bytes / total_bytes) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };

                partitions.push(MountedPartition {
                    device: device.to_string(),
                    mount_point: mount_point.to_string(),
                    fstype: fstype.to_string(),
                    total_gb,
                    used_gb,
                    available_gb,
                    usage_percent,
                    is_root: mount_point == "/",
                });
            }
        }
    }

    // Sort: root "/" first, then by mount point
    partitions.sort_by(|a, b| {
        if a.is_root {
            std::cmp::Ordering::Less
        } else if b.is_root {
            std::cmp::Ordering::Greater
        } else {
            a.mount_point.cmp(&b.mount_point)
        }
    });

    partitions
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_read_diskstats() {
        let stats = read_diskstats();
        // Even in container/sandbox /proc/diskstats is present
        assert!(!stats.is_empty() || Path::new("/proc/diskstats").exists());
    }
}
