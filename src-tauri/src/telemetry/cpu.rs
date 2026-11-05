use crate::state::HistoryPoint;
use serde::Serialize;
use std::{fs, path::Path};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuMetrics {
    pub usage_percent: f64,
    pub per_core_usage: Vec<f64>,
    pub model_name: String,
    pub physical_cores: u32,
    pub logical_threads: u32,
    pub core_frequencies_mhz: Vec<f64>,
    pub min_frequency_mhz: Option<f64>,
    pub max_frequency_mhz: Option<f64>,
    pub load_average_1m: f64,
    pub load_average_5m: f64,
    pub load_average_15m: f64,
    pub temperature_c: Option<f64>,
    pub power_w: Option<f64>,
    pub history: Vec<HistoryPoint>,
}

pub fn read_raw_cpu_counters() -> Result<((u64, u64), Vec<(u64, u64)>), String> {
    let contents = fs::read_to_string("/proc/stat")
        .map_err(|error| format!("Failed to read /proc/stat: {error}"))?;

    let mut aggregate: Option<(u64, u64)> = None;
    let mut per_core = Vec::new();

    for line in contents.lines() {
        if line.starts_with("cpu ") {
            let counters = parse_counter_line(line)?;
            aggregate = Some(counters);
        } else if line.starts_with("cpu") && line.chars().nth(3).map_or(false, |c| c.is_ascii_digit()) {
            if let Ok(counters) = parse_counter_line(line) {
                per_core.push(counters);
            }
        }
    }

    let aggregate = aggregate.ok_or_else(|| "Aggregate CPU counters not found in /proc/stat".to_string())?;
    Ok((aggregate, per_core))
}

fn parse_counter_line(line: &str) -> Result<(u64, u64), String> {
    let values: Vec<u64> = line
        .split_whitespace()
        .skip(1)
        .map(|v| v.parse::<u64>().map_err(|e| format!("Invalid counter: {e}")))
        .collect::<Result<Vec<_>, _>>()?;

    if values.len() < 4 {
        return Err("Insufficient counters in cpu line".to_string());
    }

    let total: u64 = values.iter().sum();
    // Idle is idle (index 3) + iowait (index 4 if present)
    let idle = values[3] + values.get(4).copied().unwrap_or(0);
    Ok((total, idle))
}

pub fn calculate_percentage(before: (u64, u64), after: (u64, u64)) -> f64 {
    let total_delta = after.0.saturating_sub(before.0);
    let idle_delta = after.1.saturating_sub(before.1);

    if total_delta == 0 {
        return 0.0;
    }

    let busy_delta = total_delta.saturating_sub(idle_delta);
    let pct = (busy_delta as f64 / total_delta as f64) * 100.0;
    pct.clamp(0.0, 100.0)
}

pub fn read_cpu_info() -> (String, u32, u32) {
    let contents = fs::read_to_string("/proc/cpuinfo").unwrap_or_default();

    let mut model_name = "Unknown Processor".to_string();
    let mut physical_cores = 0u32;
    let mut logical_threads = 0u32;

    for line in contents.lines() {
        if line.starts_with("model name") && model_name == "Unknown Processor" {
            if let Some((_, val)) = line.split_once(':') {
                model_name = val.trim().to_string();
            }
        } else if line.starts_with("cpu cores") && physical_cores == 0 {
            if let Some((_, val)) = line.split_once(':') {
                if let Ok(c) = val.trim().parse::<u32>() {
                    physical_cores = c;
                }
            }
        } else if line.starts_with("processor") {
            logical_threads += 1;
        }
    }

    if physical_cores == 0 {
        physical_cores = logical_threads.max(1);
    }

    (model_name, physical_cores, logical_threads.max(1))
}

pub fn read_core_frequencies() -> (Vec<f64>, Option<f64>, Option<f64>) {
    let mut freqs = Vec::new();
    let mut idx = 0;

    let min_freq = fs::read_to_string("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq")
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok())
        .map(|khz| khz / 1000.0);

    let max_freq = fs::read_to_string("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq")
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok())
        .map(|khz| khz / 1000.0);

    loop {
        let path = format!("/sys/devices/system/cpu/cpu{idx}/cpufreq/scaling_cur_freq");
        if !Path::new(&path).exists() {
            break;
        }
        if let Ok(val) = fs::read_to_string(&path) {
            if let Ok(khz) = val.trim().parse::<f64>() {
                freqs.push(khz / 1000.0); // MHz
            }
        }
        idx += 1;
    }

    (freqs, min_freq, max_freq)
}

pub fn read_load_averages() -> (f64, f64, f64) {
    if let Ok(contents) = fs::read_to_string("/proc/loadavg") {
        let parts: Vec<&str> = contents.split_whitespace().collect();
        if parts.len() >= 3 {
            let l1 = parts[0].parse::<f64>().unwrap_or(0.0);
            let l5 = parts[1].parse::<f64>().unwrap_or(0.0);
            let l15 = parts[2].parse::<f64>().unwrap_or(0.0);
            return (l1, l5, l15);
        }
    }
    (0.0, 0.0, 0.0)
}

pub fn read_cpu_temperature() -> Option<f64> {
    // Check known CPU hwmon drivers: k10temp, coretemp, zenpower, cpu_thermal
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(name) = fs::read_to_string(path.join("name")) {
                let name = name.trim();
                if name == "k10temp" || name == "coretemp" || name == "zenpower" || name == "cpu_thermal" {
                    // Check temp1_input, temp2_input, etc.
                    for i in 1..=8 {
                        let t_path = path.join(format!("temp{i}_input"));
                        if let Ok(val) = fs::read_to_string(t_path) {
                            if let Ok(millis) = val.trim().parse::<f64>() {
                                return Some(millis / 1000.0);
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback: check thermal_zone0
    if let Ok(val) = fs::read_to_string("/sys/class/thermal/thermal_zone0/temp") {
        if let Ok(millis) = val.trim().parse::<f64>() {
            return Some(millis / 1000.0);
        }
    }

    None
}

pub fn read_cpu_power() -> Option<f64> {
    // Check RAPL powercap
    let rapl_energy = "/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj";
    if Path::new(rapl_energy).exists() {
        // Handled via energy delta if needed, but hwmon might have power input
    }

    // Check hwmon drivers for power1_input
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(name) = fs::read_to_string(path.join("name")) {
                let name = name.trim();
                if name == "k10temp" || name == "coretemp" || name == "zenpower" {
                    let p_path = path.join("power1_input");
                    if let Ok(val) = fs::read_to_string(p_path) {
                        if let Ok(microwatts) = val.trim().parse::<f64>() {
                            return Some(microwatts / 1_000_000.0);
                        }
                    }
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_percentage_normal() {
        let before = (1000, 500);
        let after = (2000, 750);
        // delta total = 1000, delta idle = 250 -> busy = 750 -> 75%
        let pct = calculate_percentage(before, after);
        assert!((pct - 75.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_percentage_zero_delta() {
        let before = (1000, 500);
        let after = (1000, 500);
        let pct = calculate_percentage(before, after);
        assert_eq!(pct, 0.0);
    }

    #[test]
    fn test_calculate_percentage_counter_overflow_safe() {
        let before = (2000, 800);
        let after = (1000, 400); // Counter wrap or reset
        let pct = calculate_percentage(before, after);
        assert_eq!(pct, 0.0);
    }
}

