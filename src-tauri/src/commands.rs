use crate::state::SharedTelemetryState;
use serde::Serialize;
use tauri::State;
use crate::telemetry::{
    cpu::{self, CpuMetrics},
    gpu::{self, GpuMetrics},
    memory::{self, MemoryMetrics},
    network::{self, NetworkMetrics},
    processes::{self, ProcessInfo},
    sensors::{self, SensorMetrics},
    storage::{self, StorageMetrics},
    system::{self, ServicesReport, SystemInfo},
};
use crate::state::{HistoryPoint, NetworkHistoryPoint};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemOverview {
    pub cpu_usage_percent: f64,

    pub memory_total_gb: f64,
    pub memory_used_gb: f64,
    pub memory_available_gb: f64,
    pub memory_usage_percent: f64,

    pub swap_total_gb: f64,
    pub swap_used_gb: f64,
    pub swap_usage_percent: f64,

    pub uptime_seconds: f64,

    pub load_average_1m: f64,
    pub load_average_5m: f64,
    pub load_average_15m: f64,

    pub gpu_usage_percent: Option<f64>,
    pub gpu_memory_used_gb: Option<f64>,
    pub gpu_memory_total_gb: Option<f64>,
    pub gpu_temperature_c: Option<f64>,

    pub storage_total_gb: Option<f64>,
    pub storage_used_gb: Option<f64>,
    pub storage_usage_percent: Option<f64>,

    pub net_rx_speed_bytes_sec: f64,
    pub net_tx_speed_bytes_sec: f64,
    pub active_interface: String,

    pub cpu_model: String,
    pub gpu_model: String,
    pub cpu_temp_c: Option<f64>,

    pub network_history: Vec<NetworkHistoryPoint>,
    pub cpu_history: Vec<HistoryPoint>,
    pub memory_history: Vec<HistoryPoint>,
}

#[tauri::command]
pub fn get_system_overview(state: State<'_, SharedTelemetryState>) -> Result<SystemOverview, String> {
    let guard = state.lock().unwrap();

    let (cpu_model, _, _) = cpu::read_cpu_info();
    let (l1, l5, l15) = cpu::read_load_averages();
    let cpu_temp = cpu::read_cpu_temperature();
    let mem = memory::read_memory_metrics().unwrap_or_else(|_| memory::MemoryMetrics {
        total_ram_gb: 0.0,
        used_ram_gb: 0.0,
        available_ram_gb: 0.0,
        free_ram_gb: 0.0,
        cached_ram_gb: 0.0,
        buffers_ram_gb: 0.0,
        ram_usage_percent: 0.0,
        total_swap_gb: 0.0,
        used_swap_gb: 0.0,
        free_swap_gb: 0.0,
        swap_usage_percent: 0.0,
        shared_mb: 0.0,
        slab_mb: 0.0,
        dirty_mb: 0.0,
        writeback_mb: 0.0,
        history: Vec::new(),
    });

    let storage_m = storage::read_storage_metrics(guard.cached_disk_read_rate, guard.cached_disk_write_rate);
    let gpus = gpu::detect_all_gpus();
    let primary_gpu = gpus.iter().find(|g| !g.is_integrated).or_else(|| gpus.first());

    let (gpu_usage, gpu_mem_used, gpu_mem_total, gpu_temp, gpu_model) = match primary_gpu {
        Some(g) => (
            g.utilization_percent,
            g.memory_used_mb.map(|mb| mb / 1024.0),
            g.memory_total_mb.map(|mb| mb / 1024.0),
            g.temperature_c,
            g.name.clone(),
        ),
        None => (None, None, None, None, "GPU telemetry unavailable".to_string()),
    };

    let uptime = std::fs::read_to_string("/proc/uptime")
        .ok()
        .and_then(|s| s.split_whitespace().next().and_then(|v| v.parse::<f64>().ok()))
        .unwrap_or(0.0);

    let net_history = guard.network_history.iter().cloned().collect();
    let cpu_history = guard.cpu_history.iter().cloned().collect();
    let memory_history = guard.memory_history.iter().cloned().collect();

    Ok(SystemOverview {
        cpu_usage_percent: (guard.cached_cpu_usage * 10.0).round() / 10.0,
        memory_total_gb: mem.total_ram_gb,
        memory_used_gb: mem.used_ram_gb,
        memory_available_gb: mem.available_ram_gb,
        memory_usage_percent: mem.ram_usage_percent,
        swap_total_gb: mem.total_swap_gb,
        swap_used_gb: mem.used_swap_gb,
        swap_usage_percent: mem.swap_usage_percent,
        uptime_seconds: uptime,
        load_average_1m: l1,
        load_average_5m: l5,
        load_average_15m: l15,
        gpu_usage_percent: gpu_usage,
        gpu_memory_used_gb: gpu_mem_used,
        gpu_memory_total_gb: gpu_mem_total,
        gpu_temperature_c: gpu_temp,
        storage_total_gb: storage_m.root_total_gb,
        storage_used_gb: storage_m.root_used_gb,
        storage_usage_percent: storage_m.root_usage_percent,
        net_rx_speed_bytes_sec: guard.cached_net_rx_rate,
        net_tx_speed_bytes_sec: guard.cached_net_tx_rate,
        active_interface: "wlp4s0".to_string(),
        cpu_model,
        gpu_model,
        cpu_temp_c: cpu_temp,
        network_history: net_history,
        cpu_history,
        memory_history,
    })
}

