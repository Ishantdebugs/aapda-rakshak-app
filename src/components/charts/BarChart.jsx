import React, { useEffect, useState } from "react";

/**
 * Animated SVG Bar Chart
 * data: [{ label: string, value: number, color?: string }]
 * Firebase-ready: swap `data` prop with Firestore aggregation results.
 */
export default function BarChart({
  data = [],
  title = "",
  subtitle = "",
  barColor = "#3b82f6",
  height = 160,
  showValues = true
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartWidth = 100; // percentage-based, distributed evenly

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <div>
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="relative">
        {/* Y-axis guide lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
          {[maxValue, Math.round(maxValue * 0.5), 0].map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-600 w-5 text-right shrink-0">{v}</span>
              <div className="flex-1 border-t border-slate-800/60 border-dashed" />
            </div>
          ))}
        </div>

        {/* Bars container */}
        <div
          className="relative flex items-end gap-2 pl-8"
          style={{ height: height + 24 }}
        >
          {data.map((d, i) => {
            const heightPct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
            const barH = animated ? `${(heightPct / 100) * height}px` : "0px";
            const color = d.color || barColor;

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end gap-1"
                style={{ height: height + 24 }}
              >
                {/* Value label on top */}
                {showValues && (
                  <span
                    className="text-[9px] font-black font-mono transition-opacity duration-500"
                    style={{ color, opacity: animated ? 1 : 0 }}
                  >
                    {d.value}
                  </span>
                )}

                {/* Bar */}
                <div
                  className="w-full rounded-t-md relative overflow-hidden"
                  style={{
                    height: barH,
                    backgroundColor: color,
                    transition: `height 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.07}s`,
                    minWidth: 8,
                    maxWidth: 48
                  }}
                >
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/10 rounded-t-md" />
                </div>

                {/* X-axis label */}
                <span
                  className="text-[9px] text-slate-500 font-semibold text-center leading-tight mt-1 truncate w-full text-center px-0.5"
                  style={{ maxWidth: 56 }}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
