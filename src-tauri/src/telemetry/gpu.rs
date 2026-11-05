use crate::state::GpuHistoryPoint;
use serde::Serialize;
use std::{collections::HashMap, fs, path::Path, process::Command};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuDevice {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub is_integrated: bool,
    pub utilization_percent: Option<f64>,
    pub memory_used_mb: Option<f64>,
    pub memory_total_mb: Option<f64>,
    pub memory_usage_percent: Option<f64>,
    pub temperature_c: Option<f64>,
    pub power_draw_w: Option<f64>,
    pub clock_speed_mhz: Option<f64>,
    pub fan_speed_rpm: Option<u32>,
    pub fan_speed_percent: Option<f64>,
    pub performance_state: Option<String>,
    pub driver_version: Option<String>,
    pub unsupported_reasons: HashMap<String, String>,
    pub history: Vec<GpuHistoryPoint>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetrics {
    pub devices: Vec<GpuDevice>,
    pub selected_device_id: Option<String>,
}

pub fn detect_all_gpus() -> Vec<GpuDevice> {
    let mut gpus = Vec::new();

    // 1. Check NVIDIA via nvidia-smi
    let nvidia_gpus = detect_nvidia_gpus();
    gpus.extend(nvidia_gpus);

    // 2. Check AMD / Intel via /sys/class/drm/
    let drm_gpus = detect_drm_gpus();
    for drm_gpu in drm_gpus {
        // Only add if not already captured by nvidia-smi (NVIDIA drm cards might be present)
        if !gpus.iter().any(|g| g.vendor == "NVIDIA" && drm_gpu.vendor == "NVIDIA") {
            gpus.push(drm_gpu);
        }
    }

    gpus
}

fn detect_nvidia_gpus() -> Vec<GpuDevice> {
    let mut devices = Vec::new();

    let output = Command::new("nvidia-smi")
        .args([
            "--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.graphics,fan.speed,pstate,driver_version",
            "--format=csv,noheader,nounits",
        ])
        .output();

    let Ok(output) = output else {
        return devices;
    };

    if !output.status.success() {
        return devices;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split(',').map(str::trim).collect();
        if parts.len() < 11 {
            continue;
        }

        let index = parts[0];
        let name = parts[1].to_string();
        let util = parts[2].parse::<f64>().ok();
        let mem_used = parts[3].parse::<f64>().ok();
        let mem_total = parts[4].parse::<f64>().ok();
        let temp = parts[5].parse::<f64>().ok();
        let power = parts[6].parse::<f64>().ok();
        let clock = parts[7].parse::<f64>().ok();
        let fan_str = parts[8];
        let pstate = if parts[9] != "[N/A]" && parts[9] != "[Not Supported]" {
            Some(parts[9].to_string())
        } else {
            None
        };
        let driver = if parts[10] != "[N/A]" {
            Some(parts[10].to_string())
        } else {
            None
        };

        let mem_pct = match (mem_used, mem_total) {
            (Some(u), Some(t)) if t > 0.0 => Some(((u / t) * 100.0).clamp(0.0, 100.0)),
            _ => None,
        };

        let fan_pct = fan_str.parse::<f64>().ok();

        let mut unsupported = HashMap::new();
        if fan_pct.is_none() {
            unsupported.insert(
                "fanSpeed".to_string(),
                "Fan speed control/sensing managed by laptop embedded controller".to_string(),
            );
        }

        devices.push(GpuDevice {
            id: format!("nvidia-{index}"),
            name,
            vendor: "NVIDIA".to_string(),
            is_integrated: false, // Dedicated GPU
            utilization_percent: util,
            memory_used_mb: mem_used,
            memory_total_mb: mem_total,
            memory_usage_percent: mem_pct,
            temperature_c: temp,
            power_draw_w: power,
            clock_speed_mhz: clock,
            fan_speed_rpm: None,
            fan_speed_percent: fan_pct,
            performance_state: pstate,
            driver_version: driver,
            unsupported_reasons: unsupported,
            history: Vec::new(),
        });
    }

    devices
}

fn detect_drm_gpus() -> Vec<GpuDevice> {
    let mut devices = Vec::new();
    let drm_base = Path::new("/sys/class/drm");

    if let Ok(entries) = fs::read_dir(drm_base) {
        for entry in entries.flatten() {
            let filename = entry.file_name().to_string_lossy().to_string();
            // Look for card0, card1, etc. but skip connectors like card0-HDMI-A-1
            if !filename.starts_with("card") || filename.contains('-') {
                continue;
            }

            let card_path = entry.path();
            let device_path = card_path.join("device");
            if !device_path.exists() {
                continue;
            }

            // Read uevent to detect driver and vendor
            let uevent = fs::read_to_string(device_path.join("uevent")).unwrap_or_default();
            let mut driver = String::new();
            let mut pci_id = String::new();

            for line in uevent.lines() {
                if let Some(d) = line.strip_prefix("DRIVER=") {
                    driver = d.trim().to_string();
                } else if let Some(p) = line.strip_prefix("PCI_ID=") {
                    pci_id = p.trim().to_string();
                }
            }

            if driver == "amdgpu" || pci_id.starts_with("1002") {
                if let Some(gpu) = read_amd_gpu(&filename, &device_path) {
                    devices.push(gpu);
                }
            } else if driver == "i915" || driver == "xe" || pci_id.starts_with("8086") {
                if let Some(gpu) = read_intel_gpu(&filename, &device_path) {
                    devices.push(gpu);
                }
            }
        }
    }

    devices
}

fn read_amd_gpu(card_name: &str, device_path: &Path) -> Option<GpuDevice> {
    // Check utilization
    let util = fs::read_to_string(device_path.join("gpu_busy_percent"))
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok());

    // Check VRAM
    let vram_used_bytes = fs::read_to_string(device_path.join("mem_info_vram_used"))
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok());

    let vram_total_bytes = fs::read_to_string(device_path.join("mem_info_vram_total"))
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok());

    let mem_used_mb = vram_used_bytes.map(|b| b / (1024.0 * 1024.0));
    let mem_total_mb = vram_total_bytes.map(|b| b / (1024.0 * 1024.0));
    let mem_pct = match (mem_used_mb, mem_total_mb) {
        (Some(u), Some(t)) if t > 0.0 => Some(((u / t) * 100.0).clamp(0.0, 100.0)),
        _ => None,
    };

    // Find hwmon directory for this AMD GPU
    let mut temp = None;
    let mut power = None;
    let mut clock = None;
    let mut fan_rpm = None;

    let hwmon_dir = device_path.join("hwmon");
    if let Ok(entries) = fs::read_dir(hwmon_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if temp.is_none() {
                if let Ok(val) = fs::read_to_string(p.join("temp1_input")) {
                    temp = val.trim().parse::<f64>().ok().map(|m| m / 1000.0);
                }
            }
            if power.is_none() {
                if let Ok(val) = fs::read_to_string(p.join("power1_input")) {
                    power = val.trim().parse::<f64>().ok().map(|m| m / 1_000_000.0);
                } else if let Ok(val) = fs::read_to_string(p.join("power1_average")) {
                    power = val.trim().parse::<f64>().ok().map(|m| m / 1_000_000.0);
                }
            }
            if clock.is_none() {
                if let Ok(val) = fs::read_to_string(p.join("freq1_input")) {
                    clock = val.trim().parse::<f64>().ok().map(|hz| hz / 1_000_000.0);
                }
            }
            if fan_rpm.is_none() {
                if let Ok(val) = fs::read_to_string(p.join("fan1_input")) {
                    fan_rpm = val.trim().parse::<u32>().ok();
                }
            }
        }
    }

    // Determine GPU name
    let mut name = "AMD Radeon Graphics".to_string();
    if let Ok(product) = fs::read_to_string(device_path.join("product_name")) {
        let p = product.trim();
        if !p.is_empty() {
            name = p.to_string();
        }
    }

    // Check if integrated (APU)
    let is_integrated = mem_total_mb.map_or(true, |t| t <= 4096.0);

    let mut unsupported = HashMap::new();
    if fan_rpm.is_none() {
        unsupported.insert(
            "fanSpeed".to_string(),
            "Shared system cooling or managed by embedded controller".to_string(),
        );
    }

    Some(GpuDevice {
        id: format!("amd-{card_name}"),
        name,
        vendor: "AMD".to_string(),
        is_integrated,
        utilization_percent: util,
        memory_used_mb: mem_used_mb,
        memory_total_mb: mem_total_mb,
        memory_usage_percent: mem_pct,
        temperature_c: temp,
        power_draw_w: power,
        clock_speed_mhz: clock,
        fan_speed_rpm: fan_rpm,
        fan_speed_percent: None,
        performance_state: None,
        driver_version: Some("amdgpu".to_string()),
        unsupported_reasons: unsupported,
        history: Vec::new(),
    })
}

