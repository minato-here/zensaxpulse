import React from "react";

interface BarGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  sublabel?: string;
  color?: string;
}

export const BarGauge: React.FC<BarGaugeProps> = ({
  label,
  value,
  max = 100,
  unit = "%",
  sublabel,
  color = "var(--accent, #22c55e)",
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="bar-gauge" style={{ marginBottom: "12px" }}>
      <div
        className="bar-gauge-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: "12px",
          marginBottom: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
          {sublabel && (
            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              ({sublabel})
            </span>
          )}
        </div>
        <span style={{ fontWeight: 700, color, fontFamily: "monospace" }}>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>

      <div
        className="bar-gauge-track"
        style={{
          width: "100%",
          height: "7px",
          background: "var(--surface-raised, #222632)",
          borderRadius: "4px",
          overflow: "hidden",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="bar-gauge-fill"
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
};

