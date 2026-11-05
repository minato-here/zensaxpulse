import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  detail: string;
  icon: React.ReactNode;
  percentage?: number;
  color?: string;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit = "",
  detail,
  icon,
  percentage,
  color = "var(--accent, #22c55e)",
  badge,
}) => {
  const showProgress = percentage !== undefined;
  const clampedPct = showProgress ? Math.min(Math.max(percentage, 0), 100) : 0;

  return (
    <article className="metric-card">
      <div className="metric-top">
        <div className="metric-icon" style={{ color }}>
          {icon}
        </div>
        <span className="metric-label">{label}</span>
        {badge ? (
          <span className="badge-chip" style={{ marginLeft: "auto", fontSize: "10px" }}>
            {badge}
          </span>
        ) : (
          <span className="metric-menu">···</span>
        )}
      </div>

      <div className="metric-value">
        <span>{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      <div className="metric-detail">{detail}</div>

      {showProgress && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${clampedPct}%`,
              background: color,
            }}
          />
        </div>
      )}

      {showProgress && (
        <div className="metric-footer">
          <span>Utilization</span>
          <span style={{ fontWeight: 600, color }}>
            {value === "--" ? "N/A" : `${clampedPct.toFixed(0)}%`}
          </span>
        </div>
      )}
    </article>
  );
};

