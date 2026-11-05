import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import "./Layout.css";
import "./Accent.css";
import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Network,
  ListTree,
  Thermometer,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";
type SystemMetrics = {
  cpuUsagePercent: number;
  memoryTotalGb: number;
  memoryUsedGb: number;
  memoryAvailableGb: number;
  memoryUsagePercent: number;
  swapTotalGb: number;
  swapUsedGb: number;
  swapUsagePercent: number;
  uptimeSeconds: number;
  loadAverage1m: number;
  loadAverage5m: number;
  loadAverage15m: number;

  gpuUsagePercent: number | null;
  gpuMemoryUsedGb: number | null;
  gpuMemoryTotalGb: number | null;
  gpuTemperatureC: number | null;

  storageTotalGb: number | null;
  storageUsedGb: number | null;
  storageUsagePercent: number | null;
};

type Metric = {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon: string;
  percentage: number;
};

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "CPU", icon: Cpu },
  { label: "GPU", icon: CircuitBoard },
  { label: "Memory", icon: MemoryStick },
  { label: "Storage", icon: HardDrive },
  { label: "Network", icon: Network },
  { label: "Processes", icon: ListTree },
  { label: "Sensors", icon: Thermometer },
  { label: "System", icon: Settings },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [systemMetrics, setSystemMetrics] =
    useState<SystemMetrics | null>(null);

  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        const metrics = await invoke<SystemMetrics>("get_system_metrics");

        if (mounted) {
          setSystemMetrics(metrics);
          setTelemetryError(null);
        }
      } catch (error) {
        if (mounted) {
          setTelemetryError(String(error));
        }
      }
    };

    void fetchMetrics();

    const interval = window.setInterval(() => {
      void fetchMetrics();
    }, 2000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const metrics: Metric[] = [
    {
      label: "CPU Usage",
      value: systemMetrics
        ? systemMetrics.cpuUsagePercent.toFixed(0)
        : "--",
      unit: "%",
      detail: "Ryzen 5 7535HS",
      icon: "⌘",
      percentage: systemMetrics
        ? systemMetrics.cpuUsagePercent
        : 0,
    },
    {
      label: "GPU Usage",
      value:
        systemMetrics?.gpuUsagePercent != null
          ? systemMetrics.gpuUsagePercent.toFixed(0)
          : "--",
      unit: "%",
      detail:
        systemMetrics?.gpuMemoryUsedGb != null &&
        systemMetrics.gpuMemoryTotalGb != null
          ? `${systemMetrics.gpuMemoryUsedGb.toFixed(1)} / ${systemMetrics.gpuMemoryTotalGb.toFixed(1)} GB VRAM${
              systemMetrics.gpuTemperatureC != null
                ? ` · ${systemMetrics.gpuTemperatureC.toFixed(0)}°C`
                : ""
            }`
          : "NVIDIA telemetry unavailable",
      icon: "▧",
      percentage: systemMetrics?.gpuUsagePercent ?? 0,
    },
    {
      label: "Memory",
      value: systemMetrics
        ? systemMetrics.memoryUsedGb.toFixed(1)
        : "--",
      unit: "GB",
      detail: systemMetrics
        ? `${systemMetrics.memoryTotalGb.toFixed(1)} GB total`
        : "Waiting for telemetry",
      icon: "▤",
      percentage: systemMetrics
        ? systemMetrics.memoryUsagePercent
        : 0,
    },
    {
      label: "Storage",
      value:
        systemMetrics?.storageUsagePercent != null
          ? systemMetrics.storageUsagePercent.toFixed(0)
          : "--",
      unit: "%",
      detail:
        systemMetrics?.storageUsedGb != null &&
        systemMetrics.storageTotalGb != null
          ? `${systemMetrics.storageUsedGb.toFixed(1)} / ${systemMetrics.storageTotalGb.toFixed(1)} GB used on /`
          : "Storage telemetry unavailable",
      icon: "▣",
      percentage: systemMetrics?.storageUsagePercent ?? 0,
    },
  ];

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="brand">
          <div className="brand-logo">Z</div>

          {sidebarOpen && (
            <div className="brand-name">
              <span>Zensax</span>
              <span className="brand-pulse">Pulse</span>
            </div>
          )}

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        {sidebarOpen && <p className="sidebar-heading">MONITORING</p>}

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? "active" : ""
                }`}
              onClick={() => setActivePage(item.label)}
              title={item.label}
            >
              <span className="nav-icon">
                <item.icon size={18} strokeWidth={1.8} />
              </span>

              {sidebarOpen && <span>{item.label}</span>}

              {sidebarOpen && activePage === item.label && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-status">
            <ShieldCheck size={16} className="security-icon" />

            {sidebarOpen && (
              <div>
                <span className="status-title">Local monitoring</span>
                <span className="status-subtitle">
                  Offline · Private
                </span>
              </div>
            )}
          </div>

          {sidebarOpen && (
            <div className="sidebar-version">ZensaxPulse v0.1.0</div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="page-heading">
            <span className="breadcrumb">ZensaxPulse</span>
            <span className="breadcrumb-separator">/</span>
            <h1>{activePage}</h1>
          </div>

          <div className="topbar-actions">
            <div className="privacy-badge">
              <span className="status-dot" />
              <span>Local only</span>
            </div>

            <button
              className="theme-button"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="system-avatar">M</div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-section">
            <div>
              <p className="eyebrow">SYSTEM INTELLIGENCE</p>

              <h2>
                Your system,
                <span className="accent-text"> in focus.</span>
              </h2>

              <p className="welcome-description">
                Monitor your hardware and understand your Linux system.
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

          <section className="section-header">
            <div>
              <h3>Resource overview</h3>
              <p>
                {systemMetrics
                  ? "Live hardware utilization"
                  : "Waiting for system telemetry"}
              </p>
            </div>

            <span className="section-tag">
              {systemMetrics ? "LIVE" : "CONNECTING"}
            </span>
          </section>

          {telemetryError && (
            <div className="telemetry-error">
              Telemetry error: {telemetryError}
            </div>
          )}

          <section className="metrics-grid">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-top">
                  <div className="metric-icon">{metric.icon}</div>
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-menu">···</span>
                </div>

                <div className="metric-value">
                  <span>{metric.value}</span>
                  <span className="metric-unit">{metric.unit}</span>
                </div>

                <div className="metric-detail">{metric.detail}</div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        Math.max(metric.percentage, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <div className="metric-footer">
                  <span>Utilization</span>
                  <span>
                    {metric.value === "--"
                      ? "N/A"
                      : `${metric.percentage.toFixed(0)}%`}
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="lower-grid">
            <article className="panel performance-panel">
              <div className="panel-header">
                <div>
                  <h3>System load</h3>
                  <p>Linux load averages</p>
                </div>

                <span className="section-tag">LIVE</span>
              </div>

              <div className="load-average-grid">
                <div className="load-average-card">
                  <span>1 minute</span>
                  <strong>
                    {systemMetrics
                      ? systemMetrics.loadAverage1m.toFixed(2)
                      : "--"}
                  </strong>
                </div>

                <div className="load-average-card">
                  <span>5 minutes</span>
                  <strong>
                    {systemMetrics
                      ? systemMetrics.loadAverage5m.toFixed(2)
                      : "--"}
                  </strong>
                </div>

                <div className="load-average-card">
                  <span>15 minutes</span>
                  <strong>
                    {systemMetrics
                      ? systemMetrics.loadAverage15m.toFixed(2)
                      : "--"}
                  </strong>
                </div>
              </div>

              <div className="load-note">
                Load average represents runnable and uninterruptible tasks.
                It is not a CPU utilization percentage.
              </div>
            </article>

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
                  <strong>Ryzen 5 7535HS</strong>
                </div>

                <div className="system-info-row">
                  <span>Graphics</span>
                  <strong>RTX 3050 Laptop</strong>
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
                    {systemMetrics
                      ? formatUptime(systemMetrics.uptimeSeconds)
                      : "--"}
                  </strong>
                </div>

                <div className="system-info-row">
                  <span>Available memory</span>
                  <strong>
                    {systemMetrics
                      ? `${systemMetrics.memoryAvailableGb.toFixed(1)} GB`
                      : "--"}
                  </strong>
                </div>

                <div className="system-info-row">
                  <span>Swap usage</span>
                  <strong>
                    {systemMetrics
                      ? `${systemMetrics.swapUsedGb.toFixed(1)} / ${systemMetrics.swapTotalGb.toFixed(1)} GB`
                      : "--"}
                  </strong>
                </div>
              </div>

              <button
                className="view-details-button"
                onClick={() => setActivePage("System")}
              >
                View system details
                <span>→</span>
              </button>
            </article>
          </section>


        </div>

          <footer className="dashboard-footer">
            <span>
              <span className="footer-dot" />
              ZensaxPulse
            </span>

            <span>Developed by Minato</span>
          </footer>
      </main>
    </div>
  );
}

export default App;