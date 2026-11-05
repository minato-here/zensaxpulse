import React from "react";
import { Sun, Moon, Shield } from "lucide-react";
import type { PageId } from "../../types/telemetry";

interface TopbarProps {
  activePage: PageId;
  darkMode: boolean;
  toggleTheme: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activePage,
  darkMode,
  toggleTheme,
}) => {
  return (
    <header className="topbar">
      <div className="page-heading">
        <img
          src="/icon.png"
          alt="ZensaxPulse"
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "6px",
            objectFit: "cover",
            display: "block",
            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
          }}
        />
        <span className="breadcrumb">ZensaxPulse</span>
        <span className="breadcrumb-separator">/</span>
        <h1>{activePage}</h1>
      </div>

      <div className="topbar-actions">
        <div className="privacy-badge" title="Zero cloud telemetry - offline local Linux monitoring">
          <span className="status-dot" />
          <Shield size={13} style={{ marginRight: "4px", color: "var(--accent)" }} />
          <span>Local only</span>
        </div>

        <button
          className="theme-button"
          onClick={toggleTheme}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          type="button"
        >
          {darkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="system-avatar" title="Minato">M</div>
      </div>
    </header>
  );
};

