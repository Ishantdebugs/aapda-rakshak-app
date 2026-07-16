import React, { useEffect, useState } from "react";

/**
 * Animated SVG Donut Pie Chart
 * data: [{ label: string, value: number, color: string }]
 * Firebase-ready: swap `data` prop with Firestore-derived array.
 */
export default function PieChart({
  data = [],
  size = 200,
  thickness = 36,
  title = "",
  subtitle = "",
  centerLabel = ""
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let cumulative = 0;

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track ring */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="#1e293b"
              strokeWidth={thickness}
            />

            {total === 0 ? (
              <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="#334155"
                strokeWidth={thickness}
                strokeDasharray={`${circumference} 0`}
              />
            ) : (
              data.map((seg, i) => {
                const len = animated ? (seg.value / total) * circumference : 0;
                const prev = cumulative;
                cumulative += (seg.value / total) * circumference;

                return (
                  <circle
                    key={i}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${len} ${circumference - len}`}
                    strokeDashoffset={-prev}
                    style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.12}s` }}
                    strokeLinecap="butt"
                  />
                );
              })
            )}
          </svg>

          {/* Center label */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ transform: "none" }}
          >
            {centerLabel && (
              <>
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{total}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-bold">{centerLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          {data.map((seg, i) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={i} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center gap-1">
                    <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold truncate">{seg.label}</span>
                    <span className="text-[10px] font-black font-mono shrink-0" style={{ color: seg.color }}>
                      {pct}%
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-0.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: animated ? `${pct}%` : "0%",
                        backgroundColor: seg.color,
                        transitionDelay: `${i * 0.1}s`
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 shrink-0">{seg.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
