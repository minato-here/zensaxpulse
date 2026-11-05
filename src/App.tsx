import { useState } from "react";
import "./App.css";

type Metric = {
  label: string;
  value: string;
  unit: string;
  detail: string;
  icon: string;
  percentage: number;
};

const metrics: Metric[] = [
  {
    label: "CPU Usage",
    value: "24",
    unit: "%",
    detail: "Ryzen 5 7535HS",
    icon: "⌘",
    percentage: 24,
  },
  {
    label: "GPU Usage",
    value: "12",
    unit: "%",
    detail: "NVIDIA RTX 3050",
    icon: "▧",
    percentage: 12,
  },
  {
    label: "Memory",
    value: "6.2",
    unit: "GB",
    detail: "14 GB total",
    icon: "▤",
    percentage: 44,
  },
  {
    label: "Storage",
    value: "22",
    unit: "%",
    detail: "NVMe SSD",
    icon: "▣",
    percentage: 22,
  },
];

const navigation = [
  { label: "Overview", icon: "◈" },
  { label: "CPU", icon: "⌘" },
  { label: "GPU", icon: "▧" },
  { label: "Memory", icon: "▤" },
  { label: "Storage", icon: "▣" },
  { label: "Network", icon: "⌁" },
  { label: "Processes", icon: "☷" },
  { label: "Sensors", icon: "♨" },
  { label: "System", icon: "⚙" },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        {sidebarOpen && <p className="sidebar-heading">MONITORING</p>}

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => setActivePage(item.label)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && activePage === item.label && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="offline-status">
            <span className="status-dot" />
            {sidebarOpen && (
              <div>
                <span className="status-title">Local monitoring</span>
                <span className="status-subtitle">Offline · Private</span>
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
              {darkMode ? "☀" : "☾"}
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
              <p>Live hardware utilization</p>
            </div>
            <span className="section-tag">PREVIEW</span>
          </section>

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
                    style={{ width: `${metric.percentage}%` }}
                  />
                </div>

                <div className="metric-footer">
                  <span>Utilization</span>
                  <span>{metric.percentage}%</span>
                </div>
              </article>
            ))}
          </section>

          <section className="lower-grid">
            <article className="panel performance-panel">
              <div className="panel-header">
                <div>
                  <h3>Performance</h3>
                  <p>Resource activity</p>
                </div>
                <button className="panel-action">Last 5 min ⌄</button>
              </div>

              <div className="chart-placeholder">
                <div className="chart-y-axis">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                <div className="chart-area">
                  <div className="chart-grid-lines">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  <svg
                    className="chart-svg"
                    viewBox="0 0 600 200"
                    preserveAspectRatio="none"
                    aria-label="CPU and GPU performance preview"
                  >
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity=".3" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="gpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity=".25" />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <path
                      d="M0 150 L40 138 L80 145 L120 110 L160 125 L200 95 L240 118 L280 90 L320 105 L360 65 L400 85 L440 70 L480 100 L520 80 L560 95 L600 75 L600 200 L0 200 Z"
                      fill="url(#cpuGradient)"
                    />
                    <path
                      d="M0 150 L40 138 L80 145 L120 110 L160 125 L200 95 L240 118 L280 90 L320 105 L360 65 L400 85 L440 70 L480 100 L520 80 L560 95 L600 75"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    <path
                      d="M0 175 L40 168 L80 172 L120 155 L160 162 L200 145 L240 160 L280 135 L320 148 L360 125 L400 145 L440 130 L480 150 L520 140 L560 155 L600 135 L600 200 L0 200 Z"
                      fill="url(#gpuGradient)"
                    />
                    <path
                      d="M0 175 L40 168 L80 172 L120 155 L160 162 L200 145 L240 160 L280 135 L320 148 L360 125 L400 145 L440 130 L480 150 L520 140 L560 155 L600 135"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2.5"
                    />
                  </svg>

                  <div className="chart-x-axis">
                    <span>−5m</span>
                    <span>−4m</span>
                    <span>−3m</span>
                    <span>−2m</span>
                    <span>−1m</span>
                    <span>Now</span>
                  </div>
                </div>
              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-dot cpu-dot" /> CPU
                </span>
                <span>
                  <i className="legend-dot gpu-dot" /> GPU
                </span>
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

          <footer className="dashboard-footer">
            <span>
              <span className="footer-dot" /> ZensaxPulse
            </span>
            <span>Designed for Linux · Privacy first</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
