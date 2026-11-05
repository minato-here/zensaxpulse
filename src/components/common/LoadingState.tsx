import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  height?: number | string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading local telemetry...",
  height = "240px",
}) => {
  return (
    <div
      className="loading-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        height,
        color: "var(--text-muted)",
        fontSize: "13px",
      }}
    >
      <div style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src="/icon.png"
          alt="ZensaxPulse"
          style={{
            width: 36,
            height: 36,
            borderRadius: "9px",
            objectFit: "cover",
            boxShadow: "0 0 12px rgba(34, 197, 94, 0.2)",
          }}
        />
        <Loader2
          size={44}
          className="spin"
          style={{
            position: "absolute",
            inset: 0,
            color: "var(--accent)",
            animation: "spin 1.4s linear infinite",
            opacity: 0.8,
          }}
        />
      </div>
      <span>{message}</span>
    </div>
  );
};

