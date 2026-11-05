use crate::state::HistoryPoint;
use serde::Serialize;
use std::{collections::HashMap, fs};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryMetrics {
    pub total_ram_gb: f64,
    pub used_ram_gb: f64,
    pub available_ram_gb: f64,
    pub free_ram_gb: f64,
    pub cached_ram_gb: f64,
    pub buffers_ram_gb: f64,
    pub ram_usage_percent: f64,

    pub total_swap_gb: f64,
    pub used_swap_gb: f64,
    pub free_swap_gb: f64,
    pub swap_usage_percent: f64,

    // Additional detailed Linux memory statistics (in MB)
    pub shared_mb: f64,
    pub slab_mb: f64,
    pub dirty_mb: f64,
    pub writeback_mb: f64,

    pub history: Vec<HistoryPoint>,
}

pub fn read_memory_metrics() -> Result<MemoryMetrics, String> {
    let contents = fs::read_to_string("/proc/meminfo")
        .map_err(|e| format!("Failed to read /proc/meminfo: {e}"))?;

    let mut map = HashMap::new();
    for line in contents.lines() {
        let mut parts = line.split_whitespace();
        if let (Some(key), Some(val)) = (parts.next(), parts.next()) {
            if let Ok(num) = val.parse::<f64>() {
                map.insert(key.trim_end_matches(':'), num);
            }
        }
    }

    let kib_to_gib = 1.0 / (1024.0 * 1024.0);
    let kib_to_mib = 1.0 / 1024.0;

    let total_kib = map.get("MemTotal").copied().unwrap_or(0.0);
    let free_kib = map.get("MemFree").copied().unwrap_or(0.0);
    let available_kib = map.get("MemAvailable").copied().unwrap_or(free_kib);
    let buffers_kib = map.get("Buffers").copied().unwrap_or(0.0);
    let cached_kib = map.get("Cached").copied().unwrap_or(0.0);
    let sreclaimable_kib = map.get("SReclaimable").copied().unwrap_or(0.0);
    let shmem_kib = map.get("Shmem").copied().unwrap_or(0.0);
    let slab_kib = map.get("Slab").copied().unwrap_or(0.0);
    let dirty_kib = map.get("Dirty").copied().unwrap_or(0.0);
    let writeback_kib = map.get("Writeback").copied().unwrap_or(0.0);

    let total_swap_kib = map.get("SwapTotal").copied().unwrap_or(0.0);
    let free_swap_kib = map.get("SwapFree").copied().unwrap_or(0.0);

    let effective_cached_kib = cached_kib + sreclaimable_kib;
    let used_kib = (total_kib - available_kib).max(0.0);
    let used_swap_kib = (total_swap_kib - free_swap_kib).max(0.0);

    let ram_usage_percent = if total_kib > 0.0 {
        ((used_kib / total_kib) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    let swap_usage_percent = if total_swap_kib > 0.0 {
        ((used_swap_kib / total_swap_kib) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    Ok(MemoryMetrics {
        total_ram_gb: total_kib * kib_to_gib,
        used_ram_gb: used_kib * kib_to_gib,
        available_ram_gb: available_kib * kib_to_gib,
        free_ram_gb: free_kib * kib_to_gib,
        cached_ram_gb: effective_cached_kib * kib_to_gib,
        buffers_ram_gb: buffers_kib * kib_to_gib,
        ram_usage_percent,

        total_swap_gb: total_swap_kib * kib_to_gib,
        used_swap_gb: used_swap_kib * kib_to_gib,
        free_swap_gb: free_swap_kib * kib_to_gib,
        swap_usage_percent,

        shared_mb: shmem_kib * kib_to_mib,
        slab_mb: slab_kib * kib_to_mib,
        dirty_mb: dirty_kib * kib_to_mib,
        writeback_mb: writeback_kib * kib_to_mib,

        history: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_metrics_calculation() {
        let metrics = read_memory_metrics();
        assert!(metrics.is_ok());
        let m = metrics.unwrap();
        assert!(m.total_ram_gb > 0.0);
        assert!(m.ram_usage_percent >= 0.0 && m.ram_usage_percent <= 100.0);
    }
}

