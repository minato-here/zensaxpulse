import React from "react";
import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  EthernetPort,
} from "lucide-react";
import type { SystemOverview, PageId } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { DualLineChart } from "../components/charts/DualLineChart";
import { LoadingState } from "../components/common/LoadingState";

interface DashboardPageProps {
  overview: SystemOverview | null;
  loading: boolean;
  error: string | null;
  onNavigate: (page: PageId) => void;
}

function formatBytesRate(bytesPerSec: number): { value: string; unit: string } {
  if (bytesPerSec < 1024) {
    return { value: bytesPerSec.toFixed(0), unit: "B/s" };
  }
  if (bytesPerSec < 1024 * 1024) {
    return { value: (bytesPerSec / 1024).toFixed(1), unit: "KB/s" };
  }
  return { value: (bytesPerSec / (1024 * 1024)).toFixed(2), unit: "MB/s" };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  overview,
  loading,
  error,
  onNavigate,
}) => {
  if (loading && !overview) {
    return <LoadingState message="Collecting system telemetry..." />;
  }

  const downRate = formatBytesRate(overview?.netRxSpeedBytesSec ?? 0);
  const upRate = formatBytesRate(overview?.netTxSpeedBytesSec ?? 0);

  const isOnline = overview?.isConnected ?? false;
  const isEthernet =
    overview?.connectionType?.toLowerCase().includes("ethernet") ?? false;
  const ifaceName =
    overview?.activeInterface && overview.activeInterface !== "None"
      ? overview.activeInterface
      : "No Interface";
  const ipDisplay = overview?.activeIp ? `IP: ${overview.activeIp}` : "No IP Assigned";

  return (
    <div className="dashboard-content">
      {/* Welcome header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">SYSTEM INTELLIGENCE</p>
          <h2>
            Your system, <span className="accent-text">in focus.</span>
          </h2>
          <p className="welcome-description">
            Monitor real-time hardware performance and Linux kernel telemetry.
          </p>
        </div>

        <div className="system-chip">
          <span className="chip-icon">◈</span>
          <div>
            <span className="chip-label">Operating system</span>
            <span className="chip-value">Arch Linux</span>
          </div>
        </div>
      </section>

      {/* Section header */}
      <section className="section-header">
        <div>
          <h3>Resource overview</h3>
          <p>
            {overview
              ? "Live hardware utilization from kernel interfaces"
              : "Waiting for telemetry counters"}
          </p>
        </div>

        <span className="section-tag">{overview ? "LIVE" : "CONNECTING"}</span>
      </section>

      {error && <div className="telemetry-error">Telemetry warning: {error}</div>}

      {/* 6 Primary Metric Cards */}
      <section className="metrics-grid">
        {/* 1. CPU */}
        <MetricCard
          label="CPU Usage"
          value={overview ? overview.cpuUsagePercent.toFixed(0) : "--"}
          unit="%"
          detail={overview?.cpuModel ?? "AMD Ryzen 5 7535HS"}
          icon={<Cpu size={20} />}
          percentage={overview?.cpuUsagePercent ?? 0}
          color="var(--accent, #22c55e)"
        />

        {/* 2. GPU */}
        <MetricCard
          label="GPU Usage"
          value={
            overview?.gpuUsagePercent != null
              ? overview.gpuUsagePercent.toFixed(0)
              : "--"
          }
          unit="%"
          detail={
            overview?.gpuMemoryUsedGb != null && overview.gpuMemoryTotalGb != null
              ? `${overview.gpuMemoryUsedGb.toFixed(1)} / ${overview.gpuMemoryTotalGb.toFixed(1)} GB VRAM${
                  overview.gpuTemperatureC != null
                    ? ` · ${overview.gpuTemperatureC.toFixed(0)}°C`
                    : ""
                }`
              : overview?.gpuModel ?? "GPU telemetry ready"
          }
          icon={<CircuitBoard size={20} />}
          percentage={overview?.gpuUsagePercent ?? 0}
          color="var(--security-blue, #38bdf8)"
        />

        {/* 3. Memory */}
        <MetricCard
          label="Memory"
          value={overview ? overview.memoryUsedGb.toFixed(1) : "--"}
          unit="GB"
          detail={
            overview
              ? `${overview.memoryTotalGb.toFixed(1)} GB total · ${overview.memoryAvailableGb.toFixed(1)} GB available`
              : "Waiting for telemetry"
          }
          icon={<MemoryStick size={20} />}
          percentage={overview?.memoryUsagePercent ?? 0}
          color="var(--accent, #22c55e)"
        />

        {/* 4. Storage */}
        <MetricCard
          label="Storage (/)"
          value={
            overview?.storageUsagePercent != null
              ? overview.storageUsagePercent.toFixed(0)
              : "--"
          }
          unit="%"
          detail={
            overview?.storageUsedGb != null && overview.storageTotalGb != null
              ? `${overview.storageUsedGb.toFixed(1)} / ${overview.storageTotalGb.toFixed(1)} GB used`
              : "Storage telemetry ready"
          }
          icon={<HardDrive size={20} />}
          percentage={overview?.storageUsagePercent ?? 0}
          color="var(--security-blue, #38bdf8)"
        />

        {/* 5. Download Speed */}
        <MetricCard
          label="Download"
          value={isOnline ? downRate.value : "0.0"}
          unit={isOnline ? downRate.unit : "KB/s"}
          detail={
            isOnline
              ? `${overview?.connectionType ?? "Connected"} (${ifaceName}) · ${ipDisplay}`
              : "No active network connection (Offline)"
          }
          icon={
            isEthernet ? (
              <EthernetPort size={20} />
            ) : isOnline ? (
              <ArrowDownCircle size={20} />
            ) : (
              <WifiOff size={20} />
            )
          }
          color={isOnline ? "var(--accent, #22c55e)" : "var(--text-muted)"}
          badge={isOnline ? (overview?.activeIp ?? overview?.connectionType ?? "Online") : "Offline"}
        />

        {/* 6. Upload Speed */}
        <MetricCard
          label="Upload"
          value={isOnline ? upRate.value : "0.0"}
          unit={isOnline ? upRate.unit : "KB/s"}
          detail={
            isOnline
              ? `${overview?.connectionType ?? "Connected"} (${ifaceName}) · TX throughput`
              : "Cable unplugged or WiFi disconnected"
          }
          icon={<ArrowUpCircle size={20} />}
          color={isOnline ? "var(--security-blue, #38bdf8)" : "var(--text-muted)"}
          badge={isOnline ? (overview?.connectionType ?? "Online") : "Disconnected"}
        />
      </section>

      {/* Lower Grid: Network Activity & System Info */}
      <section className="lower-grid">
        {/* Network Activity Panel */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Network Activity</h3>
              <p>Live throughput & interface telemetry</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="badge-chip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: isOnline ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {isOnline ? (
                  isEthernet ? (
                    <EthernetPort size={13} style={{ color: "var(--security-blue)" }} />
                  ) : (
                    <Wifi size={13} style={{ color: "var(--accent)" }} />
                  )
                ) : (
                  <WifiOff size={13} style={{ color: "#ef4444" }} />
                )}
                <span>
                  {isOnline
                    ? `${overview?.connectionType} (${ifaceName}) · ${overview?.activeIp ?? "Dynamic IP"}`
                    : "Network Offline (Disconnected)"}
                </span>
              </span>
              <span
                className="section-tag"
                style={{
                  background: isOnline ? undefined : "rgba(239,68,68,0.15)",
                  color: isOnline ? undefined : "#ef4444",
                }}
              >
                {isOnline ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Current Throughput Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface)",
                boxShadow:
                  "inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span className="cpu-dot" style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
                Current Download (RX)
              </span>
              <strong style={{ fontSize: "20px", color: isOnline ? "var(--accent)" : "var(--text-muted)", letterSpacing: "-0.5px" }}>
                {isOnline ? downRate.value : "0.0"} <span style={{ fontSize: "13px", fontWeight: 500 }}>{isOnline ? downRate.unit : "KB/s"}</span>
              </strong>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--surface)",
                boxShadow:
                  "inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span className="gpu-dot" style={{ width: "8px", height: "8px", borderRadius: "50%" }} />
                Current Upload (TX)
              </span>
              <strong style={{ fontSize: "20px", color: isOnline ? "var(--security-blue)" : "var(--text-muted)", letterSpacing: "-0.5px" }}>
                {isOnline ? upRate.value : "0.0"} <span style={{ fontSize: "13px", fontWeight: 500 }}>{isOnline ? upRate.unit : "KB/s"}</span>
              </strong>
            </div>
          </div>

          {/* Real Historical Network Graph */}
          <div style={{ marginTop: "10px", marginBottom: "16px" }}>
            <DualLineChart
              data={overview?.networkHistory ?? []}
              height={150}
              rxColor="var(--accent, #22c55e)"
              txColor="var(--security-blue, #38bdf8)"
            />
          </div>

          {/* Telemetry metadata footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border)",
              paddingTop: "12px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isOnline ? (
                <>
                  <CheckCircle2 size={13} style={{ color: "var(--accent)" }} />
                  <span>
                    State: UP · {overview?.connectionType} · IP:{" "}
                    <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
                      {overview?.activeIp ?? "Dynamic IP"}
                    </strong>
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={13} style={{ color: "#ef4444" }} />
                  <span style={{ color: "#ef7777" }}>
                    Network offline · Connect Ethernet or WiFi to view live telemetry
                  </span>
                </>
              )}
            </span>
            <button
              onClick={() => onNavigate("Network")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Detailed network analytics →
            </button>
          </div>
        </article>

        {/* System Information Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>System information</h3>
              <p>Hardware & environment</p>
            </div>

            <span className="system-info-icon">⚙</span>
          </div>

          <div className="system-info-list">
            <div className="system-info-row">
              <span>Processor</span>
              <strong>{overview?.cpuModel ?? "AMD Ryzen 5 7535HS"}</strong>
            </div>

            <div className="system-info-row">
              <span>Graphics</span>
              <strong>{overview?.gpuModel ?? "RTX 3050 Laptop / Radeon 680M"}</strong>
            </div>

            <div className="system-info-row">
              <span>Architecture</span>
              <strong>x86_64</strong>
            </div>

            <div className="system-info-row">
              <span>Desktop</span>
              <strong>KDE Plasma</strong>
            </div>

            <div className="system-info-row">
              <span>Display server</span>
              <strong>Wayland</strong>
            </div>

            <div className="system-info-row">
              <span>Uptime</span>
              <strong>
                {overview ? formatUptime(overview.uptimeSeconds) : "--"}
              </strong>
            </div>

            <div className="system-info-row">
              <span>Available memory</span>
              <strong>
                {overview
                  ? `${overview.memoryAvailableGb.toFixed(1)} GB`
                  : "--"}
              </strong>
            </div>

            <div className="system-info-row">
              <span>Load averages (1, 5, 15m)</span>
              <strong>
                {overview
                  ? `${overview.loadAverage1m.toFixed(2)} · ${overview.loadAverage5m.toFixed(2)} · ${overview.loadAverage15m.toFixed(2)}`
                  : "--"}
              </strong>
            </div>
          </div>

          <button
            className="view-details-button"
            onClick={() => onNavigate("System")}
            type="button"
          >
            View system details
            <span>→</span>
          </button>
        </article>
      </section>
    </div>
  );
};
