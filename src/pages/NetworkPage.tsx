import React, { useState } from "react";
import {
  Wifi,
  EthernetPort,
  ArrowDownCircle,
  ArrowUpCircle,
  Radio,
  Layers,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
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
  const [filterBySelected, setFilterBySelected] = useState<boolean>(false);

  if (loading && !network) {
    return <LoadingState message="Reading Linux network interfaces and socket states..." />;
  }

  const interfaces = network?.interfaces ?? [];

  // Determine active interface based on user selection or system default
  const activeIface =
    (selectedIface ? interfaces.find((i) => i.name === selectedIface) : null) ??
    interfaces.find((i) => i.name === network?.activeInterfaceName) ??
    interfaces[0];

  const ifaceDown = formatSpeed(activeIface?.rxSpeedBytesSec ?? 0);
  const ifaceUp = formatSpeed(activeIface?.txSpeedBytesSec ?? 0);
  const totalDown = formatSpeed(network?.totalRxSpeedBytesSec ?? 0);
  const totalUp = formatSpeed(network?.totalTxSpeedBytesSec ?? 0);

  // Filter sockets if user enables "Filter by Selected"
  const connections = network?.connections ?? [];
  const filteredConnections = filterBySelected && activeIface
    ? connections.filter((c) => {
        if (activeIface.name === "lo") {
          return c.localAddress.startsWith("127.") || c.localAddress === "::1" || c.remoteAddress.startsWith("127.");
        }
        if (activeIface.ipv4Address) {
          return c.localAddress === activeIface.ipv4Address || c.remoteAddress === activeIface.ipv4Address;
        }
        return true;
      })
    : connections;

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
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {interfaces.map((iface) => {
            const isSelected = activeIface && iface.name === activeIface.name;
            const isUp = iface.state === "UP";

            return (
              <button
                key={iface.name}
                onClick={() => setSelectedIface(iface.name)}
                type="button"
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                  color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "12px",
                  boxShadow: isSelected
                    ? "0 0 10px rgba(34, 197, 94, 0.2)"
                    : "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.15s ease",
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
                    background: isUp ? "#22c55e" : "#ef4444",
                    boxShadow: isUp ? "0 0 6px #22c55e" : "none",
                  }}
                  title={isUp ? "Link UP" : "Link DOWN"}
                />
              </button>
            );
          })}
        </div>
      </section>

      {error && <div className="telemetry-error">Network notice: {error}</div>}

      {/* Primary Metrics Grid (Dedicated to Selected Interface) */}
      <section className="metrics-grid">
        {/* Card 1: Selected Interface Download */}
        <MetricCard
          label={`${activeIface?.name ?? "Interface"} Download`}
          value={ifaceDown.value}
          unit={ifaceDown.unit}
          detail={`Live RX rate on ${activeIface?.name ?? "medium"} (System Total: ${totalDown.value} ${totalDown.unit})`}
          icon={<ArrowDownCircle size={20} />}
          color="var(--accent, #22c55e)"
          badge={activeIface?.name ?? "Active"}
        />

        {/* Card 2: Selected Interface Upload */}
        <MetricCard
          label={`${activeIface?.name ?? "Interface"} Upload`}
          value={ifaceUp.value}
          unit={ifaceUp.unit}
          detail={`Live TX rate on ${activeIface?.name ?? "medium"} (System Total: ${totalUp.value} ${totalUp.unit})`}
          icon={<ArrowUpCircle size={20} />}
          color="var(--security-blue, #38bdf8)"
          badge={activeIface?.name ?? "Active"}
        />

        {/* Card 3: Selected Interface Link State */}
        <MetricCard
          label={`${activeIface?.name ?? "Interface"} State`}
          value={activeIface?.state ?? "DOWN"}
          detail={`${activeIface?.interfaceType ?? "Interface"} · ${
            activeIface?.speedMbps
              ? `${activeIface.speedMbps} Mbps`
              : activeIface?.state === "UP"
              ? "Active Link"
              : "Disconnected"
          }`}
          icon={
            activeIface?.state === "UP" ? (
              <Radio size={20} />
            ) : (
              <XCircle size={20} style={{ color: "#ef4444" }} />
            )
          }
          color={activeIface?.state === "UP" ? "var(--accent, #22c55e)" : "var(--text-muted)"}
          badge={activeIface?.state === "UP" ? "ONLINE" : "OFFLINE"}
        />

        {/* Card 4: Cumulative Transferred Data */}
        <MetricCard
          label={`${activeIface?.name ?? "Interface"} Data`}
          value={formatBytes((activeIface?.rxBytes ?? 0) + (activeIface?.txBytes ?? 0))}
          detail={`RX: ${formatBytes(activeIface?.rxBytes ?? 0)} · TX: ${formatBytes(
            activeIface?.txBytes ?? 0
          )}`}
          icon={<Activity size={20} />}
          color="var(--security-blue, #38bdf8)"
          badge="Cumulative"
        />
      </section>

      {/* Main Analysis Grid */}
      <section className="lower-grid">
        {/* Real Historical Network Throughput Graph */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Bandwidth History & {activeIface?.name ?? "Interface"} Traffic</h3>
              <p>
                Live rate on {activeIface?.name ?? "interface"} ({ifaceDown.value} {ifaceDown.unit} RX · {ifaceUp.value} {ifaceUp.unit} TX)
              </p>
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

          {/* Interface Packet Statistics for Selected Interface */}
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
                <strong>
                  {activeIface.rxPackets >= 1000
                    ? `${(activeIface.rxPackets / 1000).toFixed(1)}k`
                    : activeIface.rxPackets}{" "}
                  /{" "}
                  {activeIface.txPackets >= 1000
                    ? `${(activeIface.txPackets / 1000).toFixed(1)}k`
                    : activeIface.txPackets}
                </strong>
              </div>
              <div className="load-average-card">
                <span>Errors / Drops</span>
                <strong
                  style={{
                    color:
                      activeIface.rxErrors + activeIface.txErrors + activeIface.rxDrops + activeIface.txDrops > 0
                        ? "#f59e0b"
                        : "var(--text-primary)",
                  }}
                >
                  {activeIface.rxErrors + activeIface.txErrors} / {activeIface.rxDrops + activeIface.txDrops}
                </strong>
              </div>
            </div>
          )}
        </article>

        {/* Selected Interface Specs Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>{activeIface?.name ?? "Interface"} Specifications</h3>
              <p>{activeIface?.interfaceType ?? "Interface"} device configuration</p>
            </div>
            <span className="system-info-icon">
              <Layers size={16} />
            </span>
          </div>

          {activeIface && (
            <div className="system-info-list">
              <div className="system-info-row">
                <span>Interface Name</span>
                <strong style={{ color: "var(--accent)" }}>{activeIface.name}</strong>
              </div>

              <div className="system-info-row">
                <span>Interface Type</span>
                <strong>{activeIface.interfaceType}</strong>
              </div>

              <div className="system-info-row">
                <span>Operational State</span>
                <strong
                  style={{
                    color: activeIface.state === "UP" ? "var(--accent)" : "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {activeIface.state === "UP" ? (
                    <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
                  ) : (
                    <XCircle size={13} style={{ color: "#ef4444" }} />
                  )}
                  {activeIface.state}
                </strong>
              </div>

              <div className="system-info-row">
                <span>Hardware MAC</span>
                <strong style={{ fontFamily: "monospace" }}>
                  {activeIface.macAddress ?? (activeIface.name === "lo" ? "Loopback (No MAC)" : "Unassigned")}
                </strong>
              </div>

              <div className="system-info-row">
                <span>IPv4 Address</span>
                <strong style={{ fontFamily: "monospace" }}>
                  {activeIface.ipv4Address ??
                    (activeIface.name === "lo"
                      ? "127.0.0.1"
                      : activeIface.state === "UP"
                      ? "Awaiting DHCP / None"
                      : "Disconnected")}
                </strong>
              </div>

              <div className="system-info-row">
                <span>IPv6 Address</span>
                <strong style={{ fontFamily: "monospace", fontSize: "11px" }}>
                  {activeIface.ipv6Address ??
                    (activeIface.name === "lo"
                      ? "::1"
                      : activeIface.state === "UP"
                      ? "None"
                      : "None")}
                </strong>
              </div>

              <div className="system-info-row">
                <span>Negotiated Speed</span>
                <strong>
                  {activeIface.speedMbps
                    ? `${activeIface.speedMbps} Mbps`
                    : activeIface.state === "UP"
                    ? "Dynamic Wireless / Full"
                    : "No Link"}
                </strong>
              </div>

              <div className="system-info-row">
                <span>Live Throughput</span>
                <strong>
                  {ifaceDown.value} {ifaceDown.unit} RX · {ifaceUp.value} {ifaceUp.unit} TX
                </strong>
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
            Zero remote probing · Local Linux /proc/net/dev & /sys/class/net inspection
          </div>
        </article>
      </section>

      {/* Local Sockets Table */}
      <section style={{ marginTop: "24px" }}>
        <article className="panel" style={{ width: "100%" }}>
          <div
            className="panel-header"
            style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}
          >
            <div>
              <h3>Active Local Socket Endpoints</h3>
              <p>Inspected locally via ss -tuna (no remote network probing)</p>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => setFilterBySelected(!filterBySelected)}
                type="button"
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: filterBySelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: filterBySelected ? "var(--accent-soft)" : "var(--surface-raised)",
                  color: filterBySelected ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {filterBySelected ? `Filtered to ${activeIface?.name}` : "Show All Sockets"}
              </button>
              <span className="section-tag">{filteredConnections.length} SOCKETS</span>
            </div>
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
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((conn, idx) => (
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
                      {filterBySelected
                        ? `No sockets currently associated with ${activeIface?.name}`
                        : "No active local sockets detected in this session"}
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
