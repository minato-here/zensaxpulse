import { useState } from "react";
import "./App.css";
import "./Layout.css";
import "./Accent.css";

import type { PageId } from "./types/telemetry";
import { useTheme } from "./hooks/useTheme";
import { usePolling } from "./hooks/useTelemetry";
import {
  fetchSystemOverview,
  fetchCpuMetrics,
  fetchGpuMetrics,
  fetchMemoryMetrics,
  fetchStorageMetrics,
  fetchNetworkMetrics,
  fetchSensorMetrics,
  fetchProcessList,
  fetchSystemInfo,
  fetchSystemServices,
} from "./services/telemetry";

import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Footer } from "./components/layout/Footer";

import { DashboardPage } from "./pages/DashboardPage";
import { CpuPage } from "./pages/CpuPage";
import { GpuPage } from "./pages/GpuPage";
import { MemoryPage } from "./pages/MemoryPage";
import { StoragePage } from "./pages/StoragePage";
import { NetworkPage } from "./pages/NetworkPage";
import { ProcessesPage } from "./pages/ProcessesPage";
import { SensorsPage } from "./pages/SensorsPage";
import { SystemPage } from "./pages/SystemPage";

export function App() {
  const { darkMode, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<PageId>("Overview");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("zensaxpulse-sidebar");
    return saved !== null ? saved === "true" : true;
  });

  const handleToggleSidebar = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem("zensaxpulse-sidebar", String(open));
  };

  // 1. Overview Telemetry (running for dashboard and global badges)
  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
  } = usePolling(fetchSystemOverview, 1200, true);

  // 2. Section-specific Telemetry (only polling when on that section for optimal efficiency)
  const {
    data: cpuData,
    loading: cpuLoading,
    error: cpuError,
  } = usePolling(fetchCpuMetrics, 1000, activePage === "CPU");

  const {
    data: gpuData,
    loading: gpuLoading,
    error: gpuError,
  } = usePolling(fetchGpuMetrics, 1500, activePage === "GPU");

  const {
    data: memoryData,
    loading: memoryLoading,
    error: memoryError,
  } = usePolling(fetchMemoryMetrics, 1200, activePage === "Memory");

  const {
    data: storageData,
    loading: storageLoading,
    error: storageError,
  } = usePolling(fetchStorageMetrics, 2500, activePage === "Storage");

  const {
    data: networkData,
    loading: networkLoading,
    error: networkError,
  } = usePolling(fetchNetworkMetrics, 1000, activePage === "Network");

  const {
    data: processesData,
    loading: processesLoading,
    error: processesError,
    refresh: refreshProcesses,
  } = usePolling(fetchProcessList, 2000, activePage === "Processes");

  const {
    data: sensorsData,
    loading: sensorsLoading,
    error: sensorsError,
  } = usePolling(fetchSensorMetrics, 2000, activePage === "Sensors");

  const {
    data: systemInfo,
    loading: systemInfoLoading,
    error: systemInfoError,
  } = usePolling(fetchSystemInfo, 5000, activePage === "System");

  const {
    data: servicesReport,
    refresh: refreshServices,
  } = usePolling(fetchSystemServices, 6000, activePage === "System");

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      {/* Fixed Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        setIsOpen={handleToggleSidebar}
      />

      {/* Main Body */}
      <main className="main-content">
        {/* Fixed Topbar */}
        <Topbar
          activePage={activePage}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />

        {/* Independently Scrollable Main Section */}
        {activePage === "Overview" && (
          <DashboardPage
            overview={overview}
            loading={overviewLoading}
            error={overviewError}
            onNavigate={setActivePage}
          />
        )}

        {activePage === "CPU" && (
          <CpuPage
            cpu={cpuData}
            loading={cpuLoading}
            error={cpuError}
          />
        )}

        {activePage === "GPU" && (
          <GpuPage
            gpu={gpuData}
            loading={gpuLoading}
            error={gpuError}
          />
        )}

        {activePage === "Memory" && (
          <MemoryPage
            memory={memoryData}
            loading={memoryLoading}
            error={memoryError}
          />
        )}

        {activePage === "Storage" && (
          <StoragePage
            storage={storageData}
            loading={storageLoading}
            error={storageError}
          />
        )}

        {activePage === "Network" && (
          <NetworkPage
            network={networkData}
            loading={networkLoading}
            error={networkError}
          />
        )}

        {activePage === "Processes" && (
          <ProcessesPage
            processes={processesData}
            loading={processesLoading}
            error={processesError}
            onRefresh={refreshProcesses}
          />
        )}

        {activePage === "Sensors" && (
          <SensorsPage
            sensors={sensorsData}
            loading={sensorsLoading}
            error={sensorsError}
          />
        )}

        {activePage === "System" && (
          <SystemPage
            systemInfo={systemInfo}
            servicesReport={servicesReport}
            loading={systemInfoLoading}
            error={systemInfoError}
            onRefreshServices={refreshServices}
          />
        )}

        {/* Fixed Footer */}
        <Footer />
      </main>
    </div>
  );
}

export default App;
