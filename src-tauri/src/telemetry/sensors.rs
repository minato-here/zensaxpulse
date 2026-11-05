use serde::Serialize;
use std::fs;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorReading {
    pub id: String,
    pub name: String,
    pub category: String, // "CPU", "GPU", "Storage", "Motherboard", "Fan", "Voltage", "Power", "Battery"
    pub value: f64,
    pub unit: String,     // "°C", "RPM", "V", "W"
    pub source: String,   // e.g. "hwmon5 (k10temp)", "hwmon6 (lenovo_wmi_other)"
    pub critical_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorMetrics {
    pub cpu_temperatures: Vec<SensorReading>,
    pub gpu_temperatures: Vec<SensorReading>,
    pub storage_temperatures: Vec<SensorReading>,
    pub motherboard_temperatures: Vec<SensorReading>,
    pub fans: Vec<SensorReading>,
    pub voltages: Vec<SensorReading>,
    pub power: Vec<SensorReading>,
}

pub fn read_sensor_metrics() -> SensorMetrics {
    let mut cpu_temps = Vec::new();
    let mut gpu_temps = Vec::new();
    let mut storage_temps = Vec::new();
    let mut mb_temps = Vec::new();
    let mut fans = Vec::new();
    let mut voltages = Vec::new();
    let mut power = Vec::new();

    // 1. Scan /sys/class/hwmon
    if let Ok(entries) = fs::read_dir("/sys/class/hwmon") {
        for entry in entries.flatten() {
            let hwmon_path = entry.path();
            let hwmon_id = entry.file_name().to_string_lossy().to_string();

            let driver_name = fs::read_to_string(hwmon_path.join("name"))
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|_| "unknown".to_string());

            let source = format!("{hwmon_id} ({driver_name})");

            // Categorize driver
            let is_cpu = driver_name == "k10temp" || driver_name == "coretemp" || driver_name == "zenpower";
            let is_gpu = driver_name == "amdgpu" || driver_name.contains("nouveau") || driver_name.contains("nvidia");
            let is_storage = driver_name.starts_with("nvme") || driver_name == "drivetemp";

            // Temperatures
            for i in 1..=16 {
                let temp_input = hwmon_path.join(format!("temp{i}_input"));
                if !temp_input.exists() {
                    continue;
                }

                if let Ok(val_str) = fs::read_to_string(&temp_input) {
                    if let Ok(millis) = val_str.trim().parse::<f64>() {
                        let c = millis / 1000.0;
                        if c < -50.0 || c > 150.0 {
                            continue; // Skip bogus readings
                        }

                        let label = fs::read_to_string(hwmon_path.join(format!("temp{i}_label")))
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|_| format!("Temperature {i}"));

                        let crit = fs::read_to_string(hwmon_path.join(format!("temp{i}_crit")))
                            .ok()
                            .and_then(|s| s.trim().parse::<f64>().ok())
                            .map(|m| m / 1000.0);

                        let reading = SensorReading {
                            id: format!("{hwmon_id}-temp{i}"),
                            name: format!("{driver_name} - {label}"),
                            category: if is_cpu {
                                "CPU".to_string()
                            } else if is_gpu {
                                "GPU".to_string()
                            } else if is_storage {
                                "Storage".to_string()
                            } else {
                                "Motherboard".to_string()
                            },
                            value: (c * 10.0).round() / 10.0,
                            unit: "°C".to_string(),
                            source: source.clone(),
                            critical_value: crit,
                        };

                        if is_cpu {
                            cpu_temps.push(reading);
                        } else if is_gpu {
                            gpu_temps.push(reading);
                        } else if is_storage {
                            storage_temps.push(reading);
                        } else {
                            mb_temps.push(reading);
                        }
                    }
                }
            }

            // Fans
            for i in 1..=8 {
                let fan_input = hwmon_path.join(format!("fan{i}_input"));
                if !fan_input.exists() {
                    continue;
                }

                if let Ok(val_str) = fs::read_to_string(&fan_input) {
                    if let Ok(rpm) = val_str.trim().parse::<f64>() {
                        let label = fs::read_to_string(hwmon_path.join(format!("fan{i}_label")))
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|_| format!("Fan {i}"));

                        fans.push(SensorReading {
                            id: format!("{hwmon_id}-fan{i}"),
                            name: format!("{driver_name} - {label}"),
                            category: "Fan".to_string(),
                            value: rpm,
                            unit: "RPM".to_string(),
                            source: source.clone(),
                            critical_value: None,
                        });
                    }
                }
            }

            // Voltages
            for i in 0..=8 {
                let in_input = hwmon_path.join(format!("in{i}_input"));
                if !in_input.exists() {
                    continue;
                }

                if let Ok(val_str) = fs::read_to_string(&in_input) {
                    if let Ok(millis) = val_str.trim().parse::<f64>() {
                        let volts = millis / 1000.0;
                        let label = fs::read_to_string(hwmon_path.join(format!("in{i}_label")))
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|_| format!("Voltage {i}"));

                        voltages.push(SensorReading {
                            id: format!("{hwmon_id}-in{i}"),
                            name: format!("{driver_name} - {label}"),
                            category: "Voltage".to_string(),
                            value: (volts * 1000.0).round() / 1000.0,
                            unit: "V".to_string(),
                            source: source.clone(),
                            critical_value: None,
                        });
                    }
                }
            }

            // Power
            for i in 1..=4 {
                let pwr1 = hwmon_path.join(format!("power{i}_input"));
                let pwr_path = if pwr1.exists() {
                    pwr1
                } else {
                    hwmon_path.join(format!("power{i}_average"))
                };

                if !pwr_path.exists() {
                    continue;
                }

                if let Ok(val_str) = fs::read_to_string(&pwr_path) {
                    if let Ok(microwatts) = val_str.trim().parse::<f64>() {
                        let watts = microwatts / 1_000_000.0;
                        let label = fs::read_to_string(hwmon_path.join(format!("power{i}_label")))
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|_| format!("Power {i}"));

                        power.push(SensorReading {
                            id: format!("{hwmon_id}-power{i}"),
                            name: format!("{driver_name} - {label}"),
                            category: "Power".to_string(),
                            value: (watts * 10.0).round() / 10.0,
                            unit: "W".to_string(),
                            source: source.clone(),
                            critical_value: None,
                        });
                    }
                }
            }
        }
    }

    // 2. Also check NVIDIA GPU temperature via nvidia-smi if not already present
    if gpu_temps.is_empty() {
        if let Ok(out) = std::process::Command::new("nvidia-smi")
            .args(["--query-gpu=name,temperature.gpu", "--format=csv,noheader,nounits"])
            .output()
        {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout);
                for (idx, line) in s.lines().enumerate() {
                    let parts: Vec<&str> = line.split(',').map(str::trim).collect();
                    if parts.len() >= 2 {
                        if let Ok(temp) = parts[1].parse::<f64>() {
                            gpu_temps.push(SensorReading {
                                id: format!("nvidia-temp-{idx}"),
                                name: parts[0].to_string(),
                                category: "GPU".to_string(),
                                value: temp,
                                unit: "°C".to_string(),
                                source: "nvidia-smi".to_string(),
                                critical_value: Some(100.0),
                            });
                        }
                    }
                }
            }
        }
    }

    SensorMetrics {
        cpu_temperatures: cpu_temps,
        gpu_temperatures: gpu_temps,
        storage_temperatures: storage_temps,
        motherboard_temperatures: mb_temps,
        fans,
        voltages,
        power,
    }
}
