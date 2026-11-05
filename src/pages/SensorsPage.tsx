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
} from "lucide-react";
import type { SensorMetrics, SensorReading } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { LoadingState } from "../components/common/LoadingState";

interface SensorsPageProps {
  sensors: SensorMetrics | null;
  loading: boolean;
  error: string | null;
}

const SensorGroupCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  readings: SensorReading[];
  color?: string;
}> = ({ title, icon, readings, color = "var(--accent)" }) => {
  if (readings.length === 0) return null;

  return (
    <article className="panel" style={{ width: "100%", marginBottom: "16px" }}>
      <div className="panel-header" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ color }}>{icon}</div>
          <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <p style={{ margin: 0 }}>{readings.length} sensor probes reporting</p>
          </div>
        </div>
        <span className="section-tag">{readings[0]?.unit ?? "HWMON"}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        {readings.map((reading) => {
          const isHot = reading.unit === "°C" && reading.value > 80;

          return (
            <div
              key={reading.id}
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: "var(--surface)",
                boxShadow:
                  "inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  {reading.name}
                </strong>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: isHot ? "#ef4444" : color,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {reading.value.toFixed(reading.unit === "V" ? 3 : 1)}{" "}
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{reading.unit}</span>
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                <span>Source: {reading.source}</span>
                {reading.criticalValue && (
                  <span style={{ color: "#ef4444" }}>
                    Crit: {reading.criticalValue}°C
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
            Dynamic hardware discovery iterating /sys/class/hwmon and /sys/class/thermal.
          </p>
        </div>

        <div className="system-chip">
          <span className="chip-icon">◈</span>
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
        />

        <MetricCard
          label="Cooling Fans"
          value={sensors?.fans.length ?? 0}
          unit="Active"
          detail={
            sensors?.fans[0]
              ? `${sensors.fans[0].name}: ${sensors.fans[0].value.toFixed(0)} RPM`
              : "Integrated cooling assembly"
          }
          icon={<Wind size={20} />}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Voltage Channels"
          value={sensors?.voltages.length ?? 0}
          unit="Rails"
          detail="Motherboard & SoC voltage sensors"
          icon={<Zap size={20} />}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Power Channels"
          value={sensors?.power.length ?? 0}
          unit="Probes"
          detail="Live hardware wattage monitoring"
          icon={<Activity size={20} />}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Categorized Sensor Groups */}
      <div style={{ marginTop: "8px" }}>
        {/* CPU Temperatures */}
        <SensorGroupCard
          title="CPU Core & Package Temperatures"
          icon={<Cpu size={22} />}
          readings={sensors?.cpuTemperatures ?? []}
          color="var(--accent, #22c55e)"
        />

        {/* GPU Temperatures */}
        <SensorGroupCard
          title="Graphics Processor Thermals"
          icon={<CircuitBoard size={22} />}
          readings={sensors?.gpuTemperatures ?? []}
          color="var(--security-blue, #38bdf8)"
        />

        {/* Cooling Fans */}
        <SensorGroupCard
          title="Cooling Fans & Tachometers"
          icon={<Wind size={22} />}
          readings={sensors?.fans ?? []}
          color="var(--security-blue, #38bdf8)"
        />

        {/* Storage Temperatures */}
        <SensorGroupCard
          title="NVMe & Storage Thermals"
          icon={<HardDrive size={22} />}
          readings={sensors?.storageTemperatures ?? []}
          color="var(--accent, #22c55e)"
        />

        {/* Motherboard & ACPI Sensors */}
        <SensorGroupCard
          title="Motherboard & ACPI Thermal Zones"
          icon={<Layers size={22} />}
          readings={sensors?.motherboardTemperatures ?? []}
          color="var(--text-secondary)"
        />

        {/* Voltage Rails */}
        <SensorGroupCard
          title="Voltage Rails"
          icon={<Zap size={22} />}
          readings={sensors?.voltages ?? []}
          color="var(--accent, #22c55e)"
        />

        {/* Power Sensors */}
        <SensorGroupCard
          title="Power & Energy Probes"
          icon={<Activity size={22} />}
          readings={sensors?.power ?? []}
          color="var(--security-blue, #38bdf8)"
        />
      </div>
    </div>
  );
};
