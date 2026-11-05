import React from "react";
import {
  Thermometer,
  Wind,
  Zap,
  Cpu,
  CircuitBoard,
  HardDrive,
  Activity,
  Layers,
  Info,
} from "lucide-react";
import type { SensorMetrics, SensorReading } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { LoadingState } from "../components/common/LoadingState";

interface SensorsPageProps {
  sensors: SensorMetrics | null;
  loading: boolean;
  error: string | null;
}

const SensorProbeCard: React.FC<{
  reading: SensorReading;
  defaultColor?: string;
}> = ({ reading, defaultColor = "var(--accent)" }) => {
  const isTemp = reading.unit === "°C";
  const isFan = reading.unit === "RPM";
  const isVolt = reading.unit === "V";
  const isPower = reading.unit === "W";

  // Determine severity and progress percentage
  let statusLabel = "NORMAL";
  let statusColor = defaultColor;
  let percent = 0;

  if (isTemp) {
    const crit = reading.criticalValue || 100;
    percent = Math.min(100, Math.max(0, (reading.value / crit) * 100));
    if (reading.value >= 85) {
      statusLabel = "CRITICAL";
      statusColor = "#ef4444";
    } else if (reading.value >= 70) {
      statusLabel = "ELEVATED";
      statusColor = "#f59e0b";
    } else if (reading.value >= 55) {
      statusLabel = "WARM";
      statusColor = "var(--security-blue, #38bdf8)";
    } else {
      statusLabel = "NOMINAL";
      statusColor = "var(--accent, #22c55e)";
    }
  } else if (isFan) {
    percent = Math.min(100, Math.max(0, (reading.value / 4500) * 100));
    statusLabel = reading.value > 0 ? "SPINNING" : "STOPPED";
    statusColor = reading.value > 0 ? "var(--security-blue, #38bdf8)" : "var(--text-muted)";
  } else if (isVolt) {
    statusLabel = "REGULATED";
    statusColor = "var(--accent, #22c55e)";
    percent = 100;
  } else if (isPower) {
    percent = Math.min(100, Math.max(0, (reading.value / 150) * 100));
    statusLabel = "ACTIVE";
    statusColor = "var(--security-blue, #38bdf8)";
  }

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        background: "var(--surface-raised)",
        border: `1px solid ${statusLabel === "CRITICAL" ? "rgba(239, 68, 68, 0.4)" : "var(--border)"}`,
        boxShadow:
          statusLabel === "CRITICAL"
            ? "0 0 12px rgba(239, 68, 68, 0.2)"
            : "0 2px 6px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Top Row: Name & Status Pill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "68%",
          }}
          title={reading.name}
        >
          {reading.name}
        </span>

        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "5px",
            background: `${statusColor}18`,
            color: statusColor,
            border: `1px solid ${statusColor}35`,
            letterSpacing: "0.03em",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Main Metric Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: statusColor,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {reading.value.toFixed(isVolt ? 3 : isFan ? 0 : 1)}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>
          {reading.unit}
        </span>
      </div>

      {/* Micro Progress Bar (for Thermals, Fans, and Power) */}
      {(isTemp || isFan || isPower) && (
        <div
          style={{
            height: "5px",
            borderRadius: "3px",
            background: "var(--surface)",
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              background: statusColor,
              borderRadius: "3px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}

      {/* Footer Details: Source Driver & Critical Threshold */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "10px",
          color: "var(--text-muted)",
          marginTop: "2px",
        }}
      >
        <span style={{ fontFamily: "monospace", opacity: 0.8 }}>
          {reading.source}
        </span>

        {reading.criticalValue ? (
          <span style={{ color: reading.value >= reading.criticalValue ? "#ef4444" : "var(--text-muted)", fontWeight: 600 }}>
            Crit: {reading.criticalValue}°C
          </span>
        ) : (
          <span>Safe zone</span>
        )}
      </div>
    </div>
  );
};

const SensorGroupCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  readings: SensorReading[];
  color?: string;
  emptyFallbackMessage?: string;
}> = ({
  title,
  subtitle,
  icon,
  readings,
  color = "var(--accent)",
  emptyFallbackMessage,
}) => {
  if (readings.length === 0) {
    if (!emptyFallbackMessage) return null;
    return (
      <article
        className="panel"
        style={{
          width: "100%",
          marginBottom: "16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
        }}
      >
        <div className="panel-header" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              {icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                {subtitle ?? "Firmware embedded controller managed"}
              </p>
            </div>
          </div>
          <span className="section-tag">EC / AUTO</span>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            background: "var(--surface-raised)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            lineHeight: 1.6,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            border: "1px solid var(--border)",
          }}
        >
          <Info size={16} style={{ color: "var(--security-blue)", flexShrink: 0 }} />
          <span>{emptyFallbackMessage}</span>
        </div>
      </article>
    );
  }

  return (
    <article
      className="panel"
      style={{
        width: "100%",
        marginBottom: "20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)",
      }}
    >
      <div className="panel-header" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: `${color}18`,
              border: `1px solid ${color}35`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
            }}
          >
            {icon}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{title}</h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              {readings.length} {readings.length === 1 ? "probe" : "probes"} actively monitoring
            </p>
          </div>
        </div>

        <span
          className="section-tag"
          style={{
            background: `${color}15`,
            color,
            borderColor: `${color}35`,
          }}
        >
          {readings[0]?.unit ?? "HWMON"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "12px",
        }}
      >
        {readings.map((reading) => (
          <SensorProbeCard key={reading.id} reading={reading} defaultColor={color} />
        ))}
      </div>
    </article>
  );
};