fn read_intel_gpu(card_name: &str, device_path: &Path) -> Option<GpuDevice> {
    let mut clock = None;
    if let Ok(val) = fs::read_to_string(device_path.join("drm").join(card_name).join("gt_act_freq_mhz")) {
        clock = val.trim().parse::<f64>().ok();
    } else if let Ok(val) = fs::read_to_string(device_path.join("gt_act_freq_mhz")) {
        clock = val.trim().parse::<f64>().ok();
    }

    Some(GpuDevice {
        id: format!("intel-{card_name}"),
        name: "Intel HD/Iris Graphics".to_string(),
        vendor: "Intel".to_string(),
        is_integrated: true,
        utilization_percent: None,
        memory_used_mb: None,
        memory_total_mb: None,
        memory_usage_percent: None,
        temperature_c: None,
        power_draw_w: None,
        clock_speed_mhz: clock,
        fan_speed_rpm: None,
        fan_speed_percent: None,
        performance_state: None,
        driver_version: Some("i915/xe".to_string()),
        unsupported_reasons: {
            let mut m = HashMap::new();
            m.insert("utilization".to_string(), "Kernel engine telemetry requires elevated capabilities".to_string());
            m
        },
        history: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_all_gpus_does_not_panic() {
        let gpus = detect_all_gpus();
        // Systems may have 0, 1, or more GPUs; call must never panic
        for gpu in &gpus {
            assert!(!gpu.id.is_empty());
            assert!(!gpu.vendor.is_empty());
        }
    }
}
