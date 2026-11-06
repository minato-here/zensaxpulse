import React, { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Filter,
  ArrowUpDown,
  User,
} from "lucide-react";
import type { ProcessInfo } from "../types/telemetry";
import { killProcess } from "../services/telemetry";
import { ConfirmDialog } from "../components/dialogs/ConfirmDialog";
import { LoadingState } from "../components/common/LoadingState";

interface ProcessesPageProps {
  processes: ProcessInfo[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type SortField = "cpu" | "memory" | "pid" | "name";

export const ProcessesPage: React.FC<ProcessesPageProps> = ({
  processes,
  loading,
  error,
  onRefresh,
}) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortAsc, setSortAsc] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");

  // Process termination modal state
  const [targetProcess, setTargetProcess] = useState<ProcessInfo | null>(null);
  const [signalType, setSignalType] = useState<"SIGTERM" | "SIGKILL">("SIGTERM");
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Extract unique users
  const uniqueUsers = useMemo(() => {
    if (!processes) return [];
    return Array.from(new Set(processes.map((p) => p.user))).sort();
  }, [processes]);

  // Filter and sort processes
  const filteredProcesses = useMemo(() => {
    if (!processes) return [];

    let result = processes.filter((p) => {
      // Search
      const matchSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.pid.toString().includes(search) ||
        p.cmdline.toLowerCase().includes(search.toLowerCase());

      // User
      const matchUser = userFilter === "ALL" || p.user === userFilter;

      // State
      const matchState =
        stateFilter === "ALL" || p.state.startsWith(stateFilter);

      return matchSearch && matchUser && matchState;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "cpu") cmp = a.cpuPercent - b.cpuPercent;
      else if (sortField === "memory") cmp = a.memoryRssMb - b.memoryRssMb;
      else if (sortField === "pid") cmp = a.pid - b.pid;
      else if (sortField === "name") cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [processes, search, sortField, sortAsc, userFilter, stateFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleKill = async () => {
    if (!targetProcess) return;

    try {
      const res = await killProcess(targetProcess.pid, signalType);
      setActionFeedback({ type: "success", text: res });
      setTargetProcess(null);
      setTimeout(() => onRefresh(), 300);
    } catch (err) {
      setActionFeedback({ type: "error", text: String(err) });
      setTargetProcess(null);
    }
  };

  if (loading && !processes) {
    return <LoadingState message="Inspecting Linux /proc process table..." />;
  }

  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="welcome-section">
        <div>
          <p className="eyebrow">PROCESS & THREAD MONITOR</p>
          <h2>
            Process <span className="accent-text">Manager.</span>
          </h2>
          <p className="welcome-description">
            Real-time process tree, CPU and resident memory usage, thread counts, and process controls.
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
            <span className="chip-label">Active tasks</span>
            <span className="chip-value">
              {processes ? `${processes.length} Processes` : "Loading..."}
            </span>
          </div>
        </div>
      </section>

      {error && <div className="telemetry-error">Process table warning: {error}</div>}

      {actionFeedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "12px",
            fontWeight: 600,
            background:
              actionFeedback.type === "success"
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            color: actionFeedback.type === "success" ? "#22c55e" : "#ef4444",
            border: `1px solid ${
              actionFeedback.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
            }`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{actionFeedback.text}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "18px",
          background: "var(--surface)",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface-raised)",
            padding: "8px 12px",
            borderRadius: "8px",
            flex: "1 1 240px",
            border: "1px solid var(--border)",
          }}
        >
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search processes by name, PID, or command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "13px",
              width: "100%",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* User filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <User size={15} style={{ color: "var(--text-muted)" }} />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={{
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "7px 10px",
              fontSize: "12px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Users</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                User: {u}
              </option>
            ))}
          </select>
        </div>

        {/* State filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Filter size={15} style={{ color: "var(--text-muted)" }} />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "7px 10px",
              fontSize: "12px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All States</option>
            <option value="R">Running (R)</option>
            <option value="S">Sleeping (S)</option>
            <option value="D">Disk Sleep (D)</option>
            <option value="Z">Zombie (Z)</option>
            <option value="T">Stopped (T)</option>
          </select>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Process Table */}
      <article className="panel" style={{ width: "100%", padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "560px", overflowY: "auto" }}>
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
                <th
                  onClick={() => handleSort("pid")}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>PID</span>
                    {sortField === "pid" && <ArrowUpDown size={12} style={{ color: "var(--accent)" }} />}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Process Name</span>
                    {sortField === "name" && <ArrowUpDown size={12} style={{ color: "var(--accent)" }} />}
                  </div>
                </th>
                <th style={{ padding: "10px 14px" }}>User</th>
                <th
                  onClick={() => handleSort("cpu")}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>CPU %</span>
                    {sortField === "cpu" && <ArrowUpDown size={12} style={{ color: "var(--accent)" }} />}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("memory")}
                  style={{ padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Memory (RSS)</span>
                    {sortField === "memory" && <ArrowUpDown size={12} style={{ color: "var(--accent)" }} />}
                  </div>
                </th>
                <th style={{ padding: "10px 14px" }}>State</th>
                <th style={{ padding: "10px 14px" }}>Threads</th>
                <th style={{ padding: "10px 14px" }}>Elapsed</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.length > 0 ? (
                filteredProcesses.map((p, idx) => (
                  <tr
                    key={p.pid}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: idx % 2 === 0 ? "transparent" : "var(--surface-raised)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {p.pid}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{p.name}</strong>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            maxWidth: "320px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={p.cmdline}
                        >
                          {p.cmdline}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                      {p.user}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.cpuPercent > 10 ? "var(--accent)" : "var(--text-primary)",
                        }}
                      >
                        {p.cpuPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontWeight: 600, color: "var(--security-blue)" }}>
                        {p.memoryRssMb.toFixed(1)} MB
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "4px" }}>
                        ({p.memoryPercent.toFixed(1)}%)
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 600,
                          background: p.state.startsWith("R")
                            ? "var(--accent-soft)"
                            : "var(--surface)",
                          color: p.state.startsWith("R")
                            ? "var(--accent)"
                            : "var(--text-muted)",
                        }}
                      >
                        {p.state}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                      {p.threads}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {p.elapsed}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {/* Terminate SIGTERM button */}
                        <button
                          onClick={() => {
                            setTargetProcess(p);
                            setSignalType("SIGTERM");
                          }}
                          title="Send SIGTERM (Graceful Terminate)"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          End
                        </button>

                        {/* Force Kill SIGKILL button */}
                        <button
                          onClick={() => {
                            setTargetProcess(p);
                            setSignalType("SIGKILL");
                          }}
                          title="Send SIGKILL (Force Kill)"
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.5)",
                            background: "#ef4444",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Kill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                    No matching processes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Process Termination Confirmation Dialog */}
      <ConfirmDialog
        isOpen={targetProcess !== null}
        title={
          signalType === "SIGKILL"
            ? `Force Kill Process (PID ${targetProcess?.pid})`
            : `Terminate Process (PID ${targetProcess?.pid})`
        }
        message={
          signalType === "SIGKILL"
            ? `Are you sure you want to forcibly send SIGKILL (-9) to process "${targetProcess?.name}" (PID ${targetProcess?.pid}, User: ${targetProcess?.user})? Any unsaved data in this process will be lost immediately.`
            : `Are you sure you want to send SIGTERM (-15) to process "${targetProcess?.name}" (PID ${targetProcess?.pid}, User: ${targetProcess?.user}) requesting it to exit cleanly?`
        }
        confirmLabel={signalType === "SIGKILL" ? "Force Kill" : "Terminate"}
        isDestructive={true}
        onConfirm={handleKill}
        onCancel={() => setTargetProcess(null)}
      />
    </div>
  );
};
