import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="dashboard-footer">
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <img
          src="/icon.png"
          alt=""
          style={{ width: 14, height: 14, borderRadius: "3px", objectFit: "cover" }}
        />
        ZensaxPulse
      </span>

      <span>Developed by Minato  <br></br>Copyright (c) 2026 minato-here</span>
    </footer>
  );
};

