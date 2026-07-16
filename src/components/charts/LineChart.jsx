import React, { useEffect, useState, useRef } from "react";

/**
 * Animated SVG Line Chart
 * data: [{ label: string, value: number }]
 * Firebase-ready: swap `data` prop with Firestore time-series data.
 */
export default function LineChart({
  data = [],
  title = "",
  subtitle = "",
  lineColor = "#6366f1",
  areaColor = "rgba(99,102,241,0.15)",
  height = 140,
  width: propWidth
}) {
  const [animated, setAnimated] = useState(false);
  const containerRef = useRef(null);
  const [svgWidth, setSvgWidth] = useState(propWidth || 400);

  useEffect(() => {
    if (containerRef.current) setSvgWidth(containerRef.current.offsetWidth || 400);
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) return null;

  const padL = 32, padR = 12, padT = 16, padB = 28;
  const innerW = svgWidth - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;

  const getX = (i) => padL + (i / (data.length - 1)) * innerW;
  const getY = (v) => padT + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH;

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x},${padT + innerH}`,
    ...points.map(p => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${padT + innerH}`,
    "Z"
  ].join(" ");

  const totalLen = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
  }, 0);

  const yGuides = [maxVal, Math.round(maxVal / 2), 0];

  return (
    <div className="flex flex-col gap-3" ref={containerRef}>
      {title && (
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
        {/* Grid lines */}
        {yGuides.map((v, i) => {
          const y = getY(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={svgWidth - padR} y2={y}
                stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <text x={padL - 4} y={y + 3} textAnchor="end"
                fontSize="8" fill="#475569" fontFamily="monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={areaColor} />

        {/* Animated line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLen}
          strokeDashoffset={animated ? 0 : totalLen}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={lineColor}
              opacity={animated ? 1 : 0}
              style={{ transition: `opacity 0.3s ease ${0.8 + i * 0.05}s` }} />
            <circle cx={p.x} cy={p.y} r={7} fill={lineColor} opacity="0.15" />
            {/* Value tooltip */}
            <text x={p.x} y={p.y - 8} textAnchor="middle"
              fontSize="9" fill={lineColor} fontWeight="bold" fontFamily="monospace"
              opacity={animated ? 1 : 0}
              style={{ transition: `opacity 0.3s ease ${0.9 + i * 0.05}s` }}>
              {data[i].value}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={height - 4} textAnchor="middle"
            fontSize="9" fill="#64748b" fontFamily="sans-serif">
            {d.label}
          </text>
        ))}

        {/* X axis line */}
        <line x1={padL} y1={padT + innerH} x2={svgWidth - padR} y2={padT + innerH}
          stroke="#334155" strokeWidth="1" />
      </svg>
    </div>
  );
}
