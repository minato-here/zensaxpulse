import React, { useState } from "react";
import {
  Server,
  Power,
  RotateCcw,
  PauseCircle,
  Search,
  Info,
} from "lucide-react";
import type { SystemInfo, ServicesReport, SystemdService } from "../types/telemetry";
import { controlSystemService, executePowerAction } from "../services/telemetry";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { LoadingState } from "../components/common/LoadingState";

interface SystemPageProps {
  systemInfo: SystemInfo | null;
  servicesReport: ServicesReport | null;
  loading: boolean;
  error: string | null;
  onRefreshServices: () => void;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function formatBootTime(timestamp: number): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

export const SystemPage: React.FC<SystemPageProps> = ({
  systemInfo,
  servicesReport,
  loading,
  error,
  onRefreshServices,
}) => {
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedService, setSelectedService] = useState<{
    service: SystemdService;
    action: "start" | "stop" | "restart";
  } | null>(null);

  const [pendingPowerAction, setPendingPowerAction] = useState<"reboot" | "shutdown" | "suspend" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const services = servicesReport?.services ?? [];
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleServiceAction = async () => {
    if (!selectedService) return;
    try {
      const res = await controlSystemService(
        selectedService.service.name,
        selectedService.action
      );
      setFeedback({ type: "success", text: res });
      setSelectedService(null);
      setTimeout(() => onRefreshServices(), 500);
    } catch (err) {
      setFeedback({ type: "error", text: String(err) });
      setSelectedService(null);
    }
  };

  const handlePowerAction = async () => {
    if (!pendingPowerAction) return;
    try {
      const res = await executePowerAction(pendingPowerAction);
      setFeedback({ type: "success", text: res });
      setPendingPowerAction(null);
    } catch (err) {
      setFeedback({ type: "error", text: String(err) });
      setPendingPowerAction(null);
    }
  };

  if (loading && !systemInfo) {
    return <LoadingState message="Inspecting Linux system parameters and systemd status..." />;
  }

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">SYSTEM MANAGEMENT & ARCHITECTURE</p>
          <h2>
            System <span className="accent-text">Intelligence.</span>
          </h2>
          <p className="welcome-description">
            Host environment, kernel modules, systemd service units, and power controls.
          </p>
        </div>

        <div className="system-chip">
          <span className="chip-icon">⚙</span>
          <div>
            <span className="chip-label">Kernel</span>
            <span className="chip-value">{systemInfo?.kernelRelease ?? "Linux"}</span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">System notice: {error}</div>}

      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "12px",
            fontWeight: 600,
            background:
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            color: feedback.type === "success" ? "#22c55e" : "#ef4444",
            border: `1px solid ${
              feedback.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
            }`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* System Power Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "16px 20px",
          borderRadius: "14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          marginBottom: "20px",
          boxShadow: "3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light)",
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>System Power Actions</h4>
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
            Execute authenticated system power transitions with explicit safety confirmations
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {/* Suspend */}
          <button
            onClick={() => setPendingPowerAction("suspend")}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <PauseCircle size={15} style={{ color: "var(--security-blue)" }} />
            <span>Suspend</span>
          </button>

