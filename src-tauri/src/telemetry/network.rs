use crate::state::NetworkHistoryPoint;
use serde::Serialize;
use std::{collections::HashMap, fs, path::Path, process::Command};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    pub name: String,
    pub interface_type: String, // "WiFi", "Ethernet", "Loopback", "Virtual"
    pub state: String,          // "UP", "DOWN", "UNKNOWN"
    pub mac_address: Option<String>,
    pub ipv4_address: Option<String>,
    pub ipv6_address: Option<String>,
    pub rx_speed_bytes_sec: f64,
    pub tx_speed_bytes_sec: f64,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
    pub rx_errors: u64,
    pub tx_errors: u64,
    pub rx_drops: u64,
    pub tx_drops: u64,
    pub speed_mbps: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SocketConnection {
    pub protocol: String,
    pub state: String,
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub process: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkMetrics {
    pub total_rx_speed_bytes_sec: f64,
    pub total_tx_speed_bytes_sec: f64,
    pub active_interface_name: String,
    pub interfaces: Vec<NetworkInterface>,
    pub connections: Vec<SocketConnection>,
    pub history: Vec<NetworkHistoryPoint>,
}

#[derive(Debug, Clone, Default)]
pub struct RawNetDevEntry {
    pub rx_bytes: u64,
    pub rx_packets: u64,
    pub rx_errors: u64,
    pub rx_drops: u64,
    pub tx_bytes: u64,
    pub tx_packets: u64,
    pub tx_errors: u64,
    pub tx_drops: u64,
}

pub fn read_proc_net_dev() -> HashMap<String, RawNetDevEntry> {
    let mut map = HashMap::new();
    let contents = fs::read_to_string("/proc/net/dev").unwrap_or_default();

    for line in contents.lines().skip(2) {
        if let Some((name_part, stats_part)) = line.split_once(':') {
            let name = name_part.trim().to_string();
            let fields: Vec<u64> = stats_part
                .split_whitespace()
                .filter_map(|s| s.parse::<u64>().ok())
                .collect();

            if fields.len() >= 16 {
                map.insert(
                    name,
                    RawNetDevEntry {
                        rx_bytes: fields[0],
                        rx_packets: fields[1],
                        rx_errors: fields[2],
                        rx_drops: fields[3],
                        tx_bytes: fields[8],
                        tx_packets: fields[9],
                        tx_errors: fields[10],
                        tx_drops: fields[11],
                    },
                );
            }
        }
    }

    // Complement with /sys/class/net for interfaces not present or down in /proc/net/dev
    if let Ok(entries) = fs::read_dir("/sys/class/net") {
        for entry in entries.flatten() {
            let ifname = entry.file_name().to_string_lossy().to_string();
            if !map.contains_key(&ifname) {
                let stat_dir = entry.path().join("statistics");
                let read_u64 = |file: &str| -> u64 {
                    fs::read_to_string(stat_dir.join(file))
                        .ok()
                        .and_then(|s| s.trim().parse::<u64>().ok())
                        .unwrap_or(0)
                };

                map.insert(
                    ifname,
                    RawNetDevEntry {
                        rx_bytes: read_u64("rx_bytes"),
                        rx_packets: read_u64("rx_packets"),
                        rx_errors: read_u64("rx_errors"),
                        rx_drops: read_u64("rx_dropped"),
                        tx_bytes: read_u64("tx_bytes"),
                        tx_packets: read_u64("tx_packets"),
                        tx_errors: read_u64("tx_errors"),
                        tx_drops: read_u64("tx_dropped"),
                    },
                );
            }
        }
    }

    map
}

pub fn read_network_metrics(
    total_rx_speed: f64,
    total_tx_speed: f64,
    iface_rates: &HashMap<String, (f64, f64)>,
) -> NetworkMetrics {
    let raw_stats = read_proc_net_dev();
    let ip_info = get_ip_info();

    let mut interfaces = Vec::new();

    for (name, raw) in &raw_stats {
        let (rx_speed, tx_speed) = iface_rates.get(name).copied().unwrap_or((0.0, 0.0));
        let (ipv4, ipv6, mac_from_ip) = ip_info.get(name).cloned().unwrap_or((None, None, None));

        let sys_path = Path::new("/sys/class/net").join(name);

        let mac = mac_from_ip.or_else(|| {
            fs::read_to_string(sys_path.join("address"))
                .ok()
                .map(|s| s.trim().to_string())
        });

        let state = fs::read_to_string(sys_path.join("operstate"))
            .ok()
            .map(|s| s.trim().to_uppercase())
            .unwrap_or_else(|| "UNKNOWN".to_string());

        let speed_mbps = fs::read_to_string(sys_path.join("speed"))
            .ok()
            .and_then(|s| s.trim().parse::<i64>().ok())
            .filter(|&s| s > 0);

        let interface_type = if name == "lo" {
            "Loopback".to_string()
        } else if name.starts_with("wl") || name.starts_with("wlan") {
            "WiFi".to_string()
        } else if name.starts_with("en") || name.starts_with("eth") {
            "Ethernet".to_string()
        } else if name.starts_with("docker") || name.starts_with("br-") || name.starts_with("veth") {
            "Virtual / Bridge".to_string()
        } else if name.starts_with("tun") || name.starts_with("tap") || name.starts_with("wg") {
            "VPN / Tunnel".to_string()
        } else {
            "Network Interface".to_string()
        };

        interfaces.push(NetworkInterface {
            name: name.clone(),
            interface_type,
            state,
            mac_address: mac,
            ipv4_address: ipv4,
            ipv6_address: ipv6,
            rx_speed_bytes_sec: rx_speed,
            tx_speed_bytes_sec: tx_speed,
            rx_bytes: raw.rx_bytes,
            tx_bytes: raw.tx_bytes,
            rx_packets: raw.rx_packets,
            tx_packets: raw.tx_packets,
            rx_errors: raw.rx_errors,
            tx_errors: raw.tx_errors,
            rx_drops: raw.rx_drops,
            tx_drops: raw.tx_drops,
            speed_mbps,
        });
    }

    // Sort interfaces: non-loopback UP first, then others
    interfaces.sort_by(|a, b| {
        let score_a = if a.name == "lo" {
            0
        } else if a.state == "UP" {
            2
        } else {
            1
        };
        let score_b = if b.name == "lo" {
            0
        } else if b.state == "UP" {
            2
        } else {
            1
        };
        score_b.cmp(&score_a).then_with(|| a.name.cmp(&b.name))
    });

    let active_name = interfaces
        .iter()
        .find(|i| i.name != "lo" && i.state == "UP")
        .map(|i| i.name.clone())
        .unwrap_or_else(|| {
            interfaces
                .first()
                .map(|i| i.name.clone())
                .unwrap_or_else(|| "lo".to_string())
        });

    let connections = read_socket_connections();

    NetworkMetrics {
        total_rx_speed_bytes_sec: total_rx_speed,
        total_tx_speed_bytes_sec: total_tx_speed,
        active_interface_name: active_name,
        interfaces,
        connections,
        history: Vec::new(),
    }
}

fn get_ip_info() -> HashMap<String, (Option<String>, Option<String>, Option<String>)> {
    let mut map = HashMap::new();

    let output = Command::new("ip")
        .args(["-j", "addr"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                if let Some(arr) = json.as_array() {
                    for item in arr {
                        let ifname = item.get("ifname").and_then(|v| v.as_str()).unwrap_or("");
                        let mac = item.get("address").and_then(|v| v.as_str()).map(|s| s.to_string());

                        let mut ipv4 = None;
                        let mut ipv6 = None;

                        if let Some(addrs) = item.get("addr_info").and_then(|v| v.as_array()) {
                            for addr in addrs {
                                let family = addr.get("family").and_then(|v| v.as_str()).unwrap_or("");
                                let local = addr.get("local").and_then(|v| v.as_str()).map(|s| s.to_string());
                                if family == "inet" && ipv4.is_none() {
                                    ipv4 = local;
                                } else if family == "inet6" && ipv6.is_none() {
                                    ipv6 = local;
                                }
                            }
                        }

                        map.insert(ifname.to_string(), (ipv4, ipv6, mac));
                    }
                }
            }
        }
    }

    map
}

