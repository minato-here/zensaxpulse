import React from "react";
import { Info } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Info size={28} />,
}) => {
  return (
    <div
      className="empty-state"
      style={{
        padding: "36px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <div style={{ color: "var(--security-blue)", opacity: 0.85 }}>{icon}</div>
      <h4 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)" }}>{title}</h4>
      <p style={{ margin: 0, fontSize: "12px", maxWidth: "400px", lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
};