#[tauri::command]
pub fn get_system_metrics(state: State<'_, SharedTelemetryState>) -> Result<SystemOverview, String> {
    get_system_overview(state)
}

#[tauri::command]
pub fn get_cpu_metrics(state: State<'_, SharedTelemetryState>) -> Result<CpuMetrics, String> {
    let guard = state.lock().unwrap();
    let (model_name, physical_cores, logical_threads) = cpu::read_cpu_info();
    let (core_frequencies_mhz, min_frequency_mhz, max_frequency_mhz) = cpu::read_core_frequencies();
    let (load_average_1m, load_average_5m, load_average_15m) = cpu::read_load_averages();
    let temperature_c = cpu::read_cpu_temperature();
    let power_w = cpu::read_cpu_power();
    let history = guard.cpu_history.iter().cloned().collect();

    Ok(CpuMetrics {
        usage_percent: (guard.cached_cpu_usage * 10.0).round() / 10.0,
        per_core_usage: guard.cached_per_core_usage.clone(),
        model_name,
        physical_cores,
        logical_threads,
        core_frequencies_mhz,
        min_frequency_mhz,
        max_frequency_mhz,
        load_average_1m,
        load_average_5m,
        load_average_15m,
        temperature_c,
        power_w,
        history,
    })
}

#[tauri::command]
pub fn get_gpu_metrics(state: State<'_, SharedTelemetryState>) -> Result<GpuMetrics, String> {
    let guard = state.lock().unwrap();
    let mut devices = gpu::detect_all_gpus();

    for d in &mut devices {
        if let Some(hist) = guard.gpu_history.get(&d.id) {
            d.history = hist.iter().cloned().collect();
        }
    }

    let selected_device_id = devices.first().map(|d| d.id.clone());

    Ok(GpuMetrics {
        devices,
        selected_device_id,
    })
}

#[tauri::command]
pub fn get_memory_metrics(state: State<'_, SharedTelemetryState>) -> Result<MemoryMetrics, String> {
    let guard = state.lock().unwrap();
    let mut mem = memory::read_memory_metrics()?;
    mem.history = guard.memory_history.iter().cloned().collect();
    Ok(mem)
}

#[tauri::command]
pub fn get_storage_metrics(state: State<'_, SharedTelemetryState>) -> Result<StorageMetrics, String> {
    let guard = state.lock().unwrap();
    Ok(storage::read_storage_metrics(
        guard.cached_disk_read_rate,
        guard.cached_disk_write_rate,
    ))
}

#[tauri::command]
pub fn get_network_metrics(state: State<'_, SharedTelemetryState>) -> Result<NetworkMetrics, String> {
    let guard = state.lock().unwrap();
    let mut net = network::read_network_metrics(
        guard.cached_net_rx_rate,
        guard.cached_net_tx_rate,
        &guard.cached_iface_rates,
    );
    net.history = guard.network_history.iter().cloned().collect();
    Ok(net)
}

#[tauri::command]
pub fn get_sensor_metrics() -> Result<SensorMetrics, String> {
    Ok(sensors::read_sensor_metrics())
}

#[tauri::command]
pub fn get_process_list(limit: Option<usize>) -> Result<Vec<ProcessInfo>, String> {
    Ok(processes::list_processes(limit))
}

#[tauri::command]
pub fn kill_process(pid: u32, signal: String) -> Result<String, String> {
    processes::kill_process_by_pid(pid, &signal)
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    Ok(system::read_system_info())
}

#[tauri::command]
pub fn get_system_services() -> Result<ServicesReport, String> {
    Ok(system::list_systemd_services())
}

#[tauri::command]
pub fn control_system_service(service_name: String, action: String) -> Result<String, String> {
    system::control_systemd_service(&service_name, &action)
}

#[tauri::command]
pub fn system_power_action(action: String) -> Result<String, String> {
    system::execute_power_action(&action)
}