pub fn read_socket_connections() -> Vec<SocketConnection> {
    let mut conns = Vec::new();

    let output = Command::new("ss")
        .args(["-tuna", "-H"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 5 {
                    continue;
                }

                let proto = parts[0].to_uppercase();
                let state = parts[1].to_string();
                let local_str = parts[4];
                let remote_str = parts.get(5).copied().unwrap_or("*");

                let (local_addr, local_port) = split_addr_port(local_str);
                let (remote_addr, remote_port) = split_addr_port(remote_str);

                conns.push(SocketConnection {
                    protocol: proto,
                    state,
                    local_address: local_addr,
                    local_port,
                    remote_address: remote_addr,
                    remote_port,
                    process: None,
                });
            }
        }
    }

    // Limit to 50 local connections to prevent huge payloads
    if conns.len() > 50 {
        conns.truncate(50);
    }

    conns
}

fn split_addr_port(s: &str) -> (String, u16) {
    if let Some((addr, port_str)) = s.rsplit_once(':') {
        let addr = addr.trim_matches('[').trim_matches(']').to_string();
        let port = port_str.parse::<u16>().unwrap_or(0);
        (addr, port)
    } else {
        (s.to_string(), 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_addr_port() {
        let (addr, port) = split_addr_port("127.0.0.1:8080");
        assert_eq!(addr, "127.0.0.1");
        assert_eq!(port, 8080);

        let (addr6, port6) = split_addr_port("[::1]:443");
        assert_eq!(addr6, "::1");
        assert_eq!(port6, 443);
    }
}

