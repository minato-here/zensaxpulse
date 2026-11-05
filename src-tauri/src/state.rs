use serde::Serialize;
use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, Mutex},
    time::Instant,
};

pub const MAX_HISTORY_POINTS: usize = 60;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryPoint {
    pub timestamp: u64,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkHistoryPoint {
    pub timestamp: u64,
    pub rx_bytes_sec: f64,
    pub tx_bytes_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuHistoryPoint {
    pub timestamp: u64,
    pub utilization: f64,
    pub memory_used_mb: f64,
    pub temperature: f64,
}

#[derive(Debug, Clone)]
pub struct CpuCounterSnapshot {
    pub aggregate: (u64, u64), // (total, idle)
    pub per_core: Vec<(u64, u64)>, // (total, idle) per core
    pub timestamp: Instant,
}

#[derive(Debug, Clone)]
pub struct NetCounterSnapshot {
    pub interfaces: HashMap<String, (u64, u64)>, // name -> (rx_bytes, tx_bytes)
    pub total_rx: u64,
    pub total_tx: u64,
    pub timestamp: Instant,
}

#[derive(Debug, Clone)]
pub struct DiskCounterSnapshot {
    pub devices: HashMap<String, (u64, u64)>, // device -> (sectors_read, sectors_written)
    pub timestamp: Instant,
}

pub struct TelemetryState {
    pub last_cpu: Option<CpuCounterSnapshot>,
    pub last_net: Option<NetCounterSnapshot>,
    pub last_disk: Option<DiskCounterSnapshot>,

    pub cpu_history: VecDeque<HistoryPoint>,
    pub memory_history: VecDeque<HistoryPoint>,
    pub network_history: VecDeque<NetworkHistoryPoint>,
    pub gpu_history: HashMap<String, VecDeque<GpuHistoryPoint>>,

    // Cached recent telemetry values for instantaneous zero-latency responses
    pub cached_cpu_usage: f64,
    pub cached_per_core_usage: Vec<f64>,
    pub cached_net_rx_rate: f64,
    pub cached_net_tx_rate: f64,
    pub cached_iface_rates: HashMap<String, (f64, f64)>,
    pub cached_disk_read_rate: f64,
    pub cached_disk_write_rate: f64,
}

impl Default for TelemetryState {
    fn default() -> Self {
        Self {
            last_cpu: None,
            last_net: None,
            last_disk: None,
            cpu_history: VecDeque::with_capacity(MAX_HISTORY_POINTS),
            memory_history: VecDeque::with_capacity(MAX_HISTORY_POINTS),
            network_history: VecDeque::with_capacity(MAX_HISTORY_POINTS),
            gpu_history: HashMap::new(),
            cached_cpu_usage: 0.0,
            cached_per_core_usage: Vec::new(),
            cached_net_rx_rate: 0.0,
            cached_net_tx_rate: 0.0,
            cached_iface_rates: HashMap::new(),
            cached_disk_read_rate: 0.0,
            cached_disk_write_rate: 0.0,
        }
    }
}

pub type SharedTelemetryState = Arc<Mutex<TelemetryState>>;

pub fn create_shared_state() -> SharedTelemetryState {
    Arc::new(Mutex::new(TelemetryState::default()))
}

