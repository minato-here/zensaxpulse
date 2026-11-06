use serde::Serialize;
use std::{fs, path::Path};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub name: String,
    pub is_present: bool,
    pub status: String, // "Charging", "Discharging", "Full", "Not charging", "Unknown"
    pub percentage: f64,
    pub health_percentage: f64,
    pub wear_percentage: f64,
    pub cycle_count: Option<u32>,
    pub power_watts: f64,
    pub voltage_volts: f64,
    pub design_voltage_volts: Option<f64>,
    pub energy_now_wh: f64,
    pub energy_full_wh: f64,
    pub energy_design_wh: f64,
    pub technology: String,
    pub model_name: String,
    pub manufacturer: String,
    pub serial_number: Option<String>,
    pub capacity_level: String,
    pub time_to_empty_seconds: Option<u64>,
    pub time_to_full_seconds: Option<u64>,
    pub temperature_c: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerSupplyMetrics {
    pub has_battery: bool,
    pub is_ac_connected: bool,
    pub battery: Option<BatteryInfo>,
    pub ac_adapter_name: Option<String>,
    pub power_sources: Vec<String>,
}

fn read_sys_string(path: &Path, file: &str) -> Option<String> {
    fs::read_to_string(path.join(file))
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn read_sys_u64(path: &Path, file: &str) -> Option<u64> {
    fs::read_to_string(path.join(file))
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
}

fn read_sys_f64(path: &Path, file: &str) -> Option<f64> {
    fs::read_to_string(path.join(file))
        .ok()
        .and_then(|s| s.trim().parse::<f64>().ok())
}

pub fn read_instant_battery_watts() -> Option<f64> {
    let base = Path::new("/sys/class/power_supply");
    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let ptype = read_sys_string(&path, "type").unwrap_or_else(|| "".to_string());
            if ptype.eq_ignore_ascii_case("Battery") || name.starts_with("BAT") {
                if let Some(uw) = read_sys_f64(&path, "power_now") {
                    return Some(uw / 1_000_000.0);
                }
                if let Some(ua) = read_sys_f64(&path, "current_now") {
                    let uv = read_sys_f64(&path, "voltage_now").unwrap_or(0.0);
                    return Some((ua * uv) / 1_000_000_000_000.0);
                }
            }
        }
    }
    None
}

