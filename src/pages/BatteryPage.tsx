import React from "react";
import {
  BatteryCharging,
  Battery,
  BatteryWarning,
  Zap,
  ShieldCheck,
  Activity,
  Cpu,
  Plug,
  Layers,
  HeartPulse,
} from "lucide-react";
import type { PowerSupplyMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { LoadingState } from "../components/common/LoadingState";

interface BatteryPageProps {
  powerSupply: PowerSupplyMetrics | null;
  loading: boolean;
  error: string | null;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0 || !isFinite(seconds)) return "--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export const BatteryPage: React.FC<BatteryPageProps> = ({
  powerSupply,
  loading,
  error,
}) => {
  if (loading && !powerSupply) {
    return <LoadingState message="Reading Linux power supply and battery subsystem..." />;
  }

  const hasBattery = powerSupply?.hasBattery && powerSupply.battery;
  const battery = powerSupply?.battery;
  const isAc = powerSupply?.isAcConnected ?? true;

  // Battery health rating
  const health = battery?.healthPercentage ?? 100;
  const getHealthBadge = (h: number) => {
    if (h >= 90) return { label: "Excellent", color: "#22c55e" };
    if (h >= 75) return { label: "Good", color: "#38bdf8" };
    if (h >= 50) return { label: "Moderate", color: "#f59e0b" };
    return { label: "Degraded", color: "#ef4444" };
  };
  const healthBadge = getHealthBadge(health);

  // Time remaining label
  const isCharging = battery?.status?.toLowerCase() === "charging";
  const isFull = battery?.status?.toLowerCase() === "full" || (battery?.percentage ?? 0) >= 99;
  const timeEstimate = isCharging
    ? battery?.timeToFullSeconds
      ? `${formatDuration(battery.timeToFullSeconds)} to full`
      : isFull
      ? "Fully charged"
      : "Calculating..."
    : battery?.timeToEmptySeconds
    ? `${formatDuration(battery.timeToEmptySeconds)} remaining`
    : isFull && isAc
    ? "Plugged in (Full)"
    : isAc
    ? "AC Powered"
    : "Calculating...";

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">ENERGY & POWER SUBSYSTEM</p>
          <h2>
            Battery & <span className="accent-text">Power State.</span>
          </h2>
          <p className="welcome-description">
            Real-time battery degradation, charge cycle telemetry, and live wattage from /sys/class/power_supply.
          </p>
        </div>

        <div className="system-chip">
          <img
            src="/icon.png"
            alt="ZensaxPulse"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div>
            <span className="chip-label">Power State</span>
            <span className="chip-value">
              {hasBattery
                ? `${battery?.percentage ?? 0}% · ${battery?.status ?? "Active"}`
                : isAc
                ? "Direct AC Mains"
                : "Continuous Power"}
            </span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">Power supply notice: {error}</div>}

      {/* Primary Metrics Grid */}
      <section className="metrics-grid">
        {/* Card 1: Charge Percentage */}
        <MetricCard
          label={hasBattery ? "Charge Level" : "Power Source"}
          value={hasBattery ? (battery?.percentage ?? 0).toFixed(0) : "AC Mains"}
          unit={hasBattery ? "%" : ""}
          detail={
            hasBattery
              ? `Status: ${battery?.status ?? "Unknown"} ${isAc ? "· AC Connected" : "· On Battery"}`
              : "Desktop/Workstation running on direct utility power"
          }
          icon={
            hasBattery ? (
              isCharging ? (
                <BatteryCharging size={20} />
              ) : (battery?.percentage ?? 0) < 20 ? (
                <BatteryWarning size={20} />
              ) : (
                <Battery size={20} />
              )
            ) : (
              <Plug size={20} />
            )
          }
          percentage={hasBattery ? battery?.percentage ?? 0 : 100}
          color={
            hasBattery
              ? (battery?.percentage ?? 0) < 20
                ? "#ef4444"
                : isCharging
                ? "var(--accent, #22c55e)"
                : "var(--security-blue, #38bdf8)"
              : "var(--accent, #22c55e)"
          }
          badge={hasBattery ? (isCharging ? "Charging" : isAc ? "AC Plugged" : "Discharging") : "Online"}
        />

        {/* Card 2: Battery Health & Wear */}
        <MetricCard
          label={hasBattery ? "Battery Health" : "AC Supply Status"}
          value={hasBattery ? `${battery?.healthPercentage.toFixed(1)}` : "Nominal"}
          unit={hasBattery ? "%" : "Line"}
          detail={
            hasBattery
              ? `Degradation: ${battery?.wearPercentage.toFixed(1)}% wear level`
              : `Adapter: ${powerSupply?.acAdapterName ?? "ADP0"} online`
          }
          icon={hasBattery ? <HeartPulse size={20} /> : <ShieldCheck size={20} />}
          percentage={hasBattery ? battery?.healthPercentage ?? 100 : 100}
          color={hasBattery ? healthBadge.color : "var(--accent, #22c55e)"}
          badge={hasBattery ? healthBadge.label : "AC Direct"}
        />

        {/* Card 3: Live Power Draw / Charge Rate */}
        <MetricCard
          label={hasBattery ? "Power Draw / Rate" : "System Power"}
          value={hasBattery ? (battery?.powerWatts ?? 0).toFixed(1) : "--"}
          unit={hasBattery ? "Watts" : "Direct"}
          detail={
            hasBattery
              ? `Cell voltage: ${(battery?.voltageVolts ?? 0).toFixed(2)} V`
              : "Constant AC line feed (battery-less system)"
          }
          icon={<Zap size={20} />}
          color="var(--security-blue, #38bdf8)"
          badge={hasBattery ? (isCharging ? "+ Charge" : "- Drain") : "Active"}
        />

        {/* Card 4: Estimated Runtime / Cycles */}
        <MetricCard
          label={hasBattery ? (isCharging ? "Time to Full" : "Battery Runtime") : "Power Supply Mode"}
          value={hasBattery ? timeEstimate : "Continuous"}
          detail={
            hasBattery
              ? `Hardware cycles: ${battery?.cycleCount ?? "0"} total`
              : "Air-gapped desktop system with AC power"
          }
          icon={<Activity size={20} />}
          color="var(--accent, #22c55e)"
          badge={hasBattery && battery?.cycleCount ? `${battery.cycleCount} Cycles` : "Utility Feed"}
        />
      </section>

      {/* Main Analysis Grid */}
      <section className="lower-grid">
        {/* Left Column: Health, Capacity & Degradation */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>{hasBattery ? "Capacity & Health Analysis" : "Power Architecture"}</h3>
              <p>
                {hasBattery
                  ? "Factory design specification vs current charge holding capacity"
                  : "Mains utility feed and power supply controllers"}
              </p>
            </div>
            <span className="section-tag">
              {hasBattery ? `${battery?.technology} · ${battery?.name}` : "MAINS AC"}
            </span>
          </div>

          {battery ? (
            <div style={{ marginTop: "16px" }}>
              {/* Visual Capacity Bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Current Stored Energy</span>
                  <strong style={{ color: "var(--accent)" }}>
                    {battery.energyNowWh.toFixed(2)} Wh / {battery.energyFullWh.toFixed(2)} Wh
                  </strong>
                </div>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "5px",
                    background: "var(--surface)",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, (battery.energyNowWh / (battery.energyFullWh || 1)) * 100))}%`,
                      background: "linear-gradient(90deg, var(--accent) 0%, var(--security-blue) 100%)",
                      borderRadius: "5px",
                      transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>

              {/* Health vs Design Capacity Bar */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Health Retention (Full vs Factory Design)</span>
                  <strong style={{ color: healthBadge.color }}>
                    {battery.healthPercentage.toFixed(1)}% ({battery.energyFullWh.toFixed(2)} Wh of {battery.energyDesignWh.toFixed(2)} Wh)
                  </strong>
                </div>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "5px",
                    background: "var(--surface)",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, battery.healthPercentage)}%`,
                      background: healthBadge.color,
                      borderRadius: "5px",
                      transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>

              {/* 4 Stat Cards */}
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
                  <span>Wear Level</span>
                  <strong style={{ color: battery.wearPercentage > 20 ? "#ef4444" : "var(--accent)" }}>
                    {battery.wearPercentage.toFixed(1)}%
                  </strong>
                </div>
                <div className="load-average-card">
                  <span>Cycle Count</span>
                  <strong>{battery.cycleCount ?? "N/A"}</strong>
                </div>
                <div className="load-average-card">
                  <span>Live Voltage</span>
                  <strong>{battery.voltageVolts.toFixed(2)} V</strong>
                </div>
                <div className="load-average-card">
                  <span>Min Design</span>
                  <strong>{battery.designVoltageVolts ? `${battery.designVoltageVolts.toFixed(2)} V` : "N/A"}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)" }}>
              <Plug size={40} style={{ color: "var(--accent)", marginBottom: "12px", opacity: 0.8 }} />
              <h4 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>Direct AC Mains Supply Connected</h4>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.6, maxWidth: "420px", marginInline: "auto" }}>
                This host does not contain an internal chemical accumulator battery. It is powered continuously by the AC mains adapter or power supply unit.
              </p>
            </div>
          )}
        </article>

        {/* Right Column: Hardware & Cell Properties */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Hardware & Cell Parameters</h3>
              <p>Firmware gas gauge & ACPI power controllers</p>
            </div>
            <span className="system-info-icon">
              <Layers size={16} />
            </span>
          </div>

          <div className="system-info-list">
            <div className="system-info-row">
              <span>Model Name</span>
              <strong>{battery?.modelName ?? "Desktop Mains Power"}</strong>
            </div>

            <div className="system-info-row">
              <span>Manufacturer</span>
              <strong>{battery?.manufacturer ?? "OEM Motherboard VRM"}</strong>
            </div>

            <div className="system-info-row">
              <span>Cell Chemistry</span>
              <strong>{battery?.technology ?? "Mains AC"}</strong>
            </div>

            {battery?.serialNumber && (
              <div className="system-info-row">
                <span>Serial Number</span>
                <strong style={{ fontFamily: "monospace" }}>{battery.serialNumber}</strong>
              </div>
            )}

            <div className="system-info-row">
              <span>Capacity Rating</span>
              <strong style={{ color: "var(--accent)" }}>{battery?.capacityLevel ?? "Normal"}</strong>
            </div>

            <div className="system-info-row">
              <span>AC Adapter Link</span>
              <strong style={{ color: isAc ? "var(--accent)" : "var(--text-muted)" }}>
                {isAc ? `${powerSupply?.acAdapterName ?? "ADP0"} (Connected)` : "Disconnected"}
              </strong>
            </div>

            <div className="system-info-row">
              <span>Factory Design Wh</span>
              <strong>{battery ? `${battery.energyDesignWh.toFixed(2)} Wh` : "Continuous"}</strong>
            </div>

            <div className="system-info-row">
              <span>Current Max Wh</span>
              <strong>{battery ? `${battery.energyFullWh.toFixed(2)} Wh` : "Continuous"}</strong>
            </div>
          </div>

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
            Zero external querying · Local Linux sysfs power_supply inspection
          </div>
        </article>
      </section>

      {/* Discovered Power Supplies Section */}
      {powerSupply?.powerSources && powerSupply.powerSources.length > 0 && (
        <section style={{ marginTop: "24px" }}>
          <article className="panel" style={{ width: "100%" }}>
            <div className="panel-header" style={{ marginBottom: "14px" }}>
              <div>
                <h3>Discovered Power Supplies & Ports</h3>
                <p>Hardware power delivery devices detected in /sys/class/power_supply</p>
              </div>
              <span className="section-tag">{powerSupply.powerSources.length} CONTROLLERS</span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {powerSupply.powerSources.map((source) => (
                <div
                  key={source}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Cpu size={14} style={{ color: "var(--security-blue)" }} />
                  <span>{source}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </div>
  );
};