export const SensorsPage: React.FC<SensorsPageProps> = ({
  sensors,
  loading,
  error,
}) => {
  if (loading && !sensors) {
    return <LoadingState message="Discovering kernel hwmon & thermal sensors..." />;
  }

  const totalSensors =
    (sensors?.cpuTemperatures.length ?? 0) +
    (sensors?.gpuTemperatures.length ?? 0) +
    (sensors?.storageTemperatures.length ?? 0) +
    (sensors?.motherboardTemperatures.length ?? 0) +
    (sensors?.fans.length ?? 0) +
    (sensors?.voltages.length ?? 0) +
    (sensors?.power.length ?? 0);

  const highestTemp = Math.max(
    ...(sensors?.cpuTemperatures.map((s) => s.value) ?? [0]),
    ...(sensors?.gpuTemperatures.map((s) => s.value) ?? [0]),
    0
  );

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">HARDWARE MONITORING SUBSYSTEM</p>
          <h2>
            Sensor <span className="accent-text">Intelligence.</span>
          </h2>
          <p className="welcome-description">
            Dynamic hardware discovery iterating Linux /sys/class/hwmon and /sys/class/thermal.
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
            <span className="chip-label">Active Probes</span>
            <span className="chip-value">{totalSensors} Sensors Online</span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">Sensors notice: {error}</div>}

      {/* Top Overview Cards */}
      <section className="metrics-grid">
        <MetricCard
          label="Thermal Peak"
          value={highestTemp > 0 ? highestTemp.toFixed(1) : "--"}
          unit={highestTemp > 0 ? "°C" : ""}
          detail="Highest recorded CPU / GPU thermal junction"
          icon={<Thermometer size={20} />}
          percentage={highestTemp > 0 ? (highestTemp / 105) * 100 : 0}
          color={highestTemp > 85 ? "#ef4444" : "var(--accent, #22c55e)"}
          badge={highestTemp > 85 ? "Critical Peak" : "Normal"}
        />

        <MetricCard
          label="Cooling Fans"
          value={
            sensors?.fans && sensors.fans.length > 0
              ? sensors.fans.length
              : "0"
          }
          unit={sensors?.fans && sensors.fans.length > 0 ? "Active" : "Auto"}
          detail={
            sensors?.fans && sensors.fans.length > 0
              ? `${sensors.fans[0].name}: ${sensors.fans[0].value.toFixed(0)} RPM`
              : "Firmware EC automatic dynamic cooling"
          }
          icon={<Wind size={20} />}
          color={
            sensors?.fans && sensors.fans.length > 0
              ? "var(--security-blue, #38bdf8)"
              : "var(--text-muted)"
          }
          badge={
            sensors?.fans && sensors.fans.length > 0
              ? `${sensors.fans.length} Tachometers`
              : "Auto / EC"
          }
        />

        <MetricCard
          label="Voltage Channels"
          value={sensors?.voltages.length ?? 0}
          unit="Rails"
          detail="Motherboard & SoC regulated voltage sensors"
          icon={<Zap size={20} />}
          color="var(--accent, #22c55e)"
          badge="HWMON"
        />

        <MetricCard
          label="Power Channels"
          value={sensors?.power.length ?? 0}
          unit="Probes"
          detail="Live hardware wattage monitoring"
          icon={<Activity size={20} />}
          color="var(--security-blue, #38bdf8)"
          badge="Live Wattage"
        />
      </section>

      {/* Categorized Sensor Groups */}
      <div style={{ marginTop: "12px" }}>
        {/* CPU Temperatures */}
        <SensorGroupCard
          title="CPU Core & Package Temperatures"
          subtitle="Direct core junction temperatures from k10temp / coretemp"
          icon={<Cpu size={20} />}
          readings={sensors?.cpuTemperatures ?? []}
          color="var(--accent, #22c55e)"
          emptyFallbackMessage="No direct CPU junction probes reported. Package thermals may be managed through ACPI thermal zones."
        />

        {/* GPU Temperatures */}
        <SensorGroupCard
          title="Graphics Processor Thermals"
          subtitle="Dedicated GPU edge and hotspot sensors"
          icon={<CircuitBoard size={20} />}
          readings={sensors?.gpuTemperatures ?? []}
          color="var(--security-blue, #38bdf8)"
          emptyFallbackMessage="Discrete GPU sensor not reporting in current power state or powered down via runtime D3cold."
        />

        {/* Cooling Fans */}
        <SensorGroupCard
          title="Cooling Fans & Tachometers"
          subtitle="Hardware tachometer probes reporting rotational RPM"
          icon={<Wind size={20} />}
          readings={sensors?.fans ?? []}
          color="var(--security-blue, #38bdf8)"
          emptyFallbackMessage="No hardware fan tachometers exposed via hwmon. On modern laptops, cooling fans are driven directly by firmware embedded controllers (EC) which regulate fan curves automatically without exposing raw tachometer PWM to userspace."
        />

        {/* Storage Temperatures */}
        <SensorGroupCard
          title="NVMe & Storage Thermals"
          subtitle="Flash memory controller and composite junction thermals"
          icon={<HardDrive size={20} />}
          readings={sensors?.storageTemperatures ?? []}
          color="var(--accent, #22c55e)"
        />

        {/* Motherboard & ACPI Sensors */}
        <SensorGroupCard
          title="Motherboard & ACPI Thermal Zones"
          subtitle="Chassis, VRM, and motherboard thermal zones"
          icon={<Layers size={20} />}
          readings={sensors?.motherboardTemperatures ?? []}
          color="var(--text-secondary)"
        />

        {/* Voltage Rails */}
        <SensorGroupCard
          title="Voltage Rails"
          subtitle="Regulated DC power planes (+12V, +5V, +3.3V, Vcore)"
          icon={<Zap size={20} />}
          readings={sensors?.voltages ?? []}
          color="var(--accent, #22c55e)"
        />

        {/* Power Sensors */}
        <SensorGroupCard
          title="Power & Energy Probes"
          subtitle="Real-time SoC and platform energy consumption"
          icon={<Activity size={20} />}
          readings={sensors?.power ?? []}
          color="var(--security-blue, #38bdf8)"
        />
      </div>
    </div>
  );
};
