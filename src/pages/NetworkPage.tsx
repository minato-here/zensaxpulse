import React, { useState } from "react";
import {
  Wifi,
  EthernetPort,
  ArrowDownCircle,
  ArrowUpCircle,
  Radio,
  Layers,
  ShieldCheck,
  Globe,
} from "lucide-react";
import type { NetworkMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { DualLineChart } from "../components/charts/DualLineChart";
import { LoadingState } from "../components/common/LoadingState";

interface NetworkPageProps {
  network: NetworkMetrics | null;
  loading: boolean;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): { value: string; unit: string } {
  if (bytesPerSec < 1024) return { value: bytesPerSec.toFixed(0), unit: "B/s" };
  if (bytesPerSec < 1024 * 1024) return { value: (bytesPerSec / 1024).toFixed(1), unit: "KB/s" };
  return { value: (bytesPerSec / (1024 * 1024)).toFixed(2), unit: "MB/s" };
}

export const NetworkPage: React.FC<NetworkPageProps> = ({
  network,
  loading,
  error,
}) => {
  const [selectedIface, setSelectedIface] = useState<string | null>(null);

  if (loading && !network) {
    return <LoadingState message="Reading Linux network interfaces and socket states..." />;
  }

  const interfaces = network?.interfaces ?? [];
  const activeIface =
    interfaces.find((i) => i.name === selectedIface) ??
    interfaces.find((i) => i.name === network?.activeInterfaceName) ??
    interfaces[0];

  const totalDown = formatSpeed(network?.totalRxSpeedBytesSec ?? 0);
  const totalUp = formatSpeed(network?.totalTxSpeedBytesSec ?? 0);

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">NETWORK SUBSYSTEM INTELLIGENCE</p>
          <h2>
            Network <span className="accent-text">Analytics.</span>
          </h2>
          <p className="welcome-description">
            Interface bandwidth deltas, packet transmission statistics, and local socket endpoints.
          </p>
        </div>

        {/* Interface Switcher Pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {interfaces.map((iface) => {
            const isSelected = activeIface && iface.name === activeIface.name;
            const isUp = iface.state === "UP";

            return (
              <button
                key={iface.name}
                onClick={() => setSelectedIface(iface.name)}
                type="button"
                style={{
                  padding: "7px 13px",
                  borderRadius: "10px",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                  color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {iface.interfaceType === "WiFi" ? (
                  <Wifi size={14} />
                ) : (
                  <EthernetPort size={14} />
                )}
                <span>{iface.name}</span>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: isUp ? "#22c55e" : "var(--text-muted)",
                  }}
                />
              </button>
            );
          })}
        </div>
      </section>

      {error && <div className="telemetry-error">Network notice: {error}</div>}

      {/* Primary Metrics Grid */}
      <section className="metrics-grid">
        <MetricCard
          label="Total Download Rate"
          value={totalDown.value}
          unit={totalDown.unit}
          detail="Aggregate system RX throughput"
          icon={<ArrowDownCircle size={20} />}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Total Upload Rate"
          value={totalUp.value}
          unit={totalUp.unit}
          detail="Aggregate system TX throughput"
          icon={<ArrowUpCircle size={20} />}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Interface State"
          value={activeIface?.state ?? "UNKNOWN"}
          detail={`${activeIface?.name ?? "wlp4s0"} · ${activeIface?.interfaceType ?? "Interface"}`}
          icon={<Radio size={20} />}
          color={activeIface?.state === "UP" ? "var(--accent, #22c55e)" : "var(--text-muted)"}
        />

        <MetricCard
          label="Active Sockets"
          value={network?.connections.length ?? 0}
          unit="Sockets"
          detail="Local TCP/UDP socket connections"
          icon={<Globe size={20} />}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Main Analysis Grid */}
      <section className="lower-grid">
        {/* Real Historical Network Throughput Graph */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Throughput History</h3>
              <p>Download (green) vs Upload (blue) rate over time</p>
            </div>
            <div style={{ display: "flex", gap: "14px", alignItems: "center", fontSize: "11px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)" }} />
                RX (Download)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--security-blue)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--security-blue)" }} />
                TX (Upload)
              </span>
              <span className="section-tag">LIVE</span>
            </div>
          </div>

          <div style={{ marginTop: "16px", marginBottom: "20px" }}>
            <DualLineChart
              data={network?.history ?? []}
              height={170}
              rxColor="var(--accent, #22c55e)"
              txColor="var(--security-blue, #38bdf8)"
            />
          </div>

          {/* Interface Packet Statistics */}
          {activeIface && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <div className="load-average-card">
                <span>Total Received</span>
                <strong>{formatBytes(activeIface.rxBytes)}</strong>
              </div>
              <div className="load-average-card">
                <span>Total Sent</span>
                <strong>{formatBytes(activeIface.txBytes)}</strong>
              </div>
              <div className="load-average-card">
                <span>Packets (RX/TX)</span>
                <strong>{(activeIface.rxPackets / 1000).toFixed(0)}k / {(activeIface.txPackets / 1000).toFixed(0)}k</strong>
              </div>
              <div className="load-average-card">
                <span>Errors / Drops</span>
                <strong>{activeIface.rxErrors + activeIface.txErrors} / {activeIface.rxDrops + activeIface.txDrops}</strong>
              </div>
            </div>
          )}
        </article>

        {/* Selected Interface Specs Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Interface Properties</h3>
              <p>{activeIface?.name ?? "Interface"} configuration</p>
            </div>
            <span className="system-info-icon">
              <Layers size={16} />
            </span>
          </div>

          {activeIface && (
            <div className="system-info-list">
              <div className="system-info-row">
                <span>Interface Name</span>
                <strong>{activeIface.name}</strong>
              </div>

              <div className="system-info-row">
                <span>Type</span>
                <strong>{activeIface.interfaceType}</strong>
              </div>

              <div className="system-info-row">
                <span>Operational State</span>
                <strong style={{ color: activeIface.state === "UP" ? "var(--accent)" : "var(--text-muted)" }}>
                  {activeIface.state}
                </strong>
              </div>

              <div className="system-info-row">
                <span>Hardware MAC</span>
                <strong style={{ fontFamily: "monospace" }}>{activeIface.macAddress ?? "Unassigned"}</strong>
              </div>

              <div className="system-info-row">
                <span>IPv4 Address</span>
                <strong style={{ fontFamily: "monospace" }}>{activeIface.ipv4Address ?? "127.0.0.1"}</strong>
              </div>

              <div className="system-info-row">
                <span>IPv6 Address</span>
                <strong style={{ fontFamily: "monospace", fontSize: "11px" }}>
                  {activeIface.ipv6Address ?? "::1"}
                </strong>
              </div>

              <div className="system-info-row">
                <span>Current RX Speed</span>
                <strong>{formatSpeed(activeIface.rxSpeedBytesSec).value} {formatSpeed(activeIface.rxSpeedBytesSec).unit}</strong>
              </div>

              <div className="system-info-row">
                <span>Current TX Speed</span>
                <strong>{formatSpeed(activeIface.txSpeedBytesSec).value} {formatSpeed(activeIface.txSpeedBytesSec).unit}</strong>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--surface-raised)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck size={14} style={{ color: "var(--accent)" }} />
            Zero external network queries · Local /proc/net/dev inspection only
          </div>
        </article>
      </section>

      {/* Local Sockets Table */}
      <section style={{ marginTop: "24px" }}>
        <article className="panel" style={{ width: "100%" }}>
          <div className="panel-header" style={{ marginBottom: "16px" }}>
            <div>
              <h3>Active Local Socket Endpoints</h3>
              <p>Inspected locally via ss -tuna (no remote network probing)</p>
            </div>
            <span className="section-tag">{network?.connections.length ?? 0} SOCKETS</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "8px 12px" }}>Protocol</th>
                  <th style={{ padding: "8px 12px" }}>State</th>
                  <th style={{ padding: "8px 12px" }}>Local Address : Port</th>
                  <th style={{ padding: "8px 12px" }}>Peer Address : Port</th>
                </tr>
              </thead>
              <tbody>
                {network?.connections && network.connections.length > 0 ? (
                  network.connections.map((conn, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: idx % 2 === 0 ? "transparent" : "var(--surface-raised)",
                      }}
                    >
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--accent)" }}>
                        {conn.protocol}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 600,
                            background:
                              conn.state === "ESTAB"
                                ? "var(--accent-soft)"
                                : conn.state === "LISTEN"
                                ? "var(--security-blue-soft)"
                                : "var(--surface)",
                            color:
                              conn.state === "ESTAB"
                                ? "var(--accent)"
                                : conn.state === "LISTEN"
                                ? "var(--security-blue)"
                                : "var(--text-muted)",
                          }}
                        >
                          {conn.state}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                        {conn.localAddress}:{conn.localPort}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                        {conn.remoteAddress}:{conn.remotePort}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                      No active local sockets detected in this session
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
};
