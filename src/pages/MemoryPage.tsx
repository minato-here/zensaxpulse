import React from "react";
import { MemoryStick, Database, HardDrive, Info, Layers, RefreshCw } from "lucide-react";
import type { MemoryMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { AreaChart } from "../components/charts/AreaChart";
import { BarGauge } from "../components/charts/BarGauge";
import { LoadingState } from "../components/common/LoadingState";

interface MemoryPageProps {
  memory: MemoryMetrics | null;
  loading: boolean;
  error: string | null;
}

export const MemoryPage: React.FC<MemoryPageProps> = ({
  memory,
  loading,
  error,
}) => {
  if (loading && !memory) {
    return <LoadingState message="Reading Linux /proc/meminfo telemetry..." />;
  }

  const totalRam = memory?.totalRamGb ?? 0;
  const usedRam = memory?.usedRamGb ?? 0;
  const availRam = memory?.availableRamGb ?? 0;
  const cachedRam = memory?.cachedRamGb ?? 0;
  const buffersRam = memory?.buffersRamGb ?? 0;
  const freeRam = memory?.freeRamGb ?? 0;

  const totalSwap = memory?.totalSwapGb ?? 0;
  const usedSwap = memory?.usedSwapGb ?? 0;

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">MEMORY & CACHE SUBSYSTEM</p>
          <h2>
            Memory <span className="accent-text">Analytics.</span>
          </h2>
          <p className="welcome-description">
            Kernel memory allocations, page cache, swap management, and slab memory breakdown.
          </p>
        </div>

        <div className="system-chip">
          <span className="chip-icon">▤</span>
          <div>
            <span className="chip-label">Physical RAM</span>
            <span className="chip-value">
              {memory ? `${totalRam.toFixed(1)} GB DDR` : "Loading..."}
            </span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">Memory notice: {error}</div>}

      {/* Primary Cards */}
      <section className="metrics-grid">
        <MetricCard
          label="Used Physical RAM"
          value={memory ? usedRam.toFixed(1) : "--"}
          unit="GB"
          detail={`${memory ? availRam.toFixed(1) : "--"} GB actually available to applications`}
          icon={<MemoryStick size={20} />}
          percentage={memory?.ramUsagePercent ?? 0}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Page Cache & Buffers"
          value={memory ? (cachedRam + buffersRam).toFixed(1) : "--"}
          unit="GB"
          detail={`${cachedRam.toFixed(1)} GB cached · ${buffersRam.toFixed(2)} GB buffer metadata`}
          icon={<Layers size={20} />}
          percentage={totalRam > 0 ? ((cachedRam + buffersRam) / totalRam) * 100 : 0}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Free Physical RAM"
          value={memory ? freeRam.toFixed(1) : "--"}
          unit="GB"
          detail="Completely untouched memory pages waiting for allocation"
          icon={<Database size={20} />}
          percentage={totalRam > 0 ? (freeRam / totalRam) * 100 : 0}
          color="var(--text-muted, #707789)"
        />

        <MetricCard
          label="Swap Space"
          value={totalSwap > 0 ? usedSwap.toFixed(1) : "0.0"}
          unit="GB"
          detail={
            totalSwap > 0
              ? `${usedSwap.toFixed(1)} / ${totalSwap.toFixed(1)} GB swap used`
              : "No active swapfile or swap partition configured"
          }
          icon={<HardDrive size={20} />}
          percentage={memory?.swapUsagePercent ?? 0}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Lower Grid: Chart and Linux Memory Architecture Explanation */}
      <section className="lower-grid">
        {/* Historical RAM Usage Chart */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Memory Utilization History</h3>
              <p>Active physical RAM consumption over time</p>
            </div>
            <span className="section-tag">LIVE</span>
          </div>

          <div style={{ marginTop: "16px", marginBottom: "20px" }}>
            <AreaChart
              data={memory?.history ?? []}
              height={170}
              color="var(--accent, #22c55e)"
              unit="%"
              label="RAM"
            />
          </div>

          {/* Memory Segment Breakdown */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600 }}>
              Physical Memory Distribution
            </h4>

            <BarGauge
              label="Application Memory (Used)"
              value={usedRam}
              max={totalRam || 1}
              unit=" GB"
              color="var(--accent, #22c55e)"
            />

            <BarGauge
              label="Disk Cache & Buffers (Reclaimable)"
              value={cachedRam + buffersRam}
              max={totalRam || 1}
              unit=" GB"
              color="var(--security-blue, #38bdf8)"
            />

            <BarGauge
              label="Completely Free Memory"
              value={freeRam}
              max={totalRam || 1}
              unit=" GB"
              color="var(--text-muted, #707789)"
            />
          </div>
        </article>

        {/* Detailed Linux Memory Structure Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Kernel Memory Breakdown</h3>
              <p>Subsystem allocations from /proc/meminfo</p>
            </div>
            <span className="system-info-icon">
              <Info size={16} />
            </span>
          </div>

          <div className="system-info-list">
            <div className="system-info-row">
              <span>Shared Memory (Shmem)</span>
              <strong>{memory ? `${memory.sharedMb.toFixed(0)} MB` : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Kernel Slab Memory</span>
              <strong>{memory ? `${memory.slabMb.toFixed(0)} MB` : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Dirty Cache Pages</span>
              <strong>{memory ? `${memory.dirtyMb.toFixed(1)} MB` : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Active Writeback</span>
              <strong>{memory ? `${memory.writebackMb.toFixed(1)} MB` : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Total Swap Configured</span>
              <strong>{totalSwap > 0 ? `${totalSwap.toFixed(1)} GB` : "None"}</strong>
            </div>

            <div className="system-info-row">
              <span>Swap In-Use</span>
              <strong>{totalSwap > 0 ? `${usedSwap.toFixed(1)} GB` : "0.0 GB"}</strong>
            </div>
          </div>

          {/* Educational Note about Linux Memory */}
          <div
            style={{
              marginTop: "16px",
              padding: "14px",
              borderRadius: "10px",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>
              <RefreshCw size={13} />
              <span>Understanding Linux Memory Management</span>
            </div>
            In modern Linux kernels, <strong>Available Memory</strong> (not Free Memory) is the true metric of capacity. Unused RAM is automatically utilized by the kernel for disk cache to speed up filesystem operations. This cached memory is instantly released the moment an application needs it.
          </div>
        </article>
      </section>
    </div>
  );
};

