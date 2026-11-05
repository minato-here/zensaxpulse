use serde::Serialize;
use std::{
    fs,
    thread,
    time::Duration,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemMetrics {
    cpu_usage_percent: f64,

    memory_total_gb: f64,
    memory_used_gb: f64,
    memory_available_gb: f64,
    memory_usage_percent: f64,

    swap_total_gb: f64,
    swap_used_gb: f64,
    swap_usage_percent: f64,

    uptime_seconds: f64,

    load_average_1m: f64,
    load_average_5m: f64,
    load_average_15m: f64,
}

fn read_cpu_counters() -> Result<(u64, u64), String> {
    let contents = fs::read_to_string("/proc/stat")
        .map_err(|error| format!("Failed to read /proc/stat: {error}"))?;

    let cpu_line = contents
        .lines()
        .find(|line| line.starts_with("cpu "))
        .ok_or_else(|| "Aggregate CPU counters not found".to_string())?;

    let values: Vec<u64> = cpu_line
        .split_whitespace()
        .skip(1)
        .map(|value| {
            value
                .parse::<u64>()
                .map_err(|error| format!("Invalid CPU counter: {error}"))
        })
        .collect::<Result<Vec<_>, _>>()?;

    if values.len() < 4 {
        return Err("Insufficient CPU counters in /proc/stat".to_string());
    }

    let total: u64 = values.iter().sum();

    // Linux idle time includes both idle and iowait.
    let idle = values[3] + values.get(4).copied().unwrap_or(0);

    Ok((total, idle))
}

fn calculate_cpu_usage() -> Result<f64, String> {
    let (total_before, idle_before) = read_cpu_counters()?;

    // A short sampling interval allows us to calculate actual utilization.
    thread::sleep(Duration::from_millis(350));

    let (total_after, idle_after) = read_cpu_counters()?;

    let total_delta = total_after.saturating_sub(total_before);
    let idle_delta = idle_after.saturating_sub(idle_before);

    if total_delta == 0 {
        return Ok(0.0);
    }

    let busy_delta = total_delta.saturating_sub(idle_delta);

    let percentage = (busy_delta as f64 / total_delta as f64) * 100.0;

    Ok(percentage.clamp(0.0, 100.0))
}

fn read_memory_values() -> Result<(f64, f64, f64, f64, f64, f64), String> {
    let contents = fs::read_to_string("/proc/meminfo")
        .map_err(|error| format!("Failed to read /proc/meminfo: {error}"))?;

    let mut values = std::collections::HashMap::<String, f64>::new();

    for line in contents.lines() {
        let mut parts = line.split_whitespace();

        let Some(key) = parts.next() else {
            continue;
        };

        let Some(value) = parts.next() else {
            continue;
        };

        let value = value
            .parse::<f64>()
            .map_err(|error| format!("Invalid memory value for {key}: {error}"))?;

        // /proc/meminfo values are expressed in KiB.
        values.insert(key.trim_end_matches(':').to_string(), value);
    }

    let total_kib = *values
        .get("MemTotal")
        .ok_or_else(|| "MemTotal not found in /proc/meminfo".to_string())?;

    let available_kib = *values
        .get("MemAvailable")
        .ok_or_else(|| "MemAvailable not found in /proc/meminfo".to_string())?;

    let swap_total_kib = *values.get("SwapTotal").unwrap_or(&0.0);
    let swap_free_kib = *values.get("SwapFree").unwrap_or(&0.0);

    let used_kib = (total_kib - available_kib).max(0.0);
    let swap_used_kib = (swap_total_kib - swap_free_kib).max(0.0);

    // Convert KiB to GiB.
    let kib_to_gib = 1.0 / (1024.0 * 1024.0);

    Ok((
        total_kib * kib_to_gib,
        used_kib * kib_to_gib,
        available_kib * kib_to_gib,
        swap_total_kib * kib_to_gib,
        swap_used_kib * kib_to_gib,
        available_kib,
    ))
}

fn read_uptime() -> Result<f64, String> {
    let contents = fs::read_to_string("/proc/uptime")
        .map_err(|error| format!("Failed to read /proc/uptime: {error}"))?;

    let uptime = contents
        .split_whitespace()
        .next()
        .ok_or_else(|| "Uptime value not found".to_string())?
        .parse::<f64>()
        .map_err(|error| format!("Invalid uptime value: {error}"))?;

    Ok(uptime)
}

fn read_load_average() -> Result<(f64, f64, f64), String> {
    let contents = fs::read_to_string("/proc/loadavg")
        .map_err(|error| format!("Failed to read /proc/loadavg: {error}"))?;

    let mut values = contents.split_whitespace();

    let load_1m = values
        .next()
        .ok_or_else(|| "1-minute load average missing".to_string())?
        .parse::<f64>()
        .map_err(|error| format!("Invalid load average: {error}"))?;

    let load_5m = values
        .next()
        .ok_or_else(|| "5-minute load average missing".to_string())?
        .parse::<f64>()
        .map_err(|error| format!("Invalid load average: {error}"))?;

    let load_15m = values
        .next()
        .ok_or_else(|| "15-minute load average missing".to_string())?
        .parse::<f64>()
        .map_err(|error| format!("Invalid load average: {error}"))?;

    Ok((load_1m, load_5m, load_15m))
}

#[tauri::command]
fn get_system_metrics() -> Result<SystemMetrics, String> {
    let cpu_usage_percent = calculate_cpu_usage()?;

    let (
        memory_total_gb,
        memory_used_gb,
        memory_available_gb,
        swap_total_gb,
        swap_used_gb,
        _,
    ) = read_memory_values()?;

    let memory_usage_percent = if memory_total_gb > 0.0 {
        (memory_used_gb / memory_total_gb) * 100.0
    } else {
        0.0
    };

    let swap_usage_percent = if swap_total_gb > 0.0 {
        (swap_used_gb / swap_total_gb) * 100.0
    } else {
        0.0
    };

    let uptime_seconds = read_uptime()?;

    let (load_average_1m, load_average_5m, load_average_15m) =
        read_load_average()?;

    Ok(SystemMetrics {
        cpu_usage_percent,

        memory_total_gb,
        memory_used_gb,
        memory_available_gb,
        memory_usage_percent,

        swap_total_gb,
        swap_used_gb,
        swap_usage_percent,

        uptime_seconds,

        load_average_1m,
        load_average_5m,
        load_average_15m,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_system_metrics])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}