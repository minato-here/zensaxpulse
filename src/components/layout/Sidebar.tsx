import React from "react";
import {
  LayoutDashboard,
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Network,
  BatteryCharging,
  ListTree,
  Thermometer,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { PageId } from "../../types/telemetry";

interface SidebarProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navigationItems: { id: PageId; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { id: "Overview", label: "Overview", icon: LayoutDashboard },
  { id: "CPU", label: "CPU", icon: Cpu },
  { id: "GPU", label: "GPU", icon: CircuitBoard },
  { id: "Memory", label: "Memory", icon: MemoryStick },
  { id: "Storage", label: "Storage", icon: HardDrive },
  { id: "Network", label: "Network", icon: Network },
  { id: "Battery", label: "Battery", icon: BatteryCharging },
  { id: "Processes", label: "Processes", icon: ListTree },
  { id: "Sensors", label: "Sensors", icon: Thermometer },
  { id: "System", label: "System", icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  setIsOpen,
}) => {
  return (
    <aside className={`sidebar ${isOpen ? "" : "collapsed"}`}>
      <div className="brand">
        <div className="brand-logo" title="ZensaxPulse">
          <img
            src="/icon.png"
            alt="ZensaxPulse"
            className="brand-logo-img"
          />
        </div>

        {isOpen && (
          <div className="brand-name">
            <span>Zensax</span>
            <span className="brand-pulse">Pulse</span>
          </div>
        )}

        <button
          className="sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          type="button"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isOpen && <p className="sidebar-heading">MONITORING</p>}

      <nav className="navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
              title={!isOpen ? item.label : undefined}
              type="button"
            >
              <span className="nav-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>

              {isOpen && <span>{item.label}</span>}

              {isOpen && isActive && <span className="nav-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="offline-status">
          <ShieldCheck size={16} className="security-icon" />

          {isOpen && (
            <div>
              <span className="status-title">Local monitoring</span>
              <span className="status-subtitle">Offline · Private</span>
            </div>
          )}
        </div>

        {isOpen && <div className="sidebar-version">ZensaxPulse v0.1.0</div>}
      </div>
    </aside>
  );
};