          {/* Reboot */}
          <button
            onClick={() => setPendingPowerAction("reboot")}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: "rgba(245, 158, 11, 0.1)",
              color: "#f59e0b",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} />
            <span>Restart</span>
          </button>

          {/* Shutdown */}
          <button
            onClick={() => setPendingPowerAction("shutdown")}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Power size={15} />
            <span>Shut Down</span>
          </button>
        </div>
      </div>

      {/* Two Column Grid: System Info & CPU Flags / Modules */}
      <section className="lower-grid">
        {/* Core System Properties Panel */}
        <article className="panel system-panel">
          <div className="panel-header">
            <div>
              <h3>Environment & Kernel</h3>
              <p>Linux distribution and hardware architecture</p>
            </div>
            <span className="system-info-icon">
              <Server size={16} />
            </span>
          </div>

          <div className="system-info-list">
            <div className="system-info-row">
              <span>Operating System</span>
              <strong>{systemInfo?.osName ?? "Linux"}</strong>
            </div>

            <div className="system-info-row">
              <span>Kernel Release</span>
              <strong>{systemInfo?.kernelRelease ?? "Unknown"}</strong>
            </div>

            <div className="system-info-row">
              <span>Architecture</span>
              <strong>{systemInfo?.architecture ?? "x86_64"}</strong>
            </div>

            <div className="system-info-row">
              <span>Hostname</span>
              <strong>{systemInfo?.hostname ?? "localhost"}</strong>
            </div>

            <div className="system-info-row">
              <span>Desktop Environment</span>
              <strong>{systemInfo?.desktopEnvironment ?? "KDE Plasma"}</strong>
            </div>

            <div className="system-info-row">
              <span>Display Server</span>
              <strong>{systemInfo?.displayServer ?? "Wayland"}</strong>
            </div>

            <div className="system-info-row">
              <span>System Uptime</span>
              <strong>{systemInfo ? formatUptime(systemInfo.uptimeSeconds) : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Boot Timestamp</span>
              <strong>{systemInfo ? formatBootTime(systemInfo.bootTimestamp) : "--"}</strong>
            </div>

            <div className="system-info-row">
              <span>Loaded Kernel Modules</span>
              <strong>{systemInfo?.kernelModulesCount ?? 0} modules</strong>
            </div>
          </div>
        </article>

        {/* CPU Hardware Capabilities / Flags */}
        <article className="panel performance-panel">
          <div className="panel-header">
            <div>
              <h3>CPU Instructions & Flags</h3>
              <p>Hardware instruction set features exposed in /proc/cpuinfo</p>
            </div>
            <span className="section-tag">x86_64</span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "16px",
              maxHeight: "320px",
              overflowY: "auto",
              paddingRight: "6px",
            }}
          >
            {systemInfo?.cpuFlagsSample && systemInfo.cpuFlagsSample.length > 0 ? (
              systemInfo.cpuFlagsSample.map((flag) => (
                <span
                  key={flag}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "var(--surface)",
                    boxShadow:
                      "inset 1px 1px 3px var(--shadow-dark), inset -1px -1px 3px var(--shadow-light)",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  {flag}
                </span>
              ))
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                CPU flags query pending...
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "8px",
              background: "var(--surface-raised)",
              fontSize: "11px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Hardware extensions including AVX2, FMA, AES-NI, and virtualization acceleration (SVM/VMX) are active.
          </div>
        </article>
      </section>

      {/* Systemd Services Section */}
      <section style={{ marginTop: "24px" }}>
        <article className="panel" style={{ width: "100%" }}>
          <div
            className="panel-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3>Systemd Services</h3>
              <p>{servicesReport?.statusMessage ?? "Inspecting system service units"}</p>
            </div>

            {/* Service Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--surface-raised)",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                width: "280px",
              }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  width: "100%",
                }}
              />
            </div>
          </div>

          {servicesReport && !servicesReport.isSystemdAvailable ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              <Info size={24} style={{ color: "var(--security-blue)", marginBottom: "8px" }} />
              <p style={{ margin: 0 }}>{servicesReport.statusMessage}</p>
              <p style={{ fontSize: "11px", marginTop: "4px" }}>
                Systemd service management is active when booted with systemd as PID 1.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  textAlign: "left",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--surface)",
                    zIndex: 2,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <tr style={{ color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 12px" }}>Unit Name</th>
                    <th style={{ padding: "8px 12px" }}>State</th>
                    <th style={{ padding: "8px 12px" }}>Sub-state</th>
                    <th style={{ padding: "8px 12px" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length > 0 ? (
                    filteredServices.slice(0, 100).map((srv, idx) => {
                      const isActive = srv.activeState === "active";
                      return (
                        <tr
                          key={srv.name}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            background: idx % 2 === 0 ? "transparent" : "var(--surface-raised)",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {srv.name}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background: isActive ? "var(--accent-soft)" : "rgba(239, 68, 68, 0.1)",
                                color: isActive ? "var(--accent)" : "#ef4444",
                              }}
                            >
                              {srv.activeState}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                            {srv.subState}
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--text-secondary)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {srv.description}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {isActive ? (
                                <>
                                  <button
                                    onClick={() => setSelectedService({ service: srv, action: "restart" })}
                                    style={{
                                      padding: "3px 7px",
                                      borderRadius: "5px",
                                      border: "1px solid var(--border)",
                                      background: "var(--surface)",
                                      color: "var(--security-blue)",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                    title="Restart Service"
                                  >
                                    Restart
                                  </button>
                                  <button
                                    onClick={() => setSelectedService({ service: srv, action: "stop" })}
                                    style={{
                                      padding: "3px 7px",
                                      borderRadius: "5px",
                                      border: "1px solid rgba(239, 68, 68, 0.3)",
                                      background: "rgba(239, 68, 68, 0.08)",
                                      color: "#ef4444",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                    title="Stop Service"
                                  >
                                    Stop
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSelectedService({ service: srv, action: "start" })}
                                  style={{
                                    padding: "3px 7px",
                                    borderRadius: "5px",
                                    border: "1px solid var(--accent)",
                                    background: "var(--accent-soft)",
                                    color: "var(--accent)",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                  title="Start Service"
                                >
                                  Start
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                        No matching services found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {/* Service Control Confirmation Dialog */}
      <ConfirmDialog
        isOpen={selectedService !== null}
        title={`${selectedService?.action.toUpperCase()} Service`}
        message={`Are you sure you want to execute "systemctl ${selectedService?.action} ${selectedService?.service.name}"? This operation may require polkit administrator authorization.`}
        confirmLabel={`Execute ${selectedService?.action}`}
        isDestructive={selectedService?.action === "stop"}
        onConfirm={handleServiceAction}
        onCancel={() => setSelectedService(null)}
      />

      {/* System Power Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={pendingPowerAction !== null}
        title={`Confirm System ${pendingPowerAction?.toUpperCase()}`}
        message={`Are you sure you want to ${pendingPowerAction} this machine? All uncommitted application work across your active desktop session will terminate.`}
        confirmLabel={pendingPowerAction === "reboot" ? "Restart Now" : pendingPowerAction === "shutdown" ? "Shut Down Now" : "Suspend Now"}
        isDestructive={pendingPowerAction !== "suspend"}
        onConfirm={handlePowerAction}
        onCancel={() => setPendingPowerAction(null)}
      />
    </div>
  );
};
