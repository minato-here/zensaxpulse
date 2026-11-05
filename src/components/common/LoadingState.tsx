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
      <Loader2
        size={24}
        className="spin"
        style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }}
      />
      <span>{message}</span>
    </div>
  );
};

