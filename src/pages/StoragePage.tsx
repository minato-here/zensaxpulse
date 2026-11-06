import React from "react";
import {
  HardDrive,
  Disc,
  ArrowDownCircle,
  ArrowUpCircle,
  Thermometer,
  FolderTree,
} from "lucide-react";
import type { StorageMetrics } from "../types/telemetry";
import { MetricCard } from "../components/cards/MetricCard";
import { LoadingState } from "../components/common/LoadingState";

interface StoragePageProps {
  storage: StorageMetrics | null;
  loading: boolean;
  error: string | null;
}

export const StoragePage: React.FC<StoragePageProps> = ({
  storage,
  loading,
  error,
}) => {
  if (loading && !storage) {
    return <LoadingState message="Scanning storage devices and mount table..." />;
  }

  const rootUsed = storage?.rootUsedGb ?? 0;
  const rootAvail = storage?.rootAvailableGb ?? 0;
  const rootUsage = storage?.rootUsagePercent ?? 0;

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">STORAGE & FILESYSTEM SUBSYSTEM</p>
          <h2>
            Storage <span className="accent-text">Intelligence.</span>
          </h2>
          <p className="welcome-description">
            Physical drives, mounted partitions, disk I/O throughput rates, and NVMe thermals.
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
            <span className="chip-label">Root mount</span>
            <span className="chip-value">
              {storage?.rootUsedGb != null
                ? `${storage.rootUsedGb.toFixed(1)} / ${storage.rootTotalGb?.toFixed(1)} GB (${rootUsage.toFixed(0)}%)`
                : "Scanning..."}
            </span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">Storage notice: {error}</div>}

      {/* Primary Metrics Grid */}
      <section className="metrics-grid">
        <MetricCard
          label="Root Partition (/)"
          value={storage?.rootUsagePercent != null ? storage.rootUsagePercent.toFixed(0) : "--"}
          unit="%"
          detail={`${rootUsed.toFixed(1)} GB used · ${rootAvail.toFixed(1)} GB free`}
          icon={<HardDrive size={20} />}
          percentage={rootUsage}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Disk Read Speed"
          value={storage ? storage.readSpeedMbS.toFixed(2) : "0.00"}
          unit="MB/s"
          detail="Calculated from /proc/diskstats sector deltas"
          icon={<ArrowDownCircle size={20} />}
          color="var(--security-blue, #38bdf8)"
        />

        <MetricCard
          label="Disk Write Speed"
          value={storage ? storage.writeSpeedMbS.toFixed(2) : "0.00"}
          unit="MB/s"
          detail="Active disk write throughput"
          icon={<ArrowUpCircle size={20} />}
          color="var(--accent, #22c55e)"
        />

        <MetricCard
          label="Physical Storage Devices"
          value={storage?.physicalDisks.length ?? 0}
          unit="Disks"
          detail={
            storage?.physicalDisks[0]
              ? `${storage.physicalDisks[0].model} (${storage.physicalDisks[0].sizeGb.toFixed(0)} GB)`
              : "Scanning block devices"
          }
          icon={<Disc size={20} />}
          color="var(--security-blue, #38bdf8)"
        />
      </section>

      {/* Main Grid: Physical Devices & Mounted Partitions */}
      <section className="lower-grid">
        {/* Physical Storage Devices Card */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>Physical Storage Devices</h3>
              <p>Hardware controllers detected via /sys/block & lsblk</p>
            </div>
            <span className="section-tag">HARDWARE</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            {storage?.physicalDisks && storage.physicalDisks.length > 0 ? (
              storage.physicalDisks.map((disk) => (
                <div
                  key={disk.name}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "var(--surface)",
                    boxShadow:
                      "inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Disc size={18} style={{ color: "var(--accent)" }} />
                      <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        {disk.model}
                      </strong>
                    </div>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {disk.diskType}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    <span>Node: /dev/{disk.name}</span>
                    <span>Total Raw Capacity: <strong style={{ color: "var(--text-primary)" }}>{disk.sizeGb.toFixed(1)} GB</strong></span>
                    {disk.temperatureC != null && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent)" }}>
                        <Thermometer size={14} />
                        {disk.temperatureC.toFixed(0)}°C
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", padding: "20px 0" }}>
                Scanning physical storage devices...
              </div>
            )}
          </div>
        </article>

        {/* Mounted Partitions Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Mounted Filesystems</h3>
              <p>Active partition allocations and mounts</p>
            </div>
            <span className="system-info-icon">
              <FolderTree size={16} />
            </span>
          </div>

          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              paddingRight: "6px",
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {storage?.partitions && storage.partitions.length > 0 ? (
              storage.partitions.map((part) => (
                <div
                  key={`${part.device}-${part.mountPoint}`}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "var(--surface-raised)",
                    border: part.isRoot ? "1px solid var(--accent-soft)" : "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "13px", color: part.isRoot ? "var(--accent)" : "var(--text-primary)" }}>
                        {part.mountPoint}
                      </strong>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        ({part.fstype})
                      </span>
                      {part.isRoot && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            fontWeight: 600,
                          }}
                        >
                          ROOT
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {part.usagePercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="progress-track" style={{ height: "5px", marginBottom: "6px" }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${part.usagePercent}%`,
                        background: part.usagePercent > 90 ? "#ef4444" : "var(--accent)",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>{part.device}</span>
                    <span>
                      {part.usedGb.toFixed(1)} / {part.totalGb.toFixed(1)} GB ({part.availableGb.toFixed(1)} GB free)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", padding: "20px 0" }}>
                Reading mounted filesystems...
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};