pub fn read_power_supply_metrics(smoothed_power: Option<f64>) -> PowerSupplyMetrics {
    let base = Path::new("/sys/class/power_supply");
    let mut power_sources = Vec::new();
    let mut ac_connected = false;
    let mut ac_adapter_name = None;
    let mut battery_info: Option<BatteryInfo> = None;

    if let Ok(entries) = fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let ptype = read_sys_string(&path, "type").unwrap_or_else(|| "Unknown".to_string());

            power_sources.push(format!("{} ({})", name, ptype));

            // Check AC Adapter / Mains
            if ptype.eq_ignore_ascii_case("Mains") || name.starts_with("AC") || name.starts_with("ADP") {
                if let Some(online) = read_sys_u64(&path, "online") {
                    if online == 1 {
                        ac_connected = true;
                        ac_adapter_name = Some(name.clone());
                    }
                }
            }

            // Check Battery (BAT0, BAT1, etc.)
            if battery_info.is_none() && (ptype.eq_ignore_ascii_case("Battery") || name.starts_with("BAT")) {
                let is_present = read_sys_u64(&path, "present").unwrap_or(1) == 1;

                if is_present {
                    let status = read_sys_string(&path, "status").unwrap_or_else(|| "Unknown".to_string());
                    let capacity = read_sys_f64(&path, "capacity").unwrap_or(0.0);
                    let cycle_count = read_sys_u64(&path, "cycle_count").map(|c| c as u32);
                    let technology = read_sys_string(&path, "technology").unwrap_or_else(|| "Li-ion".to_string());
                    let model_name = read_sys_string(&path, "model_name").unwrap_or_else(|| "Generic Battery".to_string());
                    let manufacturer = read_sys_string(&path, "manufacturer").unwrap_or_else(|| "OEM".to_string());
                    let serial_number = read_sys_string(&path, "serial_number");
                    let capacity_level = read_sys_string(&path, "capacity_level").unwrap_or_else(|| "Normal".to_string());

                    let voltage_uv = read_sys_f64(&path, "voltage_now").unwrap_or(0.0);
                    let voltage_volts = voltage_uv / 1_000_000.0;

                    let design_voltage_uv = read_sys_f64(&path, "voltage_min_design");
                    let design_voltage_volts = design_voltage_uv.map(|v| v / 1_000_000.0);

                    // Power / Current
                    let power_uw = read_sys_f64(&path, "power_now").unwrap_or_else(|| {
                        // If power_now not present, try current_now * voltage_now
                        let current_ua = read_sys_f64(&path, "current_now").unwrap_or(0.0);
                        (current_ua * voltage_uv) / 1_000_000.0
                    });
                    let power_watts = (power_uw / 1_000_000.0 * 100.0).round() / 100.0;

                    // Energy Wh (either from energy_* or charge_* * voltage)
                    let energy_now_uwh = read_sys_f64(&path, "energy_now").unwrap_or_else(|| {
                        let charge_now_uah = read_sys_f64(&path, "charge_now").unwrap_or(0.0);
                        (charge_now_uah * voltage_uv) / 1_000_000.0
                    });

                    let energy_full_uwh = read_sys_f64(&path, "energy_full").unwrap_or_else(|| {
                        let charge_full_uah = read_sys_f64(&path, "charge_full").unwrap_or(0.0);
                        (charge_full_uah * voltage_uv) / 1_000_000.0
                    });

                    let energy_design_uwh = read_sys_f64(&path, "energy_full_design").unwrap_or_else(|| {
                        let charge_design_uah = read_sys_f64(&path, "charge_full_design").unwrap_or(0.0);
                        (charge_design_uah * voltage_uv) / 1_000_000.0
                    });

                    let energy_now_wh = (energy_now_uwh / 1_000_000.0 * 100.0).round() / 100.0;
                    let energy_full_wh = (energy_full_uwh / 1_000_000.0 * 100.0).round() / 100.0;
                    let energy_design_wh = (energy_design_uwh / 1_000_000.0 * 100.0).round() / 100.0;

                    // Health calculation
                    let health_percentage = if energy_design_wh > 0.0 {
                        ((energy_full_wh / energy_design_wh) * 100.0).min(100.0)
                    } else {
                        100.0
                    };
                    let wear_percentage = (100.0 - health_percentage).max(0.0);

                    // Time estimate with smoothing to avoid rapid fluctuations
                    let mut time_to_empty = None;
                    let mut time_to_full = None;

                    let effective_power = smoothed_power.filter(|&p| p > 0.2).unwrap_or(power_watts);

                    if status.eq_ignore_ascii_case("Discharging") && effective_power > 0.3 {
                        let raw_seconds = (energy_now_wh / effective_power * 3600.0) as u64;
                        // Quantize to 5-minute increments (300s) if > 30m, else 1-minute
                        let quantized = if raw_seconds > 1800 {
                            ((raw_seconds + 150) / 300) * 300
                        } else {
                            ((raw_seconds + 30) / 60) * 60
                        };
                        time_to_empty = Some(quantized);
                    } else if status.eq_ignore_ascii_case("Charging") && effective_power > 0.3 && energy_full_wh > energy_now_wh {
                        let raw_seconds = ((energy_full_wh - energy_now_wh) / effective_power * 3600.0) as u64;
                        let quantized = if raw_seconds > 1800 {
                            ((raw_seconds + 150) / 300) * 300
                        } else {
                            ((raw_seconds + 30) / 60) * 60
                        };
                        time_to_full = Some(quantized);
                    }

                    // Optional battery temperature
                    let temp_c = read_sys_f64(&path, "temp").map(|t| t / 10.0);

                    battery_info = Some(BatteryInfo {
                        name,
                        is_present,
                        status,
                        percentage: (capacity * 10.0).round() / 10.0,
                        health_percentage: (health_percentage * 10.0).round() / 10.0,
                        wear_percentage: (wear_percentage * 10.0).round() / 10.0,
                        cycle_count,
                        power_watts,
                        voltage_volts: (voltage_volts * 100.0).round() / 100.0,
                        design_voltage_volts: design_voltage_volts.map(|v| (v * 100.0).round() / 100.0),
                        energy_now_wh,
                        energy_full_wh,
                        energy_design_wh,
                        technology,
                        model_name,
                        manufacturer,
                        serial_number,
                        capacity_level,
                        time_to_empty_seconds: time_to_empty,
                        time_to_full_seconds: time_to_full,
                        temperature_c: temp_c,
                    });
                }
            }
        }
    }

    let has_battery = battery_info.is_some();

    PowerSupplyMetrics {
        has_battery,
        is_ac_connected: ac_connected || !has_battery, // If desktop with no battery, AC is assumed connected
        battery: battery_info,
        ac_adapter_name,
        power_sources,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_power_supply_metrics_does_not_panic() {
        let metrics = read_power_supply_metrics(None);
        // Should execute cleanly on any environment
        assert!(!metrics.power_sources.is_empty() || !metrics.has_battery);
    }
}

