import React, { useState } from "react";
import type { HistoryPoint } from "../../types/telemetry";

interface AreaChartProps {
  data: HistoryPoint[];
  color?: string;
  gradientId?: string;
  unit?: string;
  height?: number;
  minY?: number;
  maxY?: number;
  label?: string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  color = "var(--accent, #22c55e)",
  gradientId = "area-gradient-default",
  unit = "%",
  height = 140,
  minY = 0,
  maxY,
  label = "Utilization",
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return (
      <div
        className="chart-empty"
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
        }}
      >
        Collecting telemetry samples...
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const dataMax = Math.max(...values, 1);
  const calculatedMaxY = maxY !== undefined ? maxY : Math.max(Math.ceil(dataMax * 1.1), 10);
  const calculatedMinY = minY !== undefined ? minY : 0;
  const rangeY = calculatedMaxY - calculatedMinY || 1;

  const width = 500;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 15;
  const padBottom = 20;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const points = data.map((d, index) => {
    const x = padLeft + (index / (data.length - 1)) * innerWidth;
    const normalizedY = (d.value - calculatedMinY) / rangeY;
    const y = padTop + innerHeight - normalizedY * innerHeight;
    return { x, y, value: d.value, timestamp: d.timestamp };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + innerHeight} L ${points[0].x} ${padTop + innerHeight} Z`;

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="area-chart-container" style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        style={{ width: "100%", height: `${height}px`, overflow: "visible" }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + innerHeight * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={padLeft}
              y1={y}
              x2={padLeft + innerWidth}
              y2={y}
              stroke="var(--chart-grid, rgba(255,255,255,0.06))"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled gradient area */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Main curve line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive hover columns */}
        {points.map((p, idx) => (
          <rect
            key={idx}
            x={p.x - innerWidth / data.length / 2}
            y={padTop}
            width={innerWidth / data.length}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(idx)}
            style={{ cursor: "crosshair" }}
          />
        ))}

        {/* Hover indicator */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={padTop}
              x2={hoveredPoint.x}
              y2={padTop + innerHeight}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill={color}
              stroke="var(--surface, #1d202b)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            top: "5px",
            left: `${(hoveredPoint.x / width) * 100}%`,
            transform: "translateX(-50%)",
            background: "var(--surface-raised, #222632)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-primary)",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <span>{label}: </span>
          <span style={{ color }}>
            {hoveredPoint.value.toFixed(1)} {unit}
          </span>
        </div>
      )}
    </div>
  );
};

