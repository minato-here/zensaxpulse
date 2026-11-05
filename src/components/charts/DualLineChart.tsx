import React, { useState } from "react";
import type { NetworkHistoryPoint } from "../../types/telemetry";

interface DualLineChartProps {
  data: NetworkHistoryPoint[];
  height?: number;
  rxColor?: string;
  txColor?: string;
}

function formatBytes(bytesPerSec: number): string {
  if (bytesPerSec < 1024) {
    return `${bytesPerSec.toFixed(0)} B/s`;
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

export const DualLineChart: React.FC<DualLineChartProps> = ({
  data,
  height = 160,
  rxColor = "var(--accent, #22c55e)",
  txColor = "var(--security-blue, #38bdf8)",
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
        Waiting for network traffic history...
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.rxBytesSec, d.txBytesSec)),
    1024
  );
  const rangeY = maxVal * 1.15;

  const width = 500;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 15;
  const padBottom = 20;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const pointsRx = data.map((d, index) => {
    const x = padLeft + (index / (data.length - 1)) * innerWidth;
    const y = padTop + innerHeight - (d.rxBytesSec / rangeY) * innerHeight;
    return { x, y, value: d.rxBytesSec };
  });

  const pointsTx = data.map((d, index) => {
    const x = padLeft + (index / (data.length - 1)) * innerWidth;
    const y = padTop + innerHeight - (d.txBytesSec / rangeY) * innerHeight;
    return { x, y, value: d.txBytesSec };
  });

  const pathRxD = pointsRx.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaRxD = `${pathRxD} L ${pointsRx[pointsRx.length - 1].x} ${padTop + innerHeight} L ${pointsRx[0].x} ${padTop + innerHeight} Z`;

  const pathTxD = pointsTx.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const hoveredRx = hoverIndex !== null ? pointsRx[hoverIndex] : null;
  const hoveredTx = hoverIndex !== null ? pointsTx[hoverIndex] : null;

  return (
    <div className="dual-line-chart-container" style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        style={{ width: "100%", height: `${height}px`, overflow: "visible" }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="rx-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={rxColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={rxColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio) => {
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

        {/* RX Gradient Area */}
        <path d={areaRxD} fill="url(#rx-area-gradient)" />

        {/* RX Line */}
        <path
          d={pathRxD}
          fill="none"
          stroke={rxColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* TX Line */}
        <path
          d={pathTxD}
          fill="none"
          stroke={txColor}
          strokeWidth="2.2"
          strokeDasharray="4 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover interaction blocks */}
        {pointsRx.map((p, idx) => (
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

        {/* Hover cursor and dots */}
        {hoveredRx && hoveredTx && (
          <g>
            <line
              x1={hoveredRx.x}
              y1={padTop}
              x2={hoveredRx.x}
              y2={padTop + innerHeight}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={hoveredRx.x}
              cy={hoveredRx.y}
              r="4.5"
              fill={rxColor}
              stroke="var(--surface, #1d202b)"
              strokeWidth="2"
            />
            <circle
              cx={hoveredTx.x}
              cy={hoveredTx.y}
              r="4.5"
              fill={txColor}
              stroke="var(--surface, #1d202b)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoveredRx && hoveredTx && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            top: "5px",
            left: `${(hoveredRx.x / width) * 100}%`,
            transform: "translateX(-50%)",
            background: "var(--surface-raised, #222632)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            color: "var(--text-primary)",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
            zIndex: 10,
            display: "flex",
            gap: "12px",
          }}
        >
          <span style={{ color: rxColor, fontWeight: 600 }}>
            ↓ {formatBytes(hoveredRx.value)}
          </span>
          <span style={{ color: txColor, fontWeight: 600 }}>
            ↑ {formatBytes(hoveredTx.value)}
          </span>
        </div>
      )}
    </div>
  );
};

