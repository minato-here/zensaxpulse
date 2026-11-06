pub mod commands;
pub mod state;
pub mod telemetry;

use state::{
    create_shared_state, GpuHistoryPoint, HistoryPoint, NetworkHistoryPoint,
    SharedTelemetryState, MAX_HISTORY_POINTS,
};
use std::{
    sync::Arc,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use telemetry::{battery, cpu, gpu, memory, network, storage};

fn current_timestamp_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// Background sampler running every 1000ms
fn run_telemetry_collector(state: SharedTelemetryState) {
    thread::spawn(move || {
        let mut gpu_tick_counter = 0u64;

        loop {
            let now = Instant::now();
            let timestamp = current_timestamp_secs();

            // 1. CPU Counters
            if let Ok((agg, per_core)) = cpu::read_raw_cpu_counters() {
                let mut guard = state.lock().unwrap();
                let prev_cpu = guard.last_cpu.clone();

                if let Some(prev) = prev_cpu {
                    let cpu_pct = cpu::calculate_percentage(prev.aggregate, agg);
                    guard.cached_cpu_usage = cpu_pct;

                    let mut core_pcts = Vec::with_capacity(per_core.len());
                    for (i, &current_c) in per_core.iter().enumerate() {
                        let prev_c = prev.per_core.get(i).copied().unwrap_or(current_c);
                        core_pcts.push(cpu::calculate_percentage(prev_c, current_c));
                    }
                    guard.cached_per_core_usage = core_pcts;

                    if guard.cpu_history.len() >= MAX_HISTORY_POINTS {
                        guard.cpu_history.pop_front();
                    }
                    guard.cpu_history.push_back(HistoryPoint {
                        timestamp,
                        value: (cpu_pct * 10.0).round() / 10.0,
                    });
                }

                guard.last_cpu = Some(state::CpuCounterSnapshot {
                    aggregate: agg,
                    per_core,
                    timestamp: now,
                });
            }

            // 2. Memory
            if let Ok(mem) = memory::read_memory_metrics() {
                let mut guard = state.lock().unwrap();
                if guard.memory_history.len() >= MAX_HISTORY_POINTS {
                    guard.memory_history.pop_front();
                }
                guard.memory_history.push_back(HistoryPoint {
                    timestamp,
                    value: (mem.ram_usage_percent * 10.0).round() / 10.0,
                });
            }

            // 3. Network
            let net_raw = network::read_proc_net_dev();
            let mut total_rx = 0u64;
            let mut total_tx = 0u64;
            let mut iface_map = std::collections::HashMap::new();

            for (ifname, entry) in &net_raw {
                iface_map.insert(ifname.clone(), (entry.rx_bytes, entry.tx_bytes));
                if ifname != "lo" {
                    total_rx += entry.rx_bytes;
                    total_tx += entry.tx_bytes;
                }
            }

            {
                let mut guard = state.lock().unwrap();
                let prev_net = guard.last_net.clone();

                if let Some(prev) = prev_net {
                    let elapsed = now.duration_since(prev.timestamp).as_secs_f64();
                    if elapsed > 0.1 {
                        let rx_delta = total_rx.saturating_sub(prev.total_rx);
                        let tx_delta = total_tx.saturating_sub(prev.total_tx);

                        let rx_rate = rx_delta as f64 / elapsed;
                        let tx_rate = tx_delta as f64 / elapsed;

                        guard.cached_net_rx_rate = rx_rate;
                        guard.cached_net_tx_rate = tx_rate;

                        // Per interface rates
                        let mut if_rates = std::collections::HashMap::new();
                        for (name, &(rx, tx)) in &iface_map {
                            if let Some(&(prev_rx, prev_tx)) = prev.interfaces.get(name) {
                                let irx = (rx.saturating_sub(prev_rx) as f64) / elapsed;
                                let itx = (tx.saturating_sub(prev_tx) as f64) / elapsed;
                                if_rates.insert(name.clone(), (irx, itx));
                            }
                        }
                        guard.cached_iface_rates = if_rates;

                        if guard.network_history.len() >= MAX_HISTORY_POINTS {
                            guard.network_history.pop_front();
                        }
                        guard.network_history.push_back(NetworkHistoryPoint {
                            timestamp,
                            rx_bytes_sec: rx_rate,
                            tx_bytes_sec: tx_rate,
                        });
                    }
                }

                guard.last_net = Some(state::NetCounterSnapshot {
                    interfaces: iface_map,
                    total_rx,
                    total_tx,
                    timestamp: now,
                });
            }

            // 4. Disk stats deltas
            let disk_raw = storage::read_diskstats();
            {
                let mut guard = state.lock().unwrap();
                let prev_disk = guard.last_disk.clone();

                if let Some(prev) = prev_disk {
                    let elapsed = now.duration_since(prev.timestamp).as_secs_f64();
                    if elapsed > 0.1 {
                        let mut total_read_sectors = 0u64;
                        let mut total_written_sectors = 0u64;

                        for (dev, &(r, w)) in &disk_raw {
                            if let Some(&(pr, pw)) = prev.devices.get(dev) {
                                total_read_sectors += r.saturating_sub(pr);
                                total_written_sectors += w.saturating_sub(pw);
                            }
                        }

                        let read_bytes = (total_read_sectors as f64) * 512.0;
                        let written_bytes = (total_written_sectors as f64) * 512.0;

                        guard.cached_disk_read_rate = (read_bytes / (1024.0 * 1024.0)) / elapsed;
                        guard.cached_disk_write_rate = (written_bytes / (1024.0 * 1024.0)) / elapsed;
                    }
                }

                guard.last_disk = Some(state::DiskCounterSnapshot {
                    devices: disk_raw,
                    timestamp: now,
                });
            }

            // 5. GPU Sampling (every 2 seconds)
            gpu_tick_counter += 1;
            if gpu_tick_counter % 2 == 0 {
                let cached_gpus = gpu::detect_all_gpus();
                let mut guard = state.lock().unwrap();
                for g in cached_gpus {
                    let history = guard.gpu_history.entry(g.id.clone()).or_default();
                    if history.len() >= MAX_HISTORY_POINTS {
                        history.pop_front();
                    }
                    history.push_back(GpuHistoryPoint {
                        timestamp,
                        utilization: g.utilization_percent.unwrap_or(0.0),
                        memory_used_mb: g.memory_used_mb.unwrap_or(0.0),
                        temperature: g.temperature_c.unwrap_or(0.0),
                    });
                }
            }

            // 6. Battery Power Smoothing (every 1 second)
            if let Some(w) = battery::read_instant_battery_watts() {
                if w > 0.05 {
                    let mut guard = state.lock().unwrap();
                    let prev = guard.cached_battery_power.unwrap_or(w);
                    guard.cached_battery_power = Some(0.08 * w + 0.92 * prev);
                }
            }

            thread::sleep(Duration::from_millis(1000));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = create_shared_state();

    // Start background telemetry collector thread
    run_telemetry_collector(Arc::clone(&state));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_system_metrics,
            commands::get_system_overview,
            commands::get_cpu_metrics,
            commands::get_gpu_metrics,
            commands::get_memory_metrics,
            commands::get_storage_metrics,
            commands::get_network_metrics,
            commands::get_battery_metrics,
            commands::get_sensor_metrics,
            commands::get_process_list,
            commands::kill_process,
            commands::get_system_info,
            commands::get_system_services,
            commands::control_system_service,
            commands::system_power_action,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
