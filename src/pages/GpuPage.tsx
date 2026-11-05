import React, { useState } from "react";
import {
  CircuitBoard,
  Thermometer,
  Zap,
  ShieldAlert,
  Layers,
  Sparkles,
} from "lucide-react";
import type { GpuMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { AreaChart } from "../components/charts/AreaChart";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/common/EmptyState";

interface GpuPageProps {
  gpu: GpuMetrics | null;
  loading: boolean;
  error: string | null;
}

export const GpuPage: React.FC<GpuPageProps> = ({ gpu, loading, error }) => {
  const [selectedGpuId, setSelectedGpuId] = useState<string | null>(null);

  if (loading && !gpu) {
    return <LoadingState message="Discovering GPU hardware and vendor interfaces..." />;
  }

  const devices = gpu?.devices ?? [];

  if (devices.length === 0) {
    return (
      <div className="dashboard-content">
        <EmptyState
          title="No Supported GPU Detected"
          description="Neither NVIDIA (nvidia-smi), AMD (amdgpu sysfs), nor Intel DRM hardware monitoring interfaces reported an active graphics processor on this machine."
          icon={<CircuitBoard size={36} />}
        />
      </div>
    );
  }

  const activeDevice =
    devices.find((d) => d.id === selectedGpuId) ?? devices[0];

  const memUsedGb = activeDevice.memoryUsedMb
    ? (activeDevice.memoryUsedMb / 1024).toFixed(1)
    : "--";
  const memTotalGb = activeDevice.memoryTotalMb
    ? (activeDevice.memoryTotalMb / 1024).toFixed(1)
    : "--";

  const chartHistory = activeDevice.history.map((h) => ({
    timestamp: h.timestamp,
    value: h.utilization,
  }));

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">GRAPHICS HARDWARE INTELLIGENCE</p>
          <h2>
            GPU <span className="accent-text">Analytics.</span>
          </h2>
          <p className="welcome-description">
            Multi-GPU monitoring for discrete and integrated graphics processors.
          </p>
        </div>

        {/* GPU Selector Pill / Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {devices.map((device) => {
            const isSelected = device.id === activeDevice.id;
            return (
              <button
                key={device.id}
                onClick={() => setSelectedGpuId(device.id)}
                type="button"
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: isSelected
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  background: isSelected
                    ? "var(--accent-soft)"
                    : "var(--surface)",
                  color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                  boxShadow: isSelected
                    ? "0 2px 8px rgba(34, 197, 94, 0.2)"
                    : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <CircuitBoard size={15} />
                <span>{device.name}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: device.isIntegrated
                      ? "rgba(56, 189, 248, 0.15)"
                      : "rgba(34, 197, 94, 0.15)",
                    color: device.isIntegrated
                      ? "var(--security-blue)"
                      : "var(--accent)",
                  }}
                >
                  {device.isIntegrated ? "Integrated" : "Discrete"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {error && <div className="telemetry-error">GPU warning: {error}</div>}

      {/* Primary Metrics Grid */}
      <section className="metrics-grid">
        <MetricCard
          label="GPU Core Usage"
          value={
            activeDevice.utilizationPercent != null
              ? activeDevice.utilizationPercent.toFixed(0)
              : "N/A"
          }
          unit={activeDevice.utilizationPercent != null ? "%" : ""}
          detail={`${activeDevice.vendor} · ${activeDevice.driverVersion ?? "Native Driver"}`}
          icon={<CircuitBoard size={20} />}
          percentage={activeDevice.utilizationPercent ?? undefined}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="VRAM Memory"
          value={memUsedGb}
          unit={activeDevice.memoryUsedMb != null ? `GB` : ""}
          detail={
            activeDevice.memoryTotalMb != null
              ? `${memTotalGb} GB total VRAM capacity`
              : "Dynamic system shared memory"
          }
          icon={<Layers size={20} />}
          percentage={activeDevice.memoryUsagePercent ?? undefined}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Temperature"
          value={
            activeDevice.temperatureC != null
              ? activeDevice.temperatureC.toFixed(0)
              : "N/A"
          }
          unit={activeDevice.temperatureC != null ? "°C" : ""}
          detail={
            activeDevice.temperatureC != null
              ? "Live GPU die thermal reading"
              : "Thermal sensor unexposed"
          }
          icon={<Thermometer size={20} />}
          percentage={
            activeDevice.temperatureC != null
              ? (activeDevice.temperatureC / 100) * 100
              : undefined
          }
          color={
            (activeDevice.temperatureC ?? 0) > 82
              ? "#ef4444"
              : "var(--accent, #22c55e)"
          }
        />

        <MetricCard
          label="Power Draw"
          value={
            activeDevice.powerDrawW != null
              ? activeDevice.powerDrawW.toFixed(1)
              : "N/A"
          }
          unit={activeDevice.powerDrawW != null ? "W" : ""}
          detail={
            activeDevice.powerDrawW != null
              ? "Live package / board wattage"
              : "Power telemetry not exposed by hardware"
          }
          icon={<Zap size={20} />}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Analysis Grid */}
      <section className="lower-grid">
        {/* Historical GPU Utilization Chart */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>GPU Utilization History</h3>
              <p>Historical compute load for {activeDevice.name}</p>
            </div>
            <span className="section-tag">LIVE</span>
          </div>

          <div style={{ marginTop: "16px", marginBottom: "20px" }}>
            <AreaChart
              data={chartHistory}
              height={170}
              color="var(--security-blue, #38bdf8)"
              gradientId={`gpu-grad-${activeDevice.id}`}
              unit="%"
              label="GPU"
            />
          </div>

          {/* Device details & capabilities */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              borderTop: "1px solid var(--border)",
              paddingTop: "16px",
            }}
          >
            <div className="load-average-card">
              <span>Graphics Clock</span>
              <strong>
                {activeDevice.clockSpeedMhz != null
                  ? `${activeDevice.clockSpeedMhz.toFixed(0)} MHz`
                  : "N/A"}
              </strong>
            </div>

            <div className="load-average-card">
              <span>Cooling Fan</span>
              <strong>
                {activeDevice.fanSpeedPercent != null
                  ? `${activeDevice.fanSpeedPercent.toFixed(0)}%`
                  : activeDevice.fanSpeedRpm != null
                  ? `${activeDevice.fanSpeedRpm} RPM`
                  : "Auto / EC"}
              </strong>
            </div>

            <div className="load-average-card">
              <span>Performance State</span>
              <strong>
                {activeDevice.performanceState ?? (activeDevice.isIntegrated ? "DPM Ready" : "P-State")}
              </strong>
            </div>
          </div>
        </article>

        {/* Hardware details and unsupported metric explanations */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Hardware Details</h3>
              <p>Device specifications and sensor notes</p>
            </div>
            <span className="system-info-icon">
              <Sparkles size={16} />
            </span>
          </div>

          <div className="system-info-list">
            <div className="system-info-row">
              <span>Device Name</span>
              <strong>{activeDevice.name}</strong>
            </div>

            <div className="system-info-row">
              <span>Vendor</span>
              <strong>{activeDevice.vendor}</strong>
            </div>

            <div className="system-info-row">
              <span>Architecture Type</span>
              <strong>{activeDevice.isIntegrated ? "Integrated (APU)" : "Discrete GPU"}</strong>
            </div>

            <div className="system-info-row">
              <span>Driver</span>
              <strong>{activeDevice.driverVersion ?? "Kernel DRM"}</strong>
            </div>

            <div className="system-info-row">
              <span>Total VRAM</span>
              <strong>{memTotalGb !== "--" ? `${memTotalGb} GB` : "Shared RAM"}</strong>
            </div>

            <div className="system-info-row">
              <span>Used VRAM</span>
              <strong>{memUsedGb !== "--" ? `${memUsedGb} GB` : "N/A"}</strong>
            </div>
          </div>

          {/* Unsupported metrics explanation box */}
          {Object.keys(activeDevice.unsupportedReasons).length > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "10px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                <ShieldAlert size={14} style={{ color: "var(--security-blue)" }} />
                <span>Hardware Sensor Explanations</span>
              </div>

              {Object.entries(activeDevice.unsupportedReasons).map(([metric, reason]) => (
                <div
                  key={metric}
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    marginBottom: "4px",
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>{metric}: </strong>
                  {reason}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};
