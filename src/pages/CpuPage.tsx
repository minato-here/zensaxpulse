import React from "react";
import { Cpu, Zap, Thermometer, Layers, Clock, Gauge } from "lucide-react";
import type { CpuMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { AreaChart } from "../components/charts/AreaChart";
import { BarGauge } from "../components/charts/BarGauge";
import { LoadingState } from "../components/common/LoadingState";

interface CpuPageProps {
  cpu: CpuMetrics | null;
  loading: boolean;
  error: string | null;
}

export const CpuPage: React.FC<CpuPageProps> = ({ cpu, loading, error }) => {
  if (loading && !cpu) {
    return <LoadingState message="Reading Linux CPU counters and sysfs..." />;
  }

  const avgFreq =
    cpu?.coreFrequenciesMhz && cpu.coreFrequenciesMhz.length > 0
      ? (
          cpu.coreFrequenciesMhz.reduce((a, b) => a + b, 0) /
          cpu.coreFrequenciesMhz.length
        ).toFixed(0)
      : "--";

  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">PROCESSOR ANALYTICS</p>
          <h2>
            CPU <span className="accent-text">Intelligence.</span>
          </h2>
          <p className="welcome-description">
            Live hardware counters, per-core utilization, clock scaling, and thermal states.
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
            <span className="chip-label">Processor</span>
            <span className="chip-value">{cpu?.modelName ?? "Loading..."}</span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">CPU telemetry notice: {error}</div>}

      {/* Top Cards Grid */}
      <section className="metrics-grid">
        <MetricCard
          label="Total Utilization"
          value={cpu ? cpu.usagePercent.toFixed(1) : "--"}
          unit="%"
          detail={cpu ? `${cpu.physicalCores} Cores · ${cpu.logicalThreads} Threads` : "CPU Topology"}
          icon={<Cpu size={20} />}
          percentage={cpu?.usagePercent ?? 0}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Average Frequency"
          value={avgFreq}
          unit="MHz"
          detail={
            cpu?.maxFrequencyMhz
              ? `Max: ${cpu.maxFrequencyMhz.toFixed(0)} MHz${cpu.minFrequencyMhz ? ` · Min: ${cpu.minFrequencyMhz.toFixed(0)} MHz` : ""}`
              : "Dynamic governor"
          }
          icon={<Gauge size={20} />}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Package Temperature"
          value={cpu?.temperatureC != null ? cpu.temperatureC.toFixed(1) : "N/A"}
          unit={cpu?.temperatureC != null ? "°C" : ""}
          detail={
            cpu?.temperatureC != null
              ? "Direct sensor reading from k10temp / coretemp"
              : "Hardware sensor not exposed"
          }
          icon={<Thermometer size={20} />}
          percentage={cpu?.temperatureC != null ? (cpu.temperatureC / 105) * 100 : undefined}
          color={
            (cpu?.temperatureC ?? 0) > 85
              ? "#ef4444"
              : "var(--accent, #22c55e)"
          }
        />

        <MetricCard
          label="Package Power"
          value={cpu?.powerW != null ? cpu.powerW.toFixed(1) : "N/A"}
          unit={cpu?.powerW != null ? "W" : ""}
          detail={
            cpu?.powerW != null
              ? "Live RAPL / hwmon power draw"
              : "RAPL powercap unexposed or non-Intel/AMD interface"
          }
          icon={<Zap size={20} />}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Main Analysis Grid */}
      <section className="lower-grid">
        {/* Historical CPU Utilization Chart */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Utilization History</h3>
              <p>Aggregate CPU load over the last 60 seconds</p>
            </div>
            <span className="section-tag">LIVE</span>
          </div>

          <div style={{ marginTop: "16px", marginBottom: "20px" }}>
            <AreaChart
              data={cpu?.history ?? []}
              height={170}
              color="var(--accent, #22c55e)"
              unit="%"
              label="CPU"
            />
          </div>

          {/* Load Averages */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 600 }}>
              Linux Kernel Load Averages
            </h4>
            <div className="load-average-grid" style={{ marginTop: 0 }}>
              <div className="load-average-card">
                <span>1 minute</span>
                <strong>{cpu ? cpu.loadAverage1m.toFixed(2) : "--"}</strong>
              </div>
              <div className="load-average-card">
                <span>5 minutes</span>
                <strong>{cpu ? cpu.loadAverage5m.toFixed(2) : "--"}</strong>
              </div>
              <div className="load-average-card">
                <span>15 minutes</span>
                <strong>{cpu ? cpu.loadAverage15m.toFixed(2) : "--"}</strong>
              </div>
            </div>
            <div className="load-note">
              Linux load averages reflect runnable and uninterruptible system processes in
              the kernel runqueue, including I/O wait.
            </div>
          </div>
        </article>

        {/* Per-Core Breakdown Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Per-Core Utilization</h3>
              <p>Individual thread utilization from /proc/stat</p>
            </div>
            <span className="system-info-icon">
              <Layers size={16} />
            </span>
          </div>

          <div
            style={{
              maxHeight: "360px",
              overflowY: "auto",
              paddingRight: "6px",
              marginTop: "10px",
            }}
          >
            {cpu?.perCoreUsage && cpu.perCoreUsage.length > 0 ? (
              cpu.perCoreUsage.map((coreUsage, idx) => {
                const freq = cpu.coreFrequenciesMhz?.[idx];
                return (
                  <BarGauge
                    key={idx}
                    label={`Core ${idx}`}
                    value={coreUsage}
                    unit="%"
                    sublabel={freq ? `${freq.toFixed(0)} MHz` : undefined}
                    color={
                      idx % 2 === 0
                        ? "var(--accent, #22c55e)"
                        : "var(--security-blue, #38bdf8)"
                    }
                  />
                );
              })
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "12px", padding: "20px 0" }}>
                Calculating per-core delta counters...
              </div>
            )}
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
            <Clock size={14} style={{ color: "var(--accent)" }} />
            Zero-sleep background counter delta sampling
          </div>
        </article>
      </section>
    </div>
  );
};

